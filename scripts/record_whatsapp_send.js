const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const http = require('http');
const GIFEncoder = require('gifencoder');
const { PNG } = require('pngjs');

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function getWebSocketDebuggerUrl(){
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/version', (res) => {
      let data='';
      res.on('data', c=> data+=c);
      res.on('end', ()=>{
        try{ const j = JSON.parse(data); resolve(j.webSocketDebuggerUrl); } catch(e){ reject(e); }
      });
    }).on('error', reject);
  });
}

(async ()=>{
  const phone = process.argv[2];
  const message = process.argv[3] || 'Mensagem automática: sua proposta foi aceita. Em breve entraremos em contato para finalizar.';
  const outGif = process.argv[4] || `whatsapp_${phone}_record.gif`;
  const interval = parseInt(process.argv[5]||'150',10); // ms between frames
  if(!phone){ console.error('Usage: node record_whatsapp_send.js <phone> [message] [out.gif] [interval_ms]'); process.exit(1); }

  try{
    const ws = await getWebSocketDebuggerUrl();
    console.log('Connecting to', ws);
    const browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    const url = `https://web.whatsapp.com/send?phone=${phone}`;
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    await page.waitForSelector('div[contenteditable="true"][data-tab]', { timeout: 60000 });

    // find conversation panel to crop
    let panel = await page.$('div[data-testid="conversation-panel"]') || await page.$('#main') || await page.$('.copyable-area');
    let clip = null;
    if(panel){
      const box = await panel.boundingBox();
      clip = { x: Math.max(0, Math.floor(box.x)), y: Math.max(0, Math.floor(box.y)), width: Math.floor(box.width), height: Math.floor(box.height) };
    }

    // Prepare GIF encoder
    const w = clip ? clip.width : 800;
    const h = clip ? clip.height : 600;
    const encoder = new GIFEncoder(w, h);
    const tmpOut = path.resolve(process.cwd(), outGif);
    const writeStream = fs.createWriteStream(tmpOut);
    encoder.createReadStream().pipe(writeStream);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(interval);
    encoder.setQuality(10);

    // helper to capture a frame (PNG buffer) and add to GIF
    async function captureFrame(){
      const buf = await page.screenshot({ type: 'png', clip: clip, omitBackground: false });
      const png = PNG.sync.read(buf);
      encoder.addFrame(png.data);
    }

    // Begin capturing frames in background at interval until stopped
    let capturing = true;
    (async ()=>{
      while(capturing){
        try{ await captureFrame(); } catch(e){ console.warn('frame capture error', e); }
        await sleep(interval);
      }
    })();

    // Focus input
    const inputSelector = 'div[contenteditable="true"][data-tab]';
    await page.focus(inputSelector);
    // Simulate typing
    for(const ch of message){
      await page.keyboard.type(ch, { delay: 80 });
      // small chance of longer pause
      if(Math.random() < 0.05) await sleep(150);
    }
    await sleep(200);
    await page.keyboard.press('Enter');

    // wait a bit after send to capture the sent message
    await sleep(2000);

    // stop capturing and finalize gif
    capturing = false;
    // ensure one last frame
    await captureFrame();
    encoder.finish();

    // also save a final PNG for proof
    try{
      const finalPng = `./whatsapp_${phone}_after_send.png`;
      if(panel) await panel.screenshot({ path: finalPng, omitBackground:false }); else await page.screenshot({ path: finalPng, fullPage:true });
      console.log('Final screenshot saved to', finalPng);
    }catch(e){ console.warn('Failed to save final PNG', e); }

    console.log('GIF saved to', tmpOut);
    await page.close();
    await browser.disconnect();
    process.exit(0);
  }catch(err){
    console.error('Error recording send:', err);
    process.exit(1);
  }
})();

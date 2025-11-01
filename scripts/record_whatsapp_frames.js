const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const http = require('http');

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

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
  const outDir = process.argv[4] || `record_frames_${phone}_${Date.now()}`;
  const interval = parseInt(process.argv[5]||'120',10);
  if(!phone){ console.error('Usage: node record_whatsapp_frames.js <phone> [message] [outDir] [interval_ms]'); process.exit(1); }

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

    // prepare output dir
    const outPath = path.resolve(process.cwd(), outDir);
    fs.mkdirSync(outPath, { recursive: true });
    console.log('Frames will be saved to', outPath);

    let running = true;
    let frameIdx = 0;

    // background capture loop
    (async ()=>{
      while(running){
        try{
          const buf = await page.screenshot({ type: 'png', clip: clip, omitBackground: false });
          const fname = path.join(outPath, `frame_${String(frameIdx).padStart(5,'0')}.png`);
          fs.writeFileSync(fname, buf);
          frameIdx++;
        } catch(e){ console.warn('capture error', e); }
        await sleep(interval);
      }
    })();

    // focus input
    const inputSelector = 'div[contenteditable="true"][data-tab]';
    await page.focus(inputSelector);

    // type message slowly
    for(const ch of message){
      await page.keyboard.type(ch, { delay: 80 });
    }
    await sleep(200);
    await page.keyboard.press('Enter');

    // keep capturing a bit after send
    await sleep(2500);
    running = false;
    // save a final full-size screenshot for proof
    const finalPng = `./whatsapp_${phone}_after_send.png`;
    if(panel) await panel.screenshot({ path: finalPng, omitBackground:false }); else await page.screenshot({ path: finalPng, fullPage:true });
    console.log('Final screenshot saved to', finalPng);
    console.log('Total frames captured:', frameIdx);
    console.log('Frames folder:', outPath);

    await page.close();
    await browser.disconnect();
    process.exit(0);

  }catch(err){ console.error('Recording error:', err); process.exit(1); }
})();

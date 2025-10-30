const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async ()=>{
  const phone = process.argv[2];
  if(!phone){
    console.error('Usage: node capture_whatsapp_screenshot.js <phone>');
    process.exit(1);
  }
  try{
    const http = require('http');
    const wsRes = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9222/json/version', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e){ reject(e); }
        });
      }).on('error', reject);
    });
    const ws = wsRes.webSocketDebuggerUrl;
    console.log('Connecting to', ws);
    const browser = await puppeteer.connect({browserWSEndpoint: ws});
    const page = await browser.newPage();
    const url = `https://web.whatsapp.com/send?phone=${phone}`;
    console.log('Navigating to:', url);
    await page.goto(url, {waitUntil: 'networkidle2', timeout: 60000});
    await page.waitForSelector('div[contenteditable="true"][data-tab]', {timeout: 60000});
    // Try to find the conversation panel element to capture only the chat area.
    const panelSelectors = [
      'div[data-testid="conversation-panel"]',
      '#main',
      'div.copyable-area',
      'div[role="region"]'
    ];

    let panelHandle = null;
    for (const sel of panelSelectors) {
      try {
        const handle = await page.$(sel);
        if (handle) {
          const box = await handle.boundingBox();
          if (box && box.height > 80 && box.width > 80) {
            panelHandle = handle;
            break;
          }
        }
      } catch (e) {
        // ignore and try next
      }
    }

    const out = `whatsapp_${phone}.png`;
    if (panelHandle) {
      console.log('Found conversation panel; taking element screenshot.');
      await panelHandle.screenshot({path: out});
      await panelHandle.dispose();
    } else {
      console.log('Conversation panel not found; falling back to full page screenshot.');
      await page.screenshot({path: out, fullPage: true});
    }
    console.log('Screenshot saved to', out);
    await page.close();
    await browser.disconnect();
    process.exit(0);
  }catch(err){
    console.error(err);
    process.exit(1);
  }
})();

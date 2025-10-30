const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer-core');

(async function(){
  const logPath = process.argv[2];
  if(!logPath){
    console.error('Usage: node log_to_screenshot.js <logPath>');
    process.exit(1);
  }
  const abs = path.resolve(logPath);
  if(!fs.existsSync(abs)){
    console.error('Log not found:', abs); process.exit(2);
  }
  const text = fs.readFileSync(abs,'utf8');
  const excerpt = (text.match(/(.{0,400}Enviando[\s\S]*$)/i) || [text])[0];

  const html = `
    <html><head><meta charset="utf-8"><style>body{font-family:monospace;padding:20px;background:#fff}pre{background:#f6f8fa;border:1px solid #e1e4e8;padding:12px;border-radius:6px;white-space:pre-wrap}</style></head><body>
    <h2>Trecho do log: aceitação automática</h2>
    <pre>${excerpt.replace(/</g,'&lt;')}</pre>
    </body></html>`;

  const outDir = path.join(__dirname, '..', 'presentation_screens');
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});
  const htmlPath = path.join(outDir, 'server_log_accept.html');
  fs.writeFileSync(htmlPath, html, 'utf8');

  const resp = await fetch('http://127.0.0.1:9222/json/version');
  const info = await resp.json();
  const ws = info.webSocketDebuggerUrl;
  const browser = await puppeteer.connect({ browserWSEndpoint: ws });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 600 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const outPng = path.join(outDir, 'server_log_accept.png');
  await page.screenshot({ path: outPng, fullPage: true });
  console.log('Saved log screenshot to', outPng);
  await browser.disconnect();
})();

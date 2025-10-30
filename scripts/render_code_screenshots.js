const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const http = require('http');

function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function getWebSocketDebuggerUrl(){
  return new Promise((resolve,reject)=>{
    http.get('http://127.0.0.1:9222/json/version',(res)=>{
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ const j=JSON.parse(d); resolve(j.webSocketDebuggerUrl);}catch(e){reject(e);} });
    }).on('error',reject);
  });
}

async function renderFiles(files){
  const outDir = path.resolve(__dirname,'..','code_screens');
  fs.mkdirSync(outDir,{recursive:true});

  const ws = await getWebSocketDebuggerUrl();
  if(!ws) throw new Error('Chrome remoto não encontrado em http://127.0.0.1:9222/json/version');
  const browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: {width: 1200, height: 900} });
  try{
    for(const f of files){
      const abs = path.resolve(process.cwd(), f);
      if(!fs.existsSync(abs)){
        console.warn('Arquivo não encontrado:', abs);
        continue;
      }
      const code = fs.readFileSync(abs,'utf8');
      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${path.basename(f)}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css" />
  <style>
    body{ background:#2b2b2b; color:#f8f8f2; font-family: 'Fira Code', monospace; padding:24px; }
    pre { font-size:14px; line-height:1.4; padding:20px; border-radius:8px; overflow:auto; }
    h1{ font-size:18px; color:#fff; margin-bottom:12px }
    .meta{ color:#bfbfbf; font-size:13px; margin-bottom:8px }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
</head>
<body>
  <h1>${path.basename(f)}</h1>
  <div class="meta">path: ${abs}</div>
  <pre class="language-javascript"><code>${escapeHtml(code)}</code></pre>
</body>
</html>`;

      const tmp = path.join(outDir, path.basename(f)+'.html');
      fs.writeFileSync(tmp, html, 'utf8');
      const page = await browser.newPage();
      // Increase viewport height to fit long files
      await page.setViewport({width:1400, height:1000});
      await page.goto('file:///' + tmp.replace(/\\/g,'/'), {waitUntil:'networkidle2'});
      // wait a moment for Prism to highlight
      await page.waitForTimeout(400);
      const outImg = path.join(outDir, path.basename(f)+'.png');
      await page.screenshot({path: outImg, fullPage: true});
      console.log('Saved', outImg);
      try{ await page.close(); }catch(e){}
    }
  } finally {
    try{ await browser.disconnect(); }catch(e){}
  }
}

const files = process.argv.slice(2);
if(files.length === 0){
  console.error('Usage: node render_code_screenshots.js <file1> <file2> ...');
  process.exit(1);
}

(async ()=>{
  try{ await renderFiles(files); process.exit(0);}catch(e){ console.error(e); process.exit(1);} 
})();

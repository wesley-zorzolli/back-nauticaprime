const http = require('http');
(async function main(){
  try{
    const json = await new Promise((resolve,reject)=>{
      http.get('http://127.0.0.1:9222/json/version', (res)=>{
        let d='';
        res.on('data',c=>d+=c);
        res.on('end',()=>{ try{ resolve(JSON.parse(d)); }catch(e){ reject(e); } });
      }).on('error',reject);
    });
    console.log('Got /json/version:');
    console.log(JSON.stringify(json, null, 2));
    if(!json.webSocketDebuggerUrl){ console.error('No webSocketDebuggerUrl in /json/version'); process.exit(2); }
    const puppeteer = require('puppeteer-core');
    console.log('Attempting puppeteer.connect to', json.webSocketDebuggerUrl);
    const browser = await puppeteer.connect({ browserWSEndpoint: json.webSocketDebuggerUrl, timeout: 10000 });
    const v = await browser.version();
    console.log('Connected! browser.version():', v);
    await browser.disconnect();
    process.exit(0);
  }catch(err){
    console.error('ERROR during test:', err);
    process.exit(3);
  }
})();

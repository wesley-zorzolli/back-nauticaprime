const http = require('http');
const path = require('path');
(async function main(){
  try{
    // pega o endpoint remoto
    const json = await new Promise((resolve,reject)=>{
      http.get('http://127.0.0.1:9222/json/version', (res)=>{
        let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ resolve(JSON.parse(d)); }catch(e){ reject(e); } });
      }).on('error',reject);
    });
    const ws = json.webSocketDebuggerUrl;
    console.log('Will try venom-bot create using WS:', ws);
    const venom = require('venom-bot');
    const opts = {
      puppeteerOptions: {
        browserWSEndpoint: ws,
        ignoreDefaultArgs: true,
        args: [],
        headless: false,
        dumpio: true,
        timeout: 120000,
        userDataDir: path.resolve(__dirname, '.venom_profile_test')
      }
    };
    console.log('Calling venom.create (this may print QR and status)');
    const client = await venom.create('nautica-test-session', (base64Qr) => {
      console.log('QR callback called — base64 length:', (base64Qr||'').length);
    }, (status) => console.log('Venom status:', status), opts);
    console.log('Venom.create returned client:', !!client);
    if(client){
      // Try send a test message to yourself? We will only print ready.
      console.log('Connected to WhatsApp via Venom. You can now scan the QR in the browser.');
    }
  }catch(err){
    console.error('VENOM TEST ERROR:', err);
  }
})();

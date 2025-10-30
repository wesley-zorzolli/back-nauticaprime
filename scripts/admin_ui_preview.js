const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer-core');

(async function(){
  const vendaJson = process.argv[2] || path.join(__dirname,'..','presentation_screens','venda_12.json');
  if(!fs.existsSync(vendaJson)){
    console.error('Venda JSON not found:', vendaJson); process.exit(1);
  }
  const venda = JSON.parse(fs.readFileSync(vendaJson,'utf8'));
  const outDir = path.join(__dirname,'..','presentation_screens');
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});

  const html = `
    <html><head><meta charset="utf-8"><style>
      body{font-family:Inter,Arial,Helvetica,sans-serif;background:#f4f6f8;padding:24px}
      .panel{max-width:1100px;margin:0 auto;background:#fff;border-radius:8px;padding:18px;box-shadow:0 4px 12px rgba(0,0,0,0.06)}
      .header{display:flex;justify-content:space-between;align-items:center}
      .status{padding:6px 10px;border-radius:6px;background:#e6ffed;color:#1a7f37;font-weight:700}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      td,th{padding:8px 10px;border-bottom:1px solid #eee}
      .btn{background:#0a66ff;color:white;padding:8px 12px;border-radius:6px;text-decoration:none}
    </style></head><body>
      <div class="panel">
        <div class="header"><h2>Admin — Propostas</h2><div class="status">ACEITA</div></div>
        <p>Proposta aceita automaticamente pelo script de demo. Use este slide durante a apresentação para mostrar o painel após aceitação.</p>
        <table>
          <tr><th>Proposta</th><th>Cliente</th><th>Embarcação</th><th>Valor</th><th>Data</th></tr>
          <tr>
            <td>#${venda.id}</td>
            <td>${venda.cliente.nome} <br/><small>${venda.cliente.telefone}</small></td>
            <td>${venda.embarcacao.modelo} <br/><small>${venda.embarcacao.marca?.nome || ''}</small></td>
            <td>R$ ${Number(venda.valor).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td>${new Date(venda.data_venda).toLocaleString()}</td>
          </tr>
        </table>
        <p style="margin-top:16px">Ação: <span class="btn">Aceitar</span> (agora desabilitado)</p>
      </div>
    </body></html>
  `;

  const htmlPath = path.join(outDir,'admin_accept_preview.html');
  fs.writeFileSync(htmlPath, html, 'utf8');

  const resp = await fetch('http://127.0.0.1:9222/json/version');
  const info = await resp.json();
  const ws = info.webSocketDebuggerUrl;
  const browser = await puppeteer.connect({ browserWSEndpoint: ws });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 700 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const outPng = path.join(outDir, 'admin_accept_preview.png');
  await page.screenshot({ path: outPng, fullPage: true });
  console.log('Admin preview saved to', outPng);
  await browser.disconnect();
})();

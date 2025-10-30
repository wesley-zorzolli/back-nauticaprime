const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer-core');

(async function(){
  const vendaId = process.argv[2];
  if(!vendaId){
    console.error('Usage: node get_venda_and_screenshot.js <vendaId>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try{
    const venda = await prisma.venda.findUnique({ where: { id: Number(vendaId) }, include: { cliente: true, embarcacao: { include: { marca: true } }, admin: true } });
    if(!venda) throw new Error('Venda não encontrada: ' + vendaId);

    const outDir = path.join(__dirname, '..', 'presentation_screens');
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const jsonPath = path.join(outDir, `venda_${vendaId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(venda, null, 2), 'utf8');
    console.log('Venda JSON gravada em', jsonPath);

    // Build a simple HTML to render
    const html = `
      <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            body{font-family: Arial, Helvetica, sans-serif; padding:24px;}
            .card{border:1px solid #ddd;padding:18px;border-radius:8px;max-width:900px}
            h1{color:#0b5;}
            dt{font-weight:700}
            dd{margin:0 0 12px 0}
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Venda #${venda.id} — Registro no DB</h1>
            <dl>
              <dt>Cliente</dt><dd>${venda.cliente.nome || venda.cliente.email || venda.cliente.telefone}</dd>
              <dt>Telefone</dt><dd>${venda.cliente.telefone || '—'}</dd>
              <dt>Embarcação</dt><dd>${venda.embarcacao?.nome || venda.embarcacao?.id}</dd>
              <dt>Marca</dt><dd>${venda.embarcacao?.marca?.nome || '—'}</dd>
              <dt>Valor</dt><dd>R$ ${Number(venda.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</dd>
              <dt>Data</dt><dd>${new Date(venda.data_venda).toLocaleString()}</dd>
              <dt>Descrição</dt><dd>${(venda.descricao||'').replace(/\n/g,'<br/>')}</dd>
            </dl>
            <pre style="background:#f7f7f7;padding:10px;border-radius:6px;overflow:auto">${JSON.stringify(venda,null,2)}</pre>
          </div>
        </body>
      </html>
    `;

    const htmlPath = path.join(outDir, `venda_${vendaId}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');

    // get webSocketDebuggerUrl
    const resp = await fetch('http://127.0.0.1:9222/json/version');
    const info = await resp.json();
    const ws = info.webSocketDebuggerUrl;
    const browser = await puppeteer.connect({ browserWSEndpoint: ws });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pngPath = path.join(outDir, `db_venda_record_${vendaId}.png`);
    await page.screenshot({ path: pngPath, fullPage: true });
    console.log('Screenshot gravada em', pngPath);
    await page.close();
    await browser.disconnect();

    process.exit(0);
  }catch(err){
    console.error('Erro:', err);
    process.exit(2);
  }finally{
    await prisma.$disconnect();
  }
})();

const http = require('http');
const puppeteer = require('puppeteer-core');
const qs = require('querystring');

async function getWebSocketDebuggerUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/version', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          resolve(j.webSocketDebuggerUrl);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
  const phone = process.argv[2] || '[REDACTED]';
    const message = process.argv[3] || 'Olá! Teste de envio via Nautica Prime (puppeteer).';

    console.log('Phone:', phone);
    console.log('Message:', message);

    const ws = await getWebSocketDebuggerUrl();
    if (!ws) throw new Error('Não encontrou webSocketDebuggerUrl em http://127.0.0.1:9222/json/version');
    console.log('browserWSEndpoint:', ws);

    const browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null, timeout: 60000 });
    const page = await browser.newPage();

    const encoded = qs.escape(message);
    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    console.log('Navegando para:', url);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

    // Espera até um dos sinais de que a página está pronta:
    // - campo editável presente (pronto para digitar)
    // - QR code presente (precisa escanear)
    const editableSelectors = [
      'div[contenteditable="true"][data-tab]',
      'div[contenteditable="true"]'
    ]
    const sendBtnSelectors = [
      'button[data-testid="compose-btn-send"]',
      'span[data-testid="send"]',
      'button[aria-label="Enviar"]',
      'button[title="Enviar"]'
    ]

    // Aguarda até 45s por elemento editável ou QR
    let editableFound = null
    try {
      for (const sel of editableSelectors) {
        try {
          await page.waitForSelector(sel, { timeout: 45000 })
          editableFound = sel
          break
        } catch (e) {
          // tenta próximo seletor
        }
      }
    } catch (e) {
      // nada
    }

    // Se não encontrou campo editável, verifica se apareceu QR (necessita scan)
    if (!editableFound) {
      const qrSelector = 'canvas[aria-label="Scan me!"]'
      const qrPresent = await page.$(qrSelector)
      if (qrPresent) {
        console.log('QR detectado — escaneie com seu celular e aguarde até a tela de conversas aparecer.');
        // deixe o usuário tempo para escanear
        // aguarda até 120s por campo editável após scan
        for (const sel of editableSelectors) {
          try {
            await page.waitForSelector(sel, { timeout: 120000 })
            editableFound = sel
            break
          } catch (e) {}
        }
      }
    }

    if (!editableFound) {
      console.log('Campo editável não encontrado automaticamente. Tentarei estratégias alternativas e tirarei um screenshot para diagnóstico.');
      try {
        await page.screenshot({ path: './.debug_screenshots/whatsapp_debug_before.png', fullPage: true })
      } catch (e) {}
    }

    if (editableFound) {
      console.log('Campo editável detectado com seletor:', editableFound)
      // Primeiro, desfoca qualquer elemento que esteja ativo (por exemplo a search bar)
      try { await page.evaluate(()=>{ if(document.activeElement) document.activeElement.blur(); }); } catch(e){}

      // Procura especificamente o input de mensagem dentro do painel principal (#main)
      let inputHandle = null;
      try {
        const mainHandle = await page.$('#main');
        if (mainHandle) {
          // Tenta o footer primeiro (onde geralmente fica o composer)
          const footer = await mainHandle.$('footer');
          if (footer) {
            const footerInput = await footer.$('[contenteditable="true"]');
            if (footerInput) inputHandle = footerInput;
          }

          // fallback: procura qualquer contenteditable visível dentro de #main
          if (!inputHandle) {
            const candidates = await mainHandle.$$('[contenteditable="true"]');
            for (const c of candidates) {
              try {
                const box = await c.boundingBox();
                if (box && box.width > 10 && box.height > 10) {
                  inputHandle = c;
                  break;
                }
              } catch (e) { /* ignore */ }
            }
          }
        }
      } catch (e) { /* ignore */ }

      if (!inputHandle) {
        // fallback: use the first editable selector we found earlier
        try { await page.click(editableFound); } catch(e){}
      } else {
        try { await inputHandle.click({clickCount: 1}); } catch(e){ try{ await page.click(editableFound); }catch(e){} }
      }

      // Digita a mensagem e envia com Enter
      await page.keyboard.type(message, { delay: 40 })
      await page.keyboard.press('Enter')
      console.log('Mensagem digitada e Enter pressionado (envio).')

      // Tirar screenshot do painel de conversa como prova
      try {
        // tenta selecionar o painel de conversa para screenshot
        const panel = await page.$('div[data-testid="conversation-panel"]') || await page.$('#main') || await page.$('.copyable-area');
        if (panel) {
          const outPath = `./whatsapp_${phone}_after_send.png`;
          await panel.screenshot({ path: outPath });
          console.log('Screenshot do painel salvo em', outPath);
        } else {
          const outPath = `./whatsapp_${phone}_after_send.png`;
          await page.screenshot({ path: outPath, fullPage: true });
          console.log('Screenshot fullpage salvo em', outPath);
        }
      } catch (e) { console.warn('Falha ao tirar screenshot de confirmação:', e); }
    } else {
      // Tenta clicar nos botões de enviar como fallback
      let sent = false
      for (const btn of sendBtnSelectors) {
        try {
          await page.waitForSelector(btn, { timeout: 5000 })
          await page.click(btn)
          console.log('Botão de enviar clicado via seletor:', btn)
          sent = true
          break
        } catch (e) {
          // tenta próximo
        }
      }
      if (!sent) {
        console.error('Falha: não foi possível enviar a mensagem automaticamente. Veja screenshot ./ .debug_screenshots/whatsapp_debug_before.png')
        process.exit(2)
      }
    }

    // Fecha a página criada pelo script (não fecha o browser remoto)
    try { await page.close(); } catch (e) {}
    try { await browser.disconnect(); } catch (e) {}
    console.log('Terminado com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('Erro no envio:', err);
    process.exit(1);
  }
})();

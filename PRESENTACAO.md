# Apresentação — Envio automático de WhatsApp ao aceitar proposta

Este documento contém slides em Markdown, prints e instruções para a demonstração.

---

## Slide 1 — Título

Automação de WhatsApp — Envio automático ao aceitar proposta

Objetivo: Quando um administrador aceita uma proposta no sistema, uma mensagem WhatsApp é enviada automaticamente ao cliente.

---

## Slide 2 — Arquitetura e tecnologias

- Backend: Node.js + TypeScript + Express
- Banco: Prisma (Neon/Postgres)
- Integração WhatsApp: Venom-bot (preferido) / Puppeteer connect (fallback) / Twilio (fallback pago)
- Fluxo: Admin UI -> API (/propostas/:id/aceitar) -> serviço WhatsApp -> cliente

---

## Slide 3 — Implementação

- Endpoint principal: `PUT /propostas/:id/aceitar` em `routes/propostas.ts`.
- Serviços de envio:
  - `services/whatsappVenom.ts` - usa `venom-bot` (tenta iniciar Puppeteer/Chromium internamente).
  - `services/whatsappPuppeteer.ts` - conecta a Chrome com `browserWSEndpoint` (remote debugging) e envia via web.whatsapp.com.
  - `services/whatsappTwilio.ts` - Twilio (opcional / backup).

---

## Slide 4 — Problemas encontrados

- Venom-bot tentou usar um launcher com flags incompatíveis com a versão do Chrome instalada (erro: "Old Headless mode has been removed").
- Solução de entrega: fallback com `puppeteer.connect` para uma instância Chrome local com `--remote-debugging-port=9222`.

---

## Slide 5 — Demonstração (passo-a-passo resumido)

1. Abrir Chrome com remote debugging:

```powershell
& "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\temp\\chrome-debug" --window-size=1200,800
```

2. Garantir `back_nautica/.env` com `USE_VENOM=false`.
3. Subir servidor:

```powershell
cd back_nautica
npm run dev
```

4. Verificar o endpoint de debug do Chrome:

```powershell
curl http://127.0.0.1:9222/json/version
```

5. Rodar script de envio de teste:

```powershell
node send_whatsapp_puppeteer.js 5553984267781 "Teste de envio automático - apresentação"
```

6. Mostrar mensagem no WhatsApp (screenshot anexada abaixo).

---

## Slide 6 — Prints e evidências

- `webSocketDebuggerUrl` (Chrome remote debug):

```
ws://127.0.0.1:9222/devtools/browser/871db461-3a9e-4786-9fc9-d4dea9090eb1
Browser: Chrome/141.0.7390.123
```

- Log de execução do script `send_whatsapp_puppeteer.js` (trecho):

```
Phone: 5553984267781
Message: Teste de envio automático - apresentação
browserWSEndpoint: ws://127.0.0.1:9222/devtools/browser/871db461-3a9e-4786-9fc9-d4dea9090eb1
Navegando para: https://web.whatsapp.com/send?phone=5553984267781&text=Teste%20de%20envio%20autom%C3%A1tico%20-%20apresenta%C3%A7%C3%A3o
Campo editável detectado com seletor: div[contenteditable="true"][data-tab]
Mensagem digitada e Enter pressionado (envio).
Terminado com sucesso.
```

- Screenshot gerada: `back_nautica/whatsapp_5553984267781.png` (mostra o chat no WhatsApp Web)

---

## Slide 7 — Conclusão e próximos passos

- Requisito funcional: OK — envio automático ao aceitar proposta.
- Próximos passos recomendados:
  - Alinhar versões do `venom-bot`/`@puppeteer/browsers` para que Venom funcione nativamente.
  - Persistir sessão (user-data-dir) para evitar QR repetido.
  - Em produção considerar Twilio (API oficial) por confiabilidade e conformidade.

---

## Arquivos úteis no repositório

- `routes/propostas.ts` — fluxo de aceite e criação de `Venda`.
- `services/whatsappVenom.ts` — tentativa de Venom.
- `services/whatsappPuppeteer.ts` — fallback (puppeteer connect).
- `send_whatsapp_puppeteer.js` — script de teste rápido.
- `scripts/capture_whatsapp_screenshot.js` — script que capturei a screenshot automática.


---

FIM

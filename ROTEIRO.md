Roteiro de apresentação (tempo estimado: 5 minutos)

Slide 1 (10s)
- "Bom dia/boa tarde, sou [seu nome]. Vou demonstrar a funcionalidade que envia automaticamente uma mensagem pelo WhatsApp quando o administrador aceita uma proposta."

Slide 2 (20s)
- Mostrar arquitetura e tecnologias. "O backend é Node.js/TypeScript, usamos Prisma para o DB. Para o WhatsApp, priorizamos Venom (sem custos), com fallback Puppeteer e Twilio."

Slide 3 (30s)
- Explicar o fluxo do endpoint `PUT /propostas/:id/aceitar` e a transação que cria a venda.

Slide 4 (45s)
- Explicar o problema encontrado com Venom (compatibilidade com Chrome/headless) e a solução de fallback adotada (puppeteer.connect). Mostrar o log de erro (se perguntarem).

Slide 5 (demonstração, 60–90s)
- Mostrar terminal com `npm run dev` (servidor rodando). Mostrar `curl http://127.0.0.1:9222/json/version` e o webSocketDebuggerUrl.
- Rodar `node send_whatsapp_puppeteer.js [REDACTED] "Teste..."` e mostrar o log de sucesso.  # número removido por privacidade
- Mostrar screenshot do WhatsApp com a mensagem recebida.

Slide 6 (30s)
- Conclusão e próximos passos.

Q&A (restante)
- Estar pronto para perguntas sobre Venom vs Twilio, custos, persistência da sessão e próximas etapas.

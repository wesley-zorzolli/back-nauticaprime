SLIDE 1 - CAPA

Título: Integração WhatsApp — Náutica Prime
Subtítulo: Notificações automatizadas para clientes
Rodapé: Wesley Zorzolli | Outubro 2025

Notas do apresentador: Apresente objetivo geral do projeto em 1 frase.

---

SLIDE 2 - OBJETIVO

Título: Objetivo do Projeto
Conteúdo (copiar):
- Notificar clientes via WhatsApp quando proposta for aceita
- Automatizar comunicação e reduzir trabalho manual
- Melhorar experiência do cliente e rastreabilidade

Notas: Diga por que isso importa para vendas e CX.

---

SLIDE 3 - TECNOLOGIAS

Título: Tecnologias Utilizadas
Conteúdo (copiar):
- Twilio API: API oficial para WhatsApp Business (principal)
- Venom-bot: fallback via WhatsApp Web (automação Puppeteer)
- Node.js, TypeScript, Prisma, PostgreSQL

Sugestão visual: logos Twilio e WhatsApp + ícones de server/database

---

SLIDE 4 - FLUXO

Título: Fluxo de Funcionamento
Conteúdo (copiar):
1. Cliente cria proposta
2. Admin aceita proposta
3. Sistema registra venda
4. Envia e-mail de confirmação
5. Envia WhatsApp via Twilio
6. Se falhar, fallback com Venom-bot

Sugestão: usar diagrama simples (setas)

---

SLIDE 5 - ENDPOINTS

Título: Rotas Principais
Conteúdo (copiar):
- POST /whatsapp/send — envia mensagem (body: toPhone, body, provider)
- POST /webhooks/twilio/messages — recebe callbacks de status
- GET /vendas/id/:id — obter venda e status whatsapp

Exemplo de payload (copiar):
{
  "toPhone": "[REDACTED]",
  "body": "Sua proposta foi aceita!",
  "provider": "twilio"
}

---

SLIDE 6 - SERVIÇOS

Título: Serviços Implementados
Conteúdo (copiar):
- services/whatsapp.ts — Twilio integration (send + statusCallback)
- services/whatsappVenom.ts — Venom-bot fallback (send via WhatsApp Web)
- routes/whatsapp.ts — rota pública para envio

Notas: destacar normalização de números BR e persistência do SID/status

---

SLIDE 7 - TESTE REAL

Título: Teste Real (Insomnia)
Conteúdo (copiar):
- Endpoint: POST /whatsapp/send
- Resposta: 200 OK
- Provider: twilio
- SID retornado: SMb3093ee67ccd1454038b7354e26ae07b
- Status inicial: queued

Sugestão: inserir print do Insomnia (200 OK) — anexar imagem

---

SLIDE 8 - LIMITAÇÕES (SANDBOX)

Título: Limitações do Twilio Sandbox
Conteúdo (copiar):
- Sandbox exige opt-in do destinatário (join <codigo>)
- Accounts Trial podem não enviar SMS de verificação para BR
- Erro comum: 63015 — Channel Sandbox can only send messages to phone numbers that have joined the Sandbox

Notas: explicar que isso é ambiente de teste; em produção não ocorre.

---

SLIDE 9 - PRODUÇÃO

Título: Como Funciona em Produção
Conteúdo (copiar):
- Conta paga Twilio + número WhatsApp próprio
- Sem limitações de destinatários
- Templates aprovados para business-initiated messages
- Webhooks para status e rastreabilidade

Estimativa rápida de custo (copiar):
- Número WhatsApp: ~US$15/mês
- Mensagens: ~US$0.005 por mensagem

---

SLIDE 10 - PRÓXIMOS PASSOS

Título: Próximos Passos
Conteúdo (copiar):
1. Fazer upgrade da conta Twilio
2. Comprar número WhatsApp Business
3. Configurar templates aprovados
4. Testar em produção com números reais
5. Monitorar e ajustar

---

SLIDE 11 - CONCLUSÃO

Título: Conclusão
Conteúdo (copiar):
- Integração implementada e testada (API responde 200 OK)
- Arquitetura com fallback para maior resiliência
- Pronto para ir a produção com conta Twilio paga

---

SLIDE 12 - CONTATO

Título: Obrigado / Contato
Conteúdo (copiar):
Wesley Zorzolli
Náutica Prime — Outubro 2025


INSTRUÇÕES RÁPIDAS PARA O COLEGA (copiar):
1) Criar apresentação no Canva (Apresentação 16:9)
2) Usar o template corporativo "Tech/Minimal"
3) Copiar e colar cada seção deste arquivo em um slide novo
4) Inserir imagens: print do Insomnia (200 OK), Twilio Console (logs), logos
5) Exportar como PDF ou PPTX


FIM - arquivo pronto para copiar/colar

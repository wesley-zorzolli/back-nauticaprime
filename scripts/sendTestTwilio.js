// Usage: node sendTestTwilio.js 5511999888777 "Mensagem de teste"
const path = require('path')
// load .env located at project root (one level up from scripts)
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })
const Twilio = require('twilio')

// debug: show where .env was loaded and presence of required vars (do NOT print secrets)
console.log('Tentando carregar .env de:', path.resolve(__dirname, '..', '.env'))
console.log('TWILIO_ACCOUNT_SID presente?', !!process.env.TWILIO_ACCOUNT_SID)
console.log('TWILIO_AUTH_TOKEN presente?', !!process.env.TWILIO_AUTH_TOKEN)
console.log('TWILIO_WHATSAPP_FROM presente?', !!process.env.TWILIO_WHATSAPP_FROM)

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromWhats = process.env.TWILIO_WHATSAPP_FROM

if (!accountSid || !authToken || !fromWhats) {
  console.error('Erro: variáveis TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM devem estar definidas no .env (verifique o caminho e valores)')
  process.exit(1)
}

const client = Twilio(accountSid, authToken)

const toArg = process.argv[2]
const bodyArg = process.argv[3]

if (!toArg || !bodyArg) {
  console.error('Uso: node sendTestTwilio.js 5511NNNNNNNN "Mensagem de teste"')
  process.exit(1)
}

async function run() {
  try {
    const toDigits = toArg.replace(/\D/g, '')
    const withDDI = toDigits.startsWith('55') ? toDigits : `55${toDigits}`
    const to = `whatsapp:+${withDDI}`

    console.log('Enviando mensagem para', to)
    const msg = await client.messages.create({
      from: fromWhats,
      to,
      body: bodyArg
    })
    console.log('Mensagem enviada. SID:', msg.sid)
    console.log('Status inicial:', msg.status)
  } catch (err) {
    console.error('Erro ao enviar via Twilio:', err.message || err)
    // se o Twilio retornar um objeto mais detalhado
    if (err.code) console.error('Twilio code:', err.code)
    process.exit(1)
  }
}

run()

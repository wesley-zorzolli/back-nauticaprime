import Twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromWhats = process.env.TWILIO_WHATSAPP_FROM // ex: 'whatsapp:+14155238886'

let client: Twilio.Twilio | null = null
if (accountSid && authToken) {
  client = Twilio(accountSid, authToken)
}

export async function sendWhatsAppTwilio(toPhone: string, body: string) {
  if (!client) throw new Error('Twilio client não configurado (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN ausentes)')
  if (!fromWhats) throw new Error('TWILIO_WHATSAPP_FROM não configurado')

  // Normalizar número para E.164 sem sinais e com DDI 55 se não informado
  const digits = toPhone.replace(/\D/g, '')
  const withDDI = digits.startsWith('55') ? digits : `55${digits}`
  const to = `whatsapp:+${withDDI}`

  const msg = await client.messages.create({
    from: fromWhats,
    to,
    body
  })

  return msg
}

export default sendWhatsAppTwilio

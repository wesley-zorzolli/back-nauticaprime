import Twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const from = process.env.TWILIO_WHATSAPP_FROM // ex: 'whatsapp:+14155238886'

let client: ReturnType<typeof Twilio> | null = null
if (accountSid && authToken) {
  client = Twilio(accountSid, authToken)
} else {
  console.warn('Twilio não configurado: verifique TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN nas variáveis de ambiente')
}

export async function sendWhatsapp(toPhone: string, body: string, opts?: { statusCallback?: string }) {
  if (!client) throw new Error('Twilio client não configurado')
  if (!toPhone) throw new Error('Telefone de destino não informado')

  // Normaliza o telefone para forçar DDI +55 e DDD 53
  function normalizeTo5553(input: string) {
    const digits = input.replace(/\D/g, '')
    // Remove prefixos de país/ddd caso o usuário já tenha informado
    let core = digits
    if (core.startsWith('55')) core = core.slice(2)
    if (core.startsWith('53')) core = core.slice(2)
    // Se não houver números restantes, mantenha o que foi passado originalmente
    if (!core) core = digits
    return `+55${'53'}${core}`
  }

  const normalized = normalizeTo5553(toPhone)
  const to = normalized.startsWith('whatsapp:') ? normalized : `whatsapp:${normalized}`

  // permite informar statusCallback (webhook) via opts
  const createOpts: any = { from, to, body }
  if (opts && opts.statusCallback) createOpts.statusCallback = opts.statusCallback
  return client.messages.create(createOpts)
}

export default {
  sendWhatsapp
}

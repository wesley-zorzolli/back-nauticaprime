import * as venom from 'venom-bot'

let clientPromise: Promise<any> | null = null

export function getVenomClient(): Promise<any> {
  if (!clientPromise) {
    clientPromise = venom.create('nautica-venom-session', (base64Qr: string) => {
      // QR code base64 may be logged for manual scan during demo
      console.log('venom QR generated — scan with phone to connect.')
    }).then((client) => {
      console.log('venom-bot conectado')
      return client
    }).catch(err => {
      clientPromise = null
      console.error('Erro ao iniciar venom-bot:', err)
      throw err
    })
  }
  return clientPromise as Promise<any>
}

export async function sendWhatsappVenom(toPhone: string, text: string) {
  const client = await getVenomClient()
  // Normaliza para forçar DDI +55 e DDD 53
  function normalizeDigitsTo5553(input: string) {
    let digits = input.replace(/\D/g, '')
    if (digits.startsWith('55')) digits = digits.slice(2)
    if (digits.startsWith('53')) digits = digits.slice(2)
    if (!digits) digits = input.replace(/\D/g, '')
    return `55${'53'}${digits}`
  }

  const digits = normalizeDigitsTo5553(toPhone)
  const id = `${digits}@c.us`
  return client.sendText(id, text)
}

export default { getVenomClient, sendWhatsappVenom }

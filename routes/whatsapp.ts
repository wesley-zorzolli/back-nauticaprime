import { Router } from 'express'
import { sendWhatsapp } from '../services/whatsapp'
import { sendWhatsappVenom } from '../services/whatsappVenom'

const router = Router()

// POST /whatsapp/send
// body: { to: string, message: string, provider?: 'twilio'|'venom' }
// Aceita também: { toPhone: string, body: string } para compatibilidade
router.post('/send', async (req, res) => {
  try {
    const { to, message, provider, toPhone, body } = req.body
    const telefone = to || toPhone
    const mensagem = message || body
    if (!telefone || !mensagem) return res.status(400).json({ erro: 'Parâmetros to/toPhone e message/body são obrigatórios' })

    // Forçar provider se passado: 'twilio' ou 'venom'
    if (provider === 'venom' || (!process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_AUTH_TOKEN)) {
      try {
        const resp = await sendWhatsappVenom(telefone, mensagem)
        return res.status(200).json({ sucesso: true, provider: 'venom', resp })
      } catch (e: any) {
        console.error('Erro venom:', e)
        return res.status(500).json({ erro: 'Erro venom', detalhe: String(e) })
      }
    }

    // padrão: twilio
    try {
      const resp = await sendWhatsapp(telefone, mensagem)
      return res.status(200).json({ sucesso: true, provider: 'twilio', resp })
    } catch (e: any) {
      console.error('Erro twilio:', e)
      return res.status(500).json({ erro: 'Erro twilio', detalhe: String(e) })
    }

  } catch (error: any) {
    console.error('Erro interno whatsapp route:', error)
    return res.status(500).json({ erro: 'Erro interno', detalhe: String(error) })
  }
})

export default router

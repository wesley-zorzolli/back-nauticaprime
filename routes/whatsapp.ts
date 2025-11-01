import { Router } from 'express'
import { sendWhatsApp } from '../services/whatsappVenom'
import { sendWhatsAppTwilio } from '../services/whatsappTwilio'

const router = Router()

// Rota de teste para enviar mensagem. Query opt 'provider' pode ser 'venom' ou 'twilio'.
router.post('/send', async (req, res) => {
  try {
    const { toPhone, body, provider } = req.body
    if (!toPhone || !body) return res.status(400).json({ erro: 'toPhone e body são obrigatórios' })

    if (provider && provider === 'twilio') {
      // Envia via Twilio (exige variáveis de ambiente configuradas)
      await sendWhatsAppTwilio(toPhone, body)
      return res.status(200).json({ sucesso: 'Mensagem enviada via Twilio com sucesso' })
    }

    // Padrão: venom
    await sendWhatsApp(toPhone, body)
    return res.status(200).json({ sucesso: 'Mensagem enviada via Venom (ou enfileirada) com sucesso' })
  } catch (error: any) {
    console.error('Erro enviar whatsapp:', error)
    return res.status(500).json({ erro: 'Erro ao enviar mensagem', detalhes: (error as any)?.message || error })
  }
})

export default router

import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

// Twilio will POST message status updates here
// Configure the Twilio statusCallback to point to: ${BASE_URL}/webhooks/twilio/messages
router.post('/messages', async (req, res) => {
  try {
    // Twilio posts form-encoded data (application/x-www-form-urlencoded)
    const sid = req.body.MessageSid || req.body.SmsSid || req.body.MessageSid
    const status = req.body.MessageStatus || req.body.MessageStatus
    const to = req.body.To
    const from = req.body.From

    if (!sid) return res.status(400).send('Missing MessageSid')

    // Tentar encontrar a venda que corresponde a esse SID e atualizar status
    try {
      const venda = await prisma.venda.findFirst({ where: { whatsappSid: sid } })
      if (venda) {
        await prisma.venda.update({ where: { id: venda.id }, data: { whatsappStatus: status } })
      }
    } catch (dbErr) {
      console.error('Erro atualizando venda pelo webhook Twilio:', dbErr)
    }

    // Responder 200 para Twilio
    return res.status(200).send('OK')
  } catch (error) {
    console.error('Erro no webhook Twilio:', error)
    return res.status(500).send('Erro')
  }
})

export default router

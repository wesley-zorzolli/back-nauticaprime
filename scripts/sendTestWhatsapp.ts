import 'dotenv/config'
import { sendWhatsApp } from '../services/whatsappVenom'

;(async () => {
  try {
    console.log('Iniciando envio de teste via Venom...')
  // número removido por privacidade; substitua por número de teste local quando executar
  await sendWhatsApp('[REDACTED]', 'Teste Nautica Prime — mensagem automática')
    console.log('Envio concluído (script)')
    process.exit(0)
  } catch (err) {
    console.error('Erro no envio (script):', err)
    process.exit(1)
  }
})()

import 'dotenv/config'
import { sendWhatsappVenom } from '../services/whatsappVenom'

;(async () => {
  try {
    console.log('Iniciando envio de teste via Venom...')
    await sendWhatsappVenom('+55 53 984267781', 'Teste Nautica Prime — mensagem automática')
    console.log('Envio concluído (script)')
    process.exit(0)
  } catch (err) {
    console.error('Erro no envio (script):', err)
    process.exit(1)
  }
})()

import { create, Whatsapp } from 'venom-bot'
import fs from 'fs'
import path from 'path'
import child_process from 'child_process'
import http from 'http'

const useVenom = process.env.USE_VENOM === 'true'
let clientPromise: Promise<Whatsapp | null> | null = null

async function tryGetWebSocketEndpoint(debugUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const req = http.get(debugUrl, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const j = JSON.parse(data)
            if (j.webSocketDebuggerUrl) return resolve(j.webSocketDebuggerUrl)
          } catch (e) {
            // ignore
          }
          return resolve(null)
        })
      })
      req.on('error', () => resolve(null))
      req.setTimeout(1500, () => {
        try {
          req.abort()
        } catch (e) {}
        resolve(null)
      })
    } catch (e) {
      resolve(null)
    }
  })
}

async function saveQr(base64Qr: string) {
  try {
    const data = base64Qr.startsWith('data:image') ? base64Qr.split(',')[1] : base64Qr
    const outPath = path.resolve(__dirname, '..', 'venom-qr.png')
    fs.writeFileSync(outPath, Buffer.from(data, 'base64') as any)
    console.log(`QR salvo em: ${outPath}`)
    try {
      if (process.platform === 'win32') {
        child_process.exec(`start "" "${outPath}"`)
      } else if (process.platform === 'darwin') {
        child_process.exec(`open "${outPath}"`)
      } else {
        child_process.exec(`xdg-open "${outPath}"`)
      }
    } catch (err) {
      console.log('Não foi possível abrir automaticamente o QR. Abra o arquivo manualmente:', outPath)
    }
  } catch (err) {
    console.log('Falha ao salvar QR, exibindo base64 no console:')
    console.log(base64Qr)
  }
}

function buildPuppeteerOptions(headlessMode: any) {
  const possiblePaths = [
    process.env.CHROME_PATH,
    process.env.VENOM_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean)

  let executablePath: string | undefined = undefined
  for (const p of possiblePaths) {
    try {
      if (p && fs.existsSync(p)) {
        executablePath = p
        break
      }
    } catch (_) {}
  }

  const profileDir = process.env.VENOM_PROFILE_DIR
    ? path.resolve(process.env.VENOM_PROFILE_DIR)
    : path.resolve(__dirname, '..', '.venom_profile')

  // Monta opções do Puppeteer/Chromium para evitar flags antigas e forçar o modo headless novo quando possível.
  let args: string[] = [
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-features=site-per-process',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1200,800'
  ]

  // Em Windows o --no-sandbox e --disable-setuid-sandbox podem causar falhas
  // no lançamento do Chrome/Chromium. Removemos essas flags quando estamos
  // no Windows para melhorar compatibilidade local.
  if (process.platform === 'win32') {
    args = args.filter(a => a !== '--no-sandbox' && a !== '--disable-setuid-sandbox')
  }

  // Se pedirmos headless novo explicitamente, passe o argumento para o Chrome também
  const wantsHeadlessNew = headlessMode === 'new' || headlessMode === 'headless:new'
  if (wantsHeadlessNew) {
    // Use '--headless=new' in args but do NOT set puppeteer's headless boolean to true,
    // otherwise older puppeteer/launcher may inject the deprecated '--headless' flag.
    args.unshift('--headless=new')
  }

  // puppeteerOptions.headless: Quando quisermos usar o novo modo headless, definimos
  // como false aqui e colocamos '--headless=new' nos args — isso evita que versões
  // mais antigas do launcher injetem a flag obsoleta '--headless'. Em ambientes onde
  // o puppeteer suporta a string 'new' diretamente, ainda manteremos esse fallback.
  const opts: any = {
    puppeteerOptions: {
      // Tenta usar o novo modo headless quando solicitado. Algumas versões
      // do Puppeteer aceitam a string 'new' para headless.
      headless: wantsHeadlessNew ? 'new' : Boolean(headlessMode),
      userDataDir: profileDir,
      defaultViewport: null,
      args,
      // Evita que o launcher injete a flag obsoleta '--headless'
      // mantendo controle total sobre quais flags passamos.
      ignoreDefaultArgs: ['--headless'],
      // Mostra os args para facilitar debugging local
      // (dumpio já encaminha stdout/stderr do browser)
      // NOTE: esse log será impresso abaixo também quando o executável for mostrado.
      // Não incluímos informações sensíveis.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      _debugArgs: args,
      // dumpio leva stdout/stderr do browser para o processo node — útil para depuração local
      dumpio: true,
      // Aumenta timeout para evitar falhas em máquinas lentas
      timeout: 120000
    }
  }

  // Se já houver um Chrome com porta de depuração aberta, tente usar o endpoint WebSocket
  const remotePort = process.env.REMOTE_DEBUGGING_PORT || '9222'
  const remoteHost = process.env.REMOTE_DEBUGGING_HOST || '127.0.0.1'
  const debugUrl = `http://${remoteHost}:${remotePort}/json/version`
  try {
    const ws = tryGetWebSocketEndpoint(debugUrl)
    // tryGetWebSocketEndpoint retorna uma Promise<string|null>
    // atribuiremos a browserWSEndpoint mais abaixo (antes do retorno) de forma assíncrona na inicialização
    ;(opts as any)._maybeRemoteDebugUrl = debugUrl
  } catch (err) {
    // ignore
  }

  if (executablePath) {
    opts.puppeteerOptions.executablePath = executablePath
    console.log('Usando executável do Chrome em:', executablePath)
  } else {
    console.log('Nenhum executável Chrome encontrado automaticamente; usando o Chromium embutido do puppeteer')
  }

  return opts
}

async function initVenomClient(): Promise<Whatsapp | null> {
  try {
    const opts1 = buildPuppeteerOptions('new')
    // Se houver um Chrome com remote debugging aberto, obtenha o webSocketDebuggerUrl e use-o
    if ((opts1 as any)._maybeRemoteDebugUrl) {
      try {
        const ws = await tryGetWebSocketEndpoint((opts1 as any)._maybeRemoteDebugUrl)
        if (ws) {
          ;(opts1 as any).puppeteerOptions.browserWSEndpoint = ws
          // Forçar modo "connect-only" ao Chrome remoto: removemos qualquer
          // executablePath, limpamos args e definimos ignoreDefaultArgs para
          // evitar que a biblioteca tente lançar outro processo.
          try {
            delete (opts1 as any).puppeteerOptions.executablePath
          } catch (err) {}
          ;(opts1 as any).puppeteerOptions.ignoreDefaultArgs = true
          ;(opts1 as any).puppeteerOptions.args = []
          ;(opts1 as any).puppeteerOptions.headless = false
          ;(opts1 as any)._forceRemoteConnectOnly = true
          console.log('Conectando ao Chrome remoto via WebSocket (forced connect-only):', ws)
        }
      } catch (err) {
        // segue para tentar iniciar localmente
      }
    }
    console.log('Tentando iniciar Venom (headless:new)')
  console.log('Puppeteer options (preview):', JSON.stringify((opts1 as any).puppeteerOptions.args))
    // Se for forced connect-only, apenas passe as opções e deixe o puppeteer
    // conectar ao browserWSEndpoint; isso evita que o launcher tente abrir
    // outro processo e falhe por incompatibilidade de flags.
    if ((opts1 as any)._forceRemoteConnectOnly) {
      console.log('Usando conexão remota apenas (não irá lançar novo processo)')
    }
    const client1 = await create('nautica-session', async (base64Qr: string) => {
      await saveQr(base64Qr)
    }, (status) => console.log('Venom status:', status), opts1 as any)
    console.log('Venom iniciado (headless:new)')
    return client1
  } catch (e1) {
    console.warn('Primeira tentativa falhou:', (e1 as any).message || e1)
    try {
      const opts2 = buildPuppeteerOptions(false)
      if ((opts2 as any)._maybeRemoteDebugUrl) {
        try {
          const ws2 = await tryGetWebSocketEndpoint((opts2 as any)._maybeRemoteDebugUrl)
          if (ws2) {
              ;(opts2 as any).puppeteerOptions.browserWSEndpoint = ws2
              // Mesma estratégia do primeiro bloco: forçar connect-only quando
              // houver um Chrome remoto disponível.
              try {
                delete (opts2 as any).puppeteerOptions.executablePath
              } catch (err) {}
              ;(opts2 as any).puppeteerOptions.ignoreDefaultArgs = true
              ;(opts2 as any).puppeteerOptions.args = []
              ;(opts2 as any).puppeteerOptions.headless = false
              ;(opts2 as any)._forceRemoteConnectOnly = true
              console.log('Conectando ao Chrome remoto via WebSocket (forced connect-only):', ws2)
          }
        } catch (err) {
          // segue
        }
      }
  console.log('Tentando iniciar Venom (headless:false)')
  console.log('Puppeteer options (preview):', JSON.stringify((opts2 as any).puppeteerOptions.args))
      if ((opts2 as any)._forceRemoteConnectOnly) {
        console.log('Usando conexão remota apenas (não irá lançar novo processo)')
      }
      const client2 = await create('nautica-session', async (base64Qr: string) => {
        await saveQr(base64Qr)
      }, (status) => console.log('Venom status:', status), opts2 as any)
      console.log('Venom iniciado (headless:false)')
      return client2
    } catch (e2) {
      console.error('Não foi possível iniciar Venom:', e2)
      return null
    }
  }
}

if (useVenom) {
  clientPromise = initVenomClient()
} else {
  console.log('Venom está desabilitado (USE_VENOM != true). Usando fallback Twilio se configurado.')
}

export async function sendWhatsApp(toPhone: string, body: string) {
  if (!useVenom) throw new Error('Venom não está habilitado (USE_VENOM != true)')
  if (!clientPromise) throw new Error('Venom ainda não inicializou')
  const client = await clientPromise
  if (!client) throw new Error('Venom não inicializou corretamente')

  if (!toPhone) throw new Error('toPhone é obrigatório')

  const digits = toPhone.replace(/\D/g, '')
  const withDDI = digits.startsWith('55') ? digits : `55${digits}`
  const jid = `${withDDI}@c.us`

  return client.sendText(jid, body)
}

export default sendWhatsApp


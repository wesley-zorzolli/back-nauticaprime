import nodemailer from 'nodemailer'

export function createTransport() {
  const host = process.env.MAILTRAP_HOST || 'smtp.mailtrap.io'
  const port = Number(process.env.MAILTRAP_PORT || 2525)
  const user = process.env.MAILTRAP_USER
  const pass = process.env.MAILTRAP_PASS

  if (!user || !pass) {
    throw new Error('Configuração do Mailtrap ausente: defina MAILTRAP_USER e MAILTRAP_PASS no .env')
  }

  return nodemailer.createTransport({
    host,
    port,
    auth: { user, pass }
  })
}

export async function sendMail({ to, subject, html }: { to: string, subject: string, html: string }) {
  const transporter = createTransport()
  const from = process.env.MAIL_FROM || 'Nautica Prime <no-reply@nauticaprime.local>'
  await transporter.sendMail({ from, to, subject, html })
}

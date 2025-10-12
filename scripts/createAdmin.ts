import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

async function main() {
  const prisma = new PrismaClient()

  const nome = process.env.ADMIN_NOME || 'Admin Inicial'
  const email = process.env.ADMIN_EMAIL || 'admin@nautica.test'
  const senha = process.env.ADMIN_SENHA || 'Admin@123'
  const nivel = Number(process.env.ADMIN_NIVEL || 1)

  const salt = bcrypt.genSaltSync(12)
  const hash = bcrypt.hashSync(senha, salt)

  try {
    const admin = await prisma.admin.create({
      data: {
        nome,
        email,
        senha: hash,
        nivel
      }
    })
    console.log('Admin criado:', admin)
  } catch (error) {
    console.error('Erro ao criar admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

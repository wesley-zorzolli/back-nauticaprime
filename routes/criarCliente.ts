import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const router = Router()

// Rota temporária para criar cliente de teste
router.post("/criar-cliente-teste", async (req, res) => {
  try {
    // Verificar se já existe
    const clienteExistente = await prisma.cliente.findFirst({
      where: { email: "wesleysantos@gmail.com" }
    })
    
    if (clienteExistente) {
      return res.status(200).json({ 
        sucesso: "Cliente já existe!",
        email: "wesleysantos@gmail.com",
        senha: "123456",
        id: clienteExistente.id
      })
    }
    
    // Senha criptografada para "123456"
    const senhaHash = bcrypt.hashSync("123456", 12)
    
    const cliente = await prisma.cliente.create({
      data: {
        nome: "Wesley Santos",
        email: "wesleysantos@gmail.com", 
        senha: senhaHash,
        cidade: "São Paulo"
      }
    })
    
    return res.status(201).json({
      sucesso: "Cliente criado com sucesso!",
      email: cliente.email,
      senha: "123456",
      id: cliente.id
    })
    
  } catch (error: any) {
    return res.status(500).json({ erro: "Erro ao criar cliente", detalhes: error?.message || error })
  }
})

export default router
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const router = Router()

router.post("/", async (req, res) => {
  const { email, senha } = req.body

  console.log("----- ROTA DE LOGIN -----")
  console.log("Dados recebidos:", req.body)

  // em termos de segurança, o recomendado é exibir uma mensagem padrão
  // a fim de evitar de dar "dicas" sobre o processo de login para hackers
  const mensaPadrao = "Login ou senha incorretos"

  if (!email || !senha) {
    // res.status(400).json({ erro: "Informe e-mail e senha do usuário" })
    res.status(400).json({ erro: mensaPadrao })
    return
  }

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { email }
    })

    console.log("Cliente encontrado no banco:", cliente)

    if (cliente == null) {
      // res.status(400).json({ erro: "E-mail inválido" })
      res.status(400).json({ erro: mensaPadrao })
      return
    }

    console.log("Comparando senhas...")
    console.log("Senha da requisição:", senha)
    console.log("Senha do banco (hash):", cliente.senha)

    // se o e-mail existe, faz-se a comparação dos hashs
    if (bcrypt.compareSync(senha, cliente.senha)) {
      console.log("Comparação de senha: SUCESSO")
      // se confere, gera e retorna o token
      const token = jwt.sign({
        clienteLogadoId: cliente.id,
        clienteLogadoNome: cliente.nome
      },
        process.env.JWT_KEY as string,
        { expiresIn: "1h" }
      )

      res.status(200).json({
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        token
      })
    } else {
      console.log("Comparação de senha: FALHOU")
      // res.status(400).json({ erro: "Senha incorreta" })
      res.status(400).json({ erro: mensaPadrao })
    }
  } catch (error) {
    console.log("Erro no bloco try/catch:", error)
    res.status(400).json(error)
  }
})

export default router
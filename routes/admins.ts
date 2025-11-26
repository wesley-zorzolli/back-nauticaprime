import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { verificaToken } from "../middewares/verificaToken"
import { getErrorMessage, zodIssues } from "../utils/errors"

const prisma = new PrismaClient()
const router = Router()

const adminSchema = z.object({
  nome: z.string().min(10,
    { message: "Nome deve possuir, no mínimo, 10 caracteres" }),
  email: z.string().email(),
  senha: z.string(),
  nivel: z.number()
    .min(1, { message: "Nível, no mínimo, 1" })
    .max(5, { message: "Nível, no máximo, 5" })
})

// Listar todos os administradores (protegido por token)
router.get("/", verificaToken, async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        nivel: true,
        createdAt: true,
        updatedAt: true
        // senha: false - não incluir senha na resposta
      }
    })
    
    res.status(200).json({
      total: admins.length,
      admins: admins
    })
  } catch (error) {
    res.status(400).json({ erro: getErrorMessage(error, 'Erro ao listar administradores') })
  }
})

// Verificar se existe pelo menos um admin cadastrado (sem necessidade de token)
router.get("/existe", async (req, res) => {
  try {
    const count = await prisma.admin.count()
    res.status(200).json({
      existeAdmin: count > 0,
      totalAdmins: count
    })
  } catch (error) {
    res.status(400).json({ erro: getErrorMessage(error, 'Erro ao verificar administradores') })
  }
})

function validaSenha(senha: string) {

  const mensa: string[] = []

  // .length: retorna o tamanho da string (da senha)
  if (senha.length < 8) {
    mensa.push("Erro... senha deve possuir, no mínimo, 8 caracteres")
  }

  // contadores
  let pequenas = 0
  let grandes = 0
  let numeros = 0
  let simbolos = 0

  // senha = "abc123"
  // letra = "a"

  // percorre as letras da variável senha
  for (const letra of senha) {
    // expressão regular
    if ((/[a-z]/).test(letra)) {
      pequenas++
    }
    else if ((/[A-Z]/).test(letra)) {
      grandes++
    }
    else if ((/[0-9]/).test(letra)) {
      numeros++
    } else {
      simbolos++
    }
  }

  if (pequenas == 0) {
    mensa.push("Erro... senha deve possuir letra(s) minúscula(s)")
  }

  if (grandes == 0) {
    mensa.push("Erro... senha deve possuir letra(s) maiúscula(s)")
  }

  if (numeros == 0) {
    mensa.push("Erro... senha deve possuir número(s)")
  }

  if (simbolos == 0) {
    mensa.push("Erro... senha deve possuir símbolo(s)")
  }

  return mensa
}

// Cadastro do primeiro admin (sem token)
router.post("/primeiro-acesso", async (req, res) => {
  const valida = adminSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: zodIssues(valida.error) })
    return
  }

  // Só permite se não existe nenhum admin
  const count = await prisma.admin.count()
  if (count > 0) {
    res.status(403).json({ erro: "Já existe administrador cadastrado!" })
    return
  }

  const erros = validaSenha(valida.data.senha)
  if (erros.length > 0) {
    res.status(400).json({ erro: erros.join("; ") })
    return
  }

  const salt = bcrypt.genSaltSync(12)
  const hash = bcrypt.hashSync(valida.data.senha, salt)
  const { nome, email, nivel } = valida.data

  try {
    const admin = await prisma.admin.create({
      data: { nome, email, senha: hash, nivel }
    })
    res.status(201).json(admin)
  } catch (error) {
    res.status(400).json({ erro: getErrorMessage(error, 'Erro ao criar administrador') })
  }
})

// Cadastro normal de admin (protegido)
router.post("/", verificaToken, async (req, res) => {

  const valida = adminSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: zodIssues(valida.error) })
    return
  }

  const erros = validaSenha(valida.data.senha)
  if (erros.length > 0) {
    res.status(400).json({ erro: erros.join("; ") })
    return
  }

  // 12 é o número de voltas (repetições) que o algoritmo faz
  // para gerar o salt (sal/tempero)
  const salt = bcrypt.genSaltSync(12)
  // gera o hash da senha acrescida do salt
  const hash = bcrypt.hashSync(valida.data.senha, salt)

  const { nome, email, nivel } = valida.data

  // para o campo senha, atribui o hash gerado
  try {
    const admin = await prisma.admin.create({
      data: { nome, email, senha: hash, nivel }
    })
    res.status(201).json(admin)
  } catch (error) {
    res.status(400).json({ erro: getErrorMessage(error, 'Erro ao criar administrador') })
  }
})

router.get("/:id", async (req, res) => {
  const { id } = req.params
  try {
    const admin = await prisma.admin.findFirst({
      where: { id }
    })
    res.status(200).json(admin)
  } catch (error) {
    res.status(400).json({ erro: getErrorMessage(error, 'Erro ao buscar administrador') })
  }
})

// Rota pública (protegida por invite code) para permitir cadastro inicial via front-end
router.post('/register', async (req, res) => {
  const { nome, email, senha, nivel } = req.body

  const valida = adminSchema.safeParse({ nome, email, senha, nivel })
  if (!valida.success) {
    res.status(400).json({ erro: zodIssues(valida.error) })
    return
  }

  const erros = validaSenha(senha)
  if (erros.length > 0) {
    res.status(400).json({ erro: erros.join('; ') })
    return
  }

  const salt = bcrypt.genSaltSync(12)
  const hash = bcrypt.hashSync(senha, salt)

  try {
    const admin = await prisma.admin.create({
      data: { nome, email, senha: hash, nivel }
    })
    res.status(201).json({ id: admin.id, nome: admin.nome, email: admin.email, nivel: admin.nivel })
  } catch (error) {
    res.status(400).json({ erro: getErrorMessage(error, 'Erro ao registrar administrador') })
  }
})

export default router
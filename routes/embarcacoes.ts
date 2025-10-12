import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

const prisma = new PrismaClient()

const router = Router()

const embarcacaoSchema = z.object({
  modelo: z.string().min(2, { message: "Modelo deve possuir, no mínimo, 2 caracteres" }),
  ano: z.number(),
  motor: z.string(),
  km_horas: z.string(),
  foto: z.string(),
  acessorios: z.string().nullable().optional(),
  marcaId: z.number(),
})

router.get("/", async (req, res) => {
  try {
    const embarcacoes = await prisma.embarcacao.findMany({
      include: {
        marca: true,
      }
    })
    res.status(200).json(embarcacoes)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/destaques", async (req, res) => {
  try {
    const embarcacoes = await prisma.embarcacao.findMany({
      include: {
        marca: true,
      },
      // O campo destaque não existe mais no modelo Embarcacao
      // where: {
      //   destaque: true
      // }
    })
    res.status(200).json(embarcacoes)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const embarcacao = await prisma.embarcacao.findFirst({
      where: { id: Number(id) },
      include: {
        marca: true,
      }
    })
    res.status(200).json(embarcacao)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {

  const valida = embarcacaoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { modelo, ano, motor, km_horas, foto, acessorios = null, marcaId } = valida.data

  try {
    const embarcacao = await prisma.embarcacao.create({
      data: {
        modelo, ano, motor, km_horas, foto, acessorios, marcaId
      }
    })
    res.status(201).json(embarcacao)
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const embarcacao = await prisma.embarcacao.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(embarcacao)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", async (req, res) => {
  const { id } = req.params

  const valida = embarcacaoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { modelo, ano, motor, km_horas, foto, acessorios, marcaId } = valida.data

  try {
    const embarcacao = await prisma.embarcacao.update({
      where: { id: Number(id) },
      data: {
        modelo, ano, motor, km_horas, foto, acessorios, marcaId
      }
    })
    res.status(200).json(embarcacao)
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.get("/pesquisa/:termo", async (req, res) => {
  const { termo } = req.params

  try {
    const embarcacoes = await prisma.embarcacao.findMany({
      include: {
        marca: true,
      },
      where: {
        OR: [
          { modelo: { contains: termo, mode: "insensitive" } },
          { marca: { nome: { equals: termo, mode: "insensitive" } } }
        ]
      }
    })
    res.status(200).json(embarcacoes)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

export default router

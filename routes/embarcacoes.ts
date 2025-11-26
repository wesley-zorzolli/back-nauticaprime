import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { getErrorMessage, zodIssues } from '../utils/errors'

const prisma = new PrismaClient()

const router = Router()

const embarcacaoSchema = z.object({
  modelo: z.string().min(2, { message: "Modelo deve possuir, no mínimo, 2 caracteres" }),
  ano: z.coerce.number({ invalid_type_error: 'Ano deve ser numérico' }),
  motor: z.string().min(1, { message: 'Combustível/Motor é obrigatório' }),
  km_horas: z.string(),
  preco: z.coerce.number({ invalid_type_error: 'Preço deve ser numérico' }).nonnegative({ message: 'Preço não pode ser negativo' }),
  foto: z.string().min(1, { message: 'Foto é obrigatória' }),
  acessorios: z.string().nullable().optional(),
  marcaId: z.coerce.number({ invalid_type_error: 'Marca deve ser numérica' }),
})

router.get("/", async (req, res) => {
  try {
    const embarcacoes = await prisma.embarcacao.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        marca: true,
      }
    })
    const payload = embarcacoes.map(e => {
      const raw = (e as any).preco
      const num = Number(raw)
      return {
        ...e,
        marcaNome: e.marca?.nome ?? null,
        valor: Number.isFinite(num) ? num : 0,
      }
    })
    res.status(200).json(payload)
  } catch (error) {
    res.status(500).json({ erro: getErrorMessage(error, 'Erro ao buscar embarcações') })
  }
})

router.get("/destaques", async (req, res) => {
  try {
    const embarcacoes = await prisma.embarcacao.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        marca: true,
      },
      // O campo destaque não existe mais no modelo Embarcacao
      // where: {
      //   destaque: true
      // }
    })
    const payload = embarcacoes.map(e => ({
      ...e,
      marcaNome: e.marca?.nome ?? null,
      valor: typeof (e as any).preco !== 'undefined' ? Number((e as any).preco) : undefined,
    }))
    res.status(200).json(payload)
  } catch (error) {
    res.status(500).json({ erro: getErrorMessage(error, 'Erro ao buscar embarcações') })
  }
})

router.get("/:id(\\d+)", async (req, res) => {
  const { id } = req.params

  try {
    const embarcacao = await prisma.embarcacao.findFirst({
      where: { id: Number(id) },
      include: {
        marca: true,
      }
    })
    const payload = embarcacao ? (() => {
      const raw = (embarcacao as any).preco
      const num = Number(raw)
      return { ...embarcacao, marcaNome: embarcacao.marca?.nome ?? null, valor: Number.isFinite(num) ? num : 0 }
    })() : null
    res.status(200).json(payload)
  } catch (error) {
    res.status(500).json({ erro: getErrorMessage(error, 'Erro ao buscar embarcação') })
  }
})

router.post("/", async (req, res) => {

  // Pré-processamento: aceitar campos do front
  const input: any = { ...req.body }
  // Motor/Combustível aliases
  if (!input.motor) {
    if (input.combustivel !== undefined) input.motor = String(input.combustivel)
    else if (input['combustível'] !== undefined) input.motor = String(input['combustível'])
    else if (input.fuel !== undefined) input.motor = String(input.fuel)
  }
  // km_horas aliases
  if (!input.km_horas) {
    const aliases = [input.quilometragem, input.horas, input.kmHoras, input.km, input.horasMotor]
    const found = aliases.find(v => v !== undefined && v !== null && String(v).trim() !== '')
    if (found !== undefined) input.km_horas = String(found)
  }
  // Foto aliases
  if (!input.foto) {
    if (input.urlFoto) input.foto = String(input.urlFoto)
    else if (input.url) input.foto = String(input.url)
    else if (input.imagem) input.foto = String(input.imagem)
  }
  // Preço aliases e normalização
  if (input.preco === undefined || input.preco === null || input.preco === '') {
    const maybe = input.preço ?? input.price ?? input.valor
    if (maybe !== undefined && maybe !== null && maybe !== '') input.preco = maybe
  }
  if (input.preco !== undefined && input.preco !== null && input.preco !== '') {
    // Normaliza formatos R$ 12.345,67 ou 12,345.67 para número
    let s = String(input.preco).trim()
    s = s.replace(/\s/g, '') // remove espaços
    s = s.replace(/R\$|\$/gi, '')
    // se tiver vírgula e ponto, assume padrão pt-BR (milhares . e decimal ,)
    if (/,/.test(s) && /\./.test(s)) {
      s = s.replace(/\./g, '').replace(/,/g, '.')
    } else if (/,/.test(s) && !/\./.test(s)) {
      // apenas vírgula, troca por ponto
      s = s.replace(/,/g, '.')
    }
    const n = Number(s)
    if (!Number.isNaN(n)) input.preco = n
  }
  // Marca: aceitar id numérico em 'marca' ou 'marca_id'
  if (input.marcaId === undefined || input.marcaId === '' || input.marcaId === null) {
    const maybeId = input.marca ?? input.marca_id ?? input.marcaID
    if (maybeId !== undefined && maybeId !== null && maybeId !== '') {
      const n = Number(maybeId)
      if (!Number.isNaN(n) && Number.isFinite(n)) input.marcaId = n
    }
  }
  // Resolver marca por nome, se não conseguimos id
  if ((input.marcaId === undefined || input.marcaId === '' || input.marcaId === null) && typeof input.marca === 'string') {
    try {
      const marca = await prisma.marca.findFirst({ where: { nome: { equals: input.marca, mode: 'insensitive' } } })
      if (marca) input.marcaId = marca.id
    } catch {}
  }

  const valida = embarcacaoSchema.safeParse(input)
  if (!valida.success) {
    res.status(400).json({ erro: zodIssues(valida.error) })
    return
  }

  const { modelo, ano, motor, km_horas, preco, foto, acessorios = null, marcaId } = valida.data

  try {
    const embarcacao = await prisma.embarcacao.create({
      include: { marca: true },
      data: {
        modelo, ano, motor, km_horas, preco, foto, acessorios, marcaId
      }
    })
    const payload = { ...embarcacao, marcaNome: embarcacao.marca?.nome ?? null, valor: Number((embarcacao as any).preco) }
    res.status(201).json(payload)
  } catch (error) {
    res.status(400).json({ erro: getErrorMessage(error, 'Erro ao cadastrar embarcação') })
  }
})

router.delete("/:id(\\d+)", async (req, res) => {
  const { id } = req.params

  try {
    const embarcacao = await prisma.embarcacao.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(embarcacao)
  } catch (error) {
    res.status(400).json({ erro: getErrorMessage(error, 'Erro ao excluir embarcação') })
  }
})

router.put("/:id(\\d+)", async (req, res) => {
  const { id } = req.params

  // Pré-processamento: aceitar campos do front
  const input: any = { ...req.body }
  if (!input.motor) {
    if (input.combustivel !== undefined) input.motor = String(input.combustivel)
    else if (input['combustível'] !== undefined) input.motor = String(input['combustível'])
    else if (input.fuel !== undefined) input.motor = String(input.fuel)
  }
  if (!input.km_horas) {
    const aliases = [input.quilometragem, input.horas, input.kmHoras, input.km, input.horasMotor]
    const found = aliases.find(v => v !== undefined && v !== null && String(v).trim() !== '')
    if (found !== undefined) input.km_horas = String(found)
  }
  if (!input.foto) {
    if (input.urlFoto) input.foto = String(input.urlFoto)
    else if (input.url) input.foto = String(input.url)
    else if (input.imagem) input.foto = String(input.imagem)
  }
  if (input.preco === undefined || input.preco === null || input.preco === '') {
    const maybe = input.preço ?? input.price ?? input.valor
    if (maybe !== undefined && maybe !== null && maybe !== '') input.preco = maybe
  }
  if (input.preco !== undefined && input.preco !== null && input.preco !== '') {
    let s = String(input.preco).trim()
    s = s.replace(/\s/g, '')
    s = s.replace(/R\$|\$/gi, '')
    if (/,/.test(s) && /\./.test(s)) {
      s = s.replace(/\./g, '').replace(/,/g, '.')
    } else if (/,/.test(s) && !/\./.test(s)) {
      s = s.replace(/,/g, '.')
    }
    const n = Number(s)
    if (!Number.isNaN(n)) input.preco = n
  }
  if (input.marcaId === undefined || input.marcaId === '' || input.marcaId === null) {
    const maybeId = input.marca ?? input.marca_id ?? input.marcaID
    if (maybeId !== undefined && maybeId !== null && maybeId !== '') {
      const n = Number(maybeId)
      if (!Number.isNaN(n) && Number.isFinite(n)) input.marcaId = n
    }
  }
  if ((input.marcaId === undefined || input.marcaId === '' || input.marcaId === null) && typeof input.marca === 'string') {
    try {
      const marca = await prisma.marca.findFirst({ where: { nome: { equals: input.marca, mode: 'insensitive' } } })
      if (marca) input.marcaId = marca.id
    } catch {}
  }

  const valida = embarcacaoSchema.safeParse(input)
  if (!valida.success) {
    res.status(400).json({ erro: zodIssues(valida.error) })
    return
  }

  const { modelo, ano, motor, km_horas, preco, foto, acessorios, marcaId } = valida.data

  try {
    const embarcacao = await prisma.embarcacao.update({
      where: { id: Number(id) },
      include: { marca: true },
      data: {
        modelo, ano, motor, km_horas, preco, foto, acessorios, marcaId
      }
    })
    const payload = { ...embarcacao, marcaNome: embarcacao.marca?.nome ?? null, valor: Number((embarcacao as any).preco) }
    res.status(200).json(payload)
  } catch (error) {
    res.status(400).json({ erro: getErrorMessage(error, 'Erro ao atualizar embarcação') })
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
    const payload = embarcacoes.map(e => ({
      ...e,
      marcaNome: e.marca?.nome ?? null,
      valor: typeof (e as any).preco !== 'undefined' ? Number((e as any).preco) : undefined,
    }))
    res.status(200).json(payload)
  } catch (error) {
    res.status(500).json({ erro: getErrorMessage(error, 'Erro na pesquisa de embarcações') })
  }
})

export default router

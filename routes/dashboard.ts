import { PrismaClient } from "@prisma/client"
import { Router } from "express"

const prisma = new PrismaClient()
const router = Router()

router.get("/gerais", async (req, res) => {
  try {
    const [clientes, embarcacoes, propostas, vendas] = await Promise.all([
      prisma.cliente.count(),
      prisma.embarcacao.count(),
      prisma.proposta.count(),
      prisma.venda.count(),
    ])
    // Mantém 'vendas' por compatibilidade e adiciona 'propostas' conforme front-end espera
    res.status(200).json({ clientes, embarcacoes, propostas, vendas })
  } catch (error) {
    res.status(400).json(error)
  }
})

type MarcaGroupByNome = {
  nome: string
  _count: {
    embarcacoes: number
  }
}

router.get("/embarcacoesMarca", async (req, res) => {
  try {
    const marcas = await prisma.marca.findMany({
      select: {
        nome: true,
        _count: {
          select: { embarcacoes: true }
        }
      }
    })

    const marcas2 = marcas
        .filter((item: MarcaGroupByNome) => item._count.embarcacoes > 0)
        .map((item: MarcaGroupByNome) => ({
            marca: item.nome,
            num: item._count.embarcacoes
        }))
    res.status(200).json(marcas2)
  } catch (error) {
    res.status(400).json(error)
  }
})

type ClienteGroupByCidade = {
  cidade: string
  _count: {
    cidade: number
  }
}

router.get("/clientesCidade", async (req, res) => {
  try {
    const clientes = await prisma.cliente.groupBy({
      by: ['cidade'],
      _count: {
        cidade: true,
      },
    })

    const clientes2 = clientes.map((cliente: ClienteGroupByCidade) => ({
      cidade: cliente.cidade,
      num: cliente._count.cidade
    }))

    res.status(200).json(clientes2)
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router

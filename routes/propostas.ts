import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import { z } from 'zod'
import { getErrorMessage } from "../utils/errors"
import { sendMail } from '../services/mailer'

const prisma = new PrismaClient()
const router = Router()

const propostaSchema = z.object({
  clienteId: z.string().uuid({
    message: "ID do cliente deve ser um UUID válido"
  }),
  embarcacaoId: z.number().int().positive({
    message: "ID da embarcação deve ser um número inteiro positivo"
  }),
  descricao: z.string().min(10, {
    message: "Descrição da proposta deve possuir, no mínimo, 10 caracteres"
  }).max(500, {
    message: "Descrição da proposta deve possuir, no máximo, 500 caracteres"
  })
})

// Listar todas as propostas (apenas para admins)
router.get("/", async (req, res) => {
  try {
    const propostas = await prisma.proposta.findMany({
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            email: true,
            cidade: true
          }
        },
        embarcacao: {
          include: {
            marca: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return res.status(200).json(propostas)
  } catch (error) {
    return res.status(400).json({ erro: getErrorMessage(error, 'Erro ao listar propostas') })
  }
})

// Listar propostas de um cliente específico
router.get("/cliente/:clienteId", async (req, res) => {
  try {
    const { clienteId } = req.params

    const propostas = await prisma.proposta.findMany({
      where: {
        clienteId: clienteId
      },
      include: {
        embarcacao: {
          include: {
            marca: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return res.status(200).json(propostas)
  } catch (error) {
    return res.status(400).json({ erro: getErrorMessage(error, 'Erro ao listar propostas do cliente') })
  }
})

// Criar nova proposta
router.post("/", async (req, res) => {
  try {
    const validation = propostaSchema.safeParse(req.body)
    
    if (!validation.success) {
      const issues = validation.error.issues.map(issue => issue.message)
      return res.status(400).json({ erro: issues.join(', ') })
    }

    const { clienteId, embarcacaoId, descricao } = validation.data

    // Verificar se o cliente existe
    const clienteExiste = await prisma.cliente.findUnique({
      where: { id: clienteId }
    })
    
    if (!clienteExiste) {
      return res.status(404).json({ erro: "Cliente não encontrado" })
    }

    // Verificar se a embarcação existe
    const embarcacaoExiste = await prisma.embarcacao.findUnique({
      where: { id: embarcacaoId }
    })
    
    if (!embarcacaoExiste) {
      return res.status(404).json({ erro: "Embarcação não encontrada" })
    }

    // Verificar se já existe uma proposta pendente deste cliente para esta embarcação
    const propostaExistente = await prisma.proposta.findFirst({
      where: {
        clienteId: clienteId,
        embarcacaoId: embarcacaoId,
        status: "PENDENTE"
      }
    })

    if (propostaExistente) {
      return res.status(400).json({ erro: "Você já possui uma proposta pendente para esta embarcação" })
    }

    // Criar a proposta
    const novaProposta = await prisma.proposta.create({
      data: {
        clienteId,
        embarcacaoId,
        descricao,
        status: "PENDENTE"
      },
      include: {
        cliente: {
          select: {
            nome: true,
            email: true
          }
        },
        embarcacao: {
          include: {
            marca: true
          }
        }
      }
    })

    return res.status(201).json({
      sucesso: "Proposta criada com sucesso",
      proposta: novaProposta
    })
  } catch (error) {
    return res.status(500).json({ erro: getErrorMessage(error, 'Erro ao criar proposta') })
  }
})

// Atualizar status da proposta (apenas para admins)
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status || !['PENDENTE', 'ACEITA', 'REJEITADA'].includes(status)) {
      return res.status(400).json({ erro: "Status inválido. Use: PENDENTE, ACEITA ou REJEITADA" })
    }

    const proposta = await prisma.proposta.findUnique({
      where: { id: Number(id) }
    })

    if (!proposta) {
      return res.status(404).json({ erro: "Proposta não encontrada" })
    }

    const propostaAtualizada = await prisma.proposta.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        cliente: {
          select: {
            nome: true,
            email: true
          }
        },
        embarcacao: {
          include: {
            marca: true
          }
        }
      }
    })

    return res.status(200).json({
      sucesso: "Status da proposta atualizado com sucesso",
      proposta: propostaAtualizada
    })
  } catch (error) {
    return res.status(500).json({ erro: getErrorMessage(error, 'Erro ao atualizar status da proposta') })
  }
})

// Responder uma proposta (apenas para admins)
router.put("/:id/responder", async (req, res) => {
  try {
    const { id } = req.params
    const { resposta } = req.body

    if (!resposta || typeof resposta !== 'string' || resposta.trim().length < 10) {
      return res.status(400).json({ erro: "Resposta deve ter pelo menos 10 caracteres" })
    }

    if (resposta.length > 1000) {
      return res.status(400).json({ erro: "Resposta deve ter no máximo 1000 caracteres" })
    }

    const proposta = await prisma.proposta.findUnique({
      where: { id: Number(id) }
    })

    if (!proposta) {
      return res.status(404).json({ erro: "Proposta não encontrada" })
    }

    const propostaAtualizada = await prisma.proposta.update({
      where: { id: Number(id) },
      data: { 
        resposta: resposta.trim(),
        updatedAt: new Date()
      },
      include: {
        cliente: {
          select: {
            nome: true,
            email: true
          }
        },
        embarcacao: {
          include: {
            marca: true
          }
        }
      }
    })

    return res.status(200).json({
      sucesso: "Resposta enviada com sucesso",
      proposta: propostaAtualizada
    })
  } catch (error) {
    return res.status(500).json({ erro: getErrorMessage(error, 'Erro ao enviar resposta') })
  }
})

// Aceitar proposta e registrar venda (apenas para admins)
router.put("/:id/aceitar", async (req, res) => {
  try {
    const { id } = req.params
    const { valor_negociado, adminId } = req.body

    if (!valor_negociado || valor_negociado <= 0) {
      return res.status(400).json({ erro: "Valor negociado deve ser maior que zero" })
    }

    if (!adminId) {
      return res.status(400).json({ erro: "ID do admin é obrigatório" })
    }

    // Verificar se o admin existe
    const adminExiste = await prisma.admin.findUnique({
      where: { id: adminId }
    })

    if (!adminExiste) {
      return res.status(404).json({ erro: "Admin não encontrado. Faça login novamente." })
    }

    const proposta = await prisma.proposta.findUnique({
      where: { id: Number(id) },
      include: {
        embarcacao: true,
        cliente: true
      }
    })

    if (!proposta) {
      return res.status(404).json({ erro: "Proposta não encontrada" })
    }

    if (proposta.status === "ACEITA") {
      return res.status(400).json({ erro: "Esta proposta já foi aceita" })
    }

    if (proposta.embarcacao.vendida) {
      return res.status(400).json({ erro: "Esta embarcação já foi vendida" })
    }

    // Usar transação para garantir consistência
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Atualizar status da proposta para ACEITA
      const propostaAtualizada = await tx.proposta.update({
        where: { id: Number(id) },
        data: { 
          status: "ACEITA",
          updatedAt: new Date()
        }
      })

      // 2. Criar registro de venda
      const venda = await tx.venda.create({
        data: {
          clienteId: proposta.clienteId,
          embarcacaoId: proposta.embarcacaoId,
          descricao: `Venda gerada a partir da proposta: ${proposta.descricao}`,
          valor: valor_negociado,
          data_venda: new Date(),
          adminId: adminId
        },
        include: {
          cliente: true,
          embarcacao: {
            include: {
              marca: true
            }
          }
        }
      })

      // 3. Marcar embarcação como vendida
      await tx.embarcacao.update({
        where: { id: proposta.embarcacaoId },
        data: { vendida: true }
      })

      // 4. Rejeitar todas as outras propostas desta embarcação
      await tx.proposta.updateMany({
        where: {
          embarcacaoId: proposta.embarcacaoId,
          id: { not: Number(id) },
          status: "PENDENTE"
        },
        data: { status: "REJEITADA" }
      })

      return { proposta: propostaAtualizada, venda }
    })

    // Enviar e-mail de confirmação para o cliente (se Mailtrap estiver configurado)
    try {
      if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
        await sendMail({
          to: resultado.venda.cliente.email,
          subject: 'Sua proposta foi aceita! - Náutica Prime',
          html: `
            <h2>Olá, ${resultado.venda.cliente.nome}!</h2>
            <p><strong>Boa notícia!</strong> Sua proposta foi aceita!</p>
            <h3>Detalhes da venda:</h3>
            <ul>
              <li><strong>Embarcação:</strong> ${resultado.venda.embarcacao.marca.nome} ${resultado.venda.embarcacao.modelo} (${resultado.venda.embarcacao.ano})</li>
              <li><strong>Descrição:</strong> ${resultado.venda.descricao}</li>
              <li><strong>Valor negociado:</strong> R$ ${Number(resultado.venda.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
              <li><strong>Data:</strong> ${new Date(resultado.venda.data_venda).toLocaleDateString('pt-BR')}</li>
            </ul>
            <p>Em breve entraremos em contato para finalizar os detalhes da compra.</p>
            <p>Obrigado por escolher a Náutica Prime!</p>
          `
        })
      }
    } catch (emailError) {
      console.error('Erro ao enviar e-mail:', emailError)
      // Não interrompe o fluxo se o e-mail falhar
    }

    return res.status(200).json({
      sucesso: "Proposta aceita e venda registrada com sucesso",
      ...resultado
    })
  } catch (error) {
    return res.status(500).json({ erro: getErrorMessage(error, 'Erro ao aceitar proposta') })
  }
})

// Deletar proposta
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const proposta = await prisma.proposta.findUnique({
      where: { id: Number(id) }
    })

    if (!proposta) {
      return res.status(404).json({ erro: "Proposta não encontrada" })
    }

    await prisma.proposta.delete({
      where: { id: Number(id) }
    })

    return res.status(200).json({ sucesso: "Proposta deletada com sucesso" })
  } catch (error) {
    return res.status(500).json({ erro: getErrorMessage(error, 'Erro ao deletar proposta') })
  }
})

export default router
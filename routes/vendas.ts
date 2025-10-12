import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import { z } from 'zod'
import { sendMail } from '../services/mailer'

const prisma = new PrismaClient()
const router = Router()

const vendaSchema = z.object({
  clienteId: z.string(),
  embarcacaoId: z.number(),
  descricao: z.string().min(10, { message: "Descrição da Venda deve possuir, no mínimo, 10 caracteres" }),
  valor: z.number(),
  data_venda: z.string().transform((str) => new Date(str)),
})

router.get("/", async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      include: {
        cliente: true,
        embarcacao: {
          include: {
            marca: true
          }
        }
      },
      orderBy: { id: 'desc' }
    })
    res.status(200).json(vendas)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.post("/", async (req, res) => {

  const valida = vendaSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }
  const { clienteId, embarcacaoId, descricao, valor, data_venda } = valida.data

  try {
    const venda = await prisma.venda.create({
      data: { clienteId, embarcacaoId, descricao, valor, data_venda },
      include: {
        cliente: true,
        embarcacao: { include: { marca: true } }
      }
    })

    // Envia e-mail de confirmação para o cliente (se Mailtrap estiver configurado)
    try {
      if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
        await sendMail({
          to: venda.cliente.email,
          subject: 'Confirmação da sua venda/proposta - Náutica Prime',
          html: `
            <h2>Olá, ${venda.cliente.nome}</h2>
            <p>Recebemos sua venda/proposta:</p>
            <ul>
              <li>Embarcação: ${venda.embarcacao.modelo} (${venda.embarcacao.ano}) - ${venda.embarcacao.marca.nome}</li>
              <li>Descrição: ${venda.descricao}</li>
              <li>Valor: R$ ${venda.valor.toFixed(2)}</li>
              <li>Data: ${new Date(venda.data_venda).toLocaleDateString('pt-BR')}</li>
            </ul>
            <p>Em breve entraremos em contato.</p>
          `
        })
      }
    } catch (e) {
      // Não falhe a request por causa do e-mail
      console.error('Falha ao enviar e-mail (Mailtrap):', e)
    }

    res.status(201).json(venda)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.get("/:clienteId", async (req, res) => {
  const { clienteId } = req.params
  try {
    const vendas = await prisma.venda.findMany({
      where: { clienteId },
      include: {
        embarcacao: {
          include: {
            marca: true
          }
        }
      }
    })
    res.status(200).json(vendas)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const venda = await prisma.venda.delete({
      where: { id: Number(id) },
    });
    res.status(200).json(venda);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;

  const valida = vendaSchema.safeParse(req.body);
  if (!valida.success) {
    res.status(400).json({ erro: valida.error });
    return;
  }

  const { clienteId, embarcacaoId, descricao, valor, data_venda } = valida.data;

  try {
    const venda = await prisma.venda.update({
      where: { id: Number(id) },
      data: { clienteId, embarcacaoId, descricao, valor, data_venda },
    });
    res.status(200).json(venda);
  } catch (error) {
    res.status(400).json(error);
  }
});

export default router;
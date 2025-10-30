const { PrismaClient } = require('@prisma/client')
const child_process = require('child_process')

;(async function(){
  const prisma = new PrismaClient()
  try{
    let cliente = await prisma.cliente.findFirst({ where: { telefone: { not: null } } })
    if(!cliente){
      cliente = await prisma.cliente.findFirst()
      if(!cliente) throw new Error('Nenhum cliente encontrado no banco')
      // atualiza o cliente com um telefone de teste
      cliente = await prisma.cliente.update({ where: { id: cliente.id }, data: { telefone: '5553984267781' } })
      console.log('Atualizei cliente para incluir telefone de teste:', cliente.id)
    }

    let embarcacao = await prisma.embarcacao.findFirst({ where: { vendida: false } })
    if(!embarcacao){
      // se não houver embarcação não vendida, pega a primeira e marca como disponível temporariamente
      embarcacao = await prisma.embarcacao.findFirst()
      if(!embarcacao) throw new Error('Nenhuma embarcação encontrada no banco')
      await prisma.embarcacao.update({ where: { id: embarcacao.id }, data: { vendida: false } })
      embarcacao = await prisma.embarcacao.findUnique({ where: { id: embarcacao.id } })
      console.log('Forçando embarcação como não vendida para teste:', embarcacao.id)
    }

    let admin = await prisma.admin.findFirst()
    if(!admin){
      admin = await prisma.admin.create({ data: { nome: 'AutoAdmin', email: 'autoadmin@local', senha: 'x', nivel: 1 } })
      console.log('Criei admin de teste:', admin.id)
    }

    // criar proposta de teste
    const proposta = await prisma.proposta.create({ data: { clienteId: cliente.id, embarcacaoId: embarcacao.id, descricao: 'Proposta automática de teste' } })
    console.log('Proposta criada:', proposta.id)

    // transação similar ao route
    const resultado = await prisma.$transaction(async (tx)=>{
      const propostaAtualizada = await tx.proposta.update({ where: { id: proposta.id }, data: { status: 'ACEITA', updatedAt: new Date() } })
      const venda = await tx.venda.create({ data: { clienteId: propostaAtualizada.clienteId, embarcacaoId: propostaAtualizada.embarcacaoId, descricao: `Venda gerada a partir da proposta: ${propostaAtualizada.descricao}`, valor: 1000.00, data_venda: new Date(), adminId: admin.id }, include: { cliente: true, embarcacao: { include: { marca: true } } } })
      await tx.embarcacao.update({ where: { id: propostaAtualizada.embarcacaoId }, data: { vendida: true } })
      await tx.proposta.updateMany({ where: { embarcacaoId: propostaAtualizada.embarcacaoId, id: { not: propostaAtualizada.id }, status: 'PENDENTE' }, data: { status: 'REJEITADA' } })
      return { proposta: propostaAtualizada, venda }
    })

    console.log('Transação concluída. Venda id:', resultado.venda.id)

    // enviar whatsapp via puppeteer
    const clienteTelefone = resultado.venda.cliente.telefone
    const mensagem = `Olá ${resultado.venda.cliente.nome}, sua proposta foi aceita! Valor negociado: R$ ${Number(resultado.venda.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Em breve entraremos em contato para os próximos passos.`
    console.log('Enviando WhatsApp para', clienteTelefone)
    try{
      // usa o script JS que já existe (send_whatsapp_puppeteer.js)
      const sendScript = require('path').resolve(__dirname, 'send_whatsapp_puppeteer.js')
      const res = child_process.spawnSync('node', [sendScript, clienteTelefone, mensagem], { stdio: 'inherit', timeout: 180000 })
      if (res.status === 0) {
        console.log('Mensagem enviada via Puppeteer (script externo) com sucesso')
      } else {
        console.error('Script de envio retornou com código', res.status)
      }
    }catch(e){
      console.error('Falha ao enviar via Puppeteer (exec):', e)
    }

    process.exit(0)
  }catch(err){
    console.error('Erro no script:', err)
    process.exit(1)
  }
})()

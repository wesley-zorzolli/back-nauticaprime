import express from 'express'
import cors from 'cors'
import path from 'path'

import 'dotenv/config'

import routesMarcas from './routes/marcas'
import routesEmbarcacoes from './routes/embarcacoes'
import routesLogin from './routes/login'
import routesClientes from './routes/clientes'
import routesVendas from './routes/vendas'
import routesDashboard from './routes/dashboard'
import routesAdminLogin from './routes/adminLogin'
import routesAdmins from './routes/admins'
import routesPropostas from './routes/propostas'
import routesCriarCliente from './routes/criarCliente'
import routesWhatsapp from './routes/whatsapp'

const app = express()
const port = Number(process.env.PORT) || 3000

app.use(express.json())
app.use(cors())

// Servir arquivos estáticos de uploads e imagens
const uploadsDir = path.join(__dirname, 'uploads')
app.use('/uploads', express.static(uploadsDir))
const publicImagesDir = path.join(__dirname, 'public')
app.use('/public', express.static(publicImagesDir))

app.use("/marcas", routesMarcas)
app.use("/embarcacoes", routesEmbarcacoes)
app.use("/clientes/login", routesLogin)
app.use("/clientes", routesClientes)
app.use("/vendas", routesVendas)
app.use("/dashboard", routesDashboard)
app.use("/admins/login", routesAdminLogin)
app.use("/admins", routesAdmins)
app.use("/propostas", routesPropostas)
app.use("/teste", routesCriarCliente)
app.use('/whatsapp', routesWhatsapp)


app.get('/', (req, res) => {
  res.send('API: Naútica Prime')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})

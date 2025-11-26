import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from 'express'

type ClienteTokenType = {
  clienteLogadoId: string
  clienteLogadoNome: string
}

// Acrescenta na interface Request (de forma global) os atributos do cliente
declare global {
  namespace Express {
    interface Request {
      clienteLogadoId?: string
      clienteLogadoNome?: string
    }
  }
}

export function verificaTokenCliente(req: Request | any, res: Response, next: NextFunction) {
  const { authorization } = req.headers

  if (!authorization) {
    res.status(401).json({ erro: "Token não informado" })
    return
  }

  const token = authorization.split(" ")[1]

  try {
    const decode = jwt.verify(token, process.env.JWT_KEY as string)
    const { clienteLogadoId, clienteLogadoNome } = decode as ClienteTokenType

    req.clienteLogadoId = clienteLogadoId
    req.clienteLogadoNome = clienteLogadoNome

    next()
  } catch (error) {
    res.status(401).json({ erro: "Token inválido" })
  }
}
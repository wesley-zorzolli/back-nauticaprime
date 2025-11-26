export function getErrorMessage(err: unknown, fallback = "Erro inesperado") {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in (err as any)) {
    return String((err as any).message)
  }
  try {
    return JSON.stringify(err)
  } catch {
    return fallback
  }
}

export function zodIssues(error: any, fallback = "Dados inválidos") {
  try {
    const issues = error?.issues
    if (Array.isArray(issues) && issues.length > 0) {
      const labels: Record<string, string> = {
        modelo: 'Modelo',
        ano: 'Ano',
        motor: 'Combustível/Motor',
        km_horas: 'Quilometragem (horas)',
        foto: 'Foto',
        marcaId: 'Marca',
      }

      const msgs = issues.map((i: any) => {
        const path = Array.isArray(i?.path) ? i.path.join('.') : String(i?.path ?? '')
        const label = labels[path] || path || 'Campo'
        const message: string = i?.message || ''
        if (!message || message.toLowerCase() === 'required') {
          return `${label} é obrigatório`
        }
        // Mensagens do Zod costumam estar ok; apenas prefixamos quando útil
        return message
      }).filter(Boolean)
      return msgs.join('; ')
    }
  } catch {}
  return fallback
}

// Marco do "reset manual da assinatura" no localStorage. O % oficial do limite do
// Claude não fica no disco, então o reset é manual: o usuário marca aqui e as
// métricas passam a contar a partir deste instante.

const RESET_KEY = 'copanel.subscriptionResetAt'

export function readResetAt(): number | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(RESET_KEY)
  const ts = raw ? Number(raw) : NaN
  return Number.isFinite(ts) ? ts : null
}

export function writeResetAt(ts: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(RESET_KEY, String(ts))
}

export function clearResetAt(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(RESET_KEY)
}

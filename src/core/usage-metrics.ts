// Métricas de uso do Claude Code a partir dos logs de sessão. Puro e testável.
// "Uso" = tokens processados (input + output + cache). O % oficial do limite
// diário/semanal vem da API do Claude (não fica no disco), então aqui é uso real
// por tokens + participação (o que mais gastou), que é o que o /cost não entrega.

export interface UsageRecord {
  ts: number // epoch ms
  project: string
  model: string
  tokens: number
}

export interface Breakdown {
  name: string
  tokens: number
  share: number // 0..1
}

export interface WindowMetrics {
  tokens: number
  count: number
  byProject: Breakdown[]
  byModel: Breakdown[]
}

export interface Windows {
  dayStart: number
  weekStart: number
  h5Start: number
}

export interface UsageMetrics {
  today: WindowMetrics
  week: WindowMetrics
  last5h: WindowMetrics
}

function breakdownBy(recs: UsageRecord[], key: 'project' | 'model', total: number): Breakdown[] {
  const m = new Map<string, number>()
  for (const r of recs) m.set(r[key], (m.get(r[key]) ?? 0) + r.tokens)
  return [...m.entries()]
    .map(([name, tokens]) => ({ name, tokens, share: total ? tokens / total : 0 }))
    .sort((a, b) => b.tokens - a.tokens)
}

function summarize(recs: UsageRecord[]): WindowMetrics {
  const tokens = recs.reduce((s, r) => s + r.tokens, 0)
  return {
    tokens,
    count: recs.length,
    byProject: breakdownBy(recs, 'project', tokens),
    byModel: breakdownBy(recs, 'model', tokens),
  }
}

export function aggregateUsage(records: UsageRecord[], w: Windows): UsageMetrics {
  return {
    today: summarize(records.filter((r) => r.ts >= w.dayStart)),
    week: summarize(records.filter((r) => r.ts >= w.weekStart)),
    last5h: summarize(records.filter((r) => r.ts >= w.h5Start)),
  }
}

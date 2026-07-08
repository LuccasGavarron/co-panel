import { describe, it, expect } from 'vitest'
import { aggregateUsage, type UsageRecord, type Windows } from './usage-metrics'

const H = 3600_000
const now = 1_000_000_000_000
const w: Windows = { dayStart: now - 20 * H, weekStart: now - 7 * 24 * H, h5Start: now - 5 * H }

const recs: UsageRecord[] = [
  { ts: now - 1 * H, project: 'facilita', model: 'opus', tokens: 100 }, // hoje + 5h
  { ts: now - 3 * H, project: 'facilita', model: 'sonnet', tokens: 300 }, // hoje + 5h
  { ts: now - 10 * H, project: 'co-panel', model: 'opus', tokens: 200 }, // hoje (não 5h)
  { ts: now - 3 * 24 * H, project: 'co-panel', model: 'opus', tokens: 400 }, // só semana
]

describe('aggregateUsage', () => {
  it('soma por janela corretamente', () => {
    const m = aggregateUsage(recs, w)
    expect(m.last5h.tokens).toBe(400) // 100 + 300
    expect(m.today.tokens).toBe(600) // + 200
    expect(m.week.tokens).toBe(1000) // + 400
  })

  it('quebra por projeto com participação, ordenado desc', () => {
    const { byProject } = aggregateUsage(recs, w).today
    expect(byProject[0]).toMatchObject({ name: 'facilita', tokens: 400 })
    expect(byProject[0].share).toBeCloseTo(400 / 600)
    expect(byProject[1]).toMatchObject({ name: 'co-panel', tokens: 200 })
  })

  it('quebra por modelo', () => {
    const { byModel } = aggregateUsage(recs, w).today
    expect(byModel.find((b) => b.name === 'opus')?.tokens).toBe(300) // 100 + 200
    expect(byModel.find((b) => b.name === 'sonnet')?.tokens).toBe(300)
  })

  it('janela vazia → zero e sem breakdown', () => {
    const m = aggregateUsage([], w)
    expect(m.today.tokens).toBe(0)
    expect(m.today.byProject).toEqual([])
  })
})

'use client'

import { useEffect, useState } from 'react'
import type { UsageMetrics, WindowMetrics, Breakdown } from '../../core/usage-metrics'
import { getUsage, getUsageSince, getUsageDaily } from '../actions'
import { readResetAt } from '../lib/reset'

// Formato sem ambiguidade: 'mi' = milhão, 'k' = mil.
function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'
  if (n >= 1e3) return Math.round(n / 1e3) + 'k'
  return String(n)
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

type Key = 'today' | 'week' | 'last5h' | 'reset'

export default function MetricsHeader({ usage }: { usage: UsageMetrics }) {
  const [open, setOpen] = useState<Key | null>('today')
  const [live, setLive] = useState<UsageMetrics>(usage)
  // Reset manual: nulo até o mount ler o localStorage (sem mismatch de hidratação).
  const [resetAt, setResetAt] = useState<number | null>(null)
  const [since, setSince] = useState<WindowMetrics | null>(null)
  const [daily, setDaily] = useState<{ day: string; tokens: number }[]>([])

  useEffect(() => {
    const tick = () => {
      getUsage().then(setLive).catch(() => {}) // ponytail: silencia falha de poll, próximo tick tenta de novo
      getUsageDaily().then(setDaily).catch(() => {})
      const r = readResetAt()
      setResetAt(r)
      if (r != null) getUsageSince(r).then(setSince).catch(() => {})
      else setSince(null)
    }
    tick() // roda já no mount pra o tile do reset aparecer sem esperar 5s
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [])

  const tiles: { key: Key; label: string; m: WindowMetrics }[] = [
    { key: 'today', label: 'Hoje', m: live.today },
    { key: 'week', label: '7 dias', m: live.week },
    { key: 'last5h', label: 'Últimas 5h', m: live.last5h },
  ]
  const hasReset = resetAt != null && since != null
  if (hasReset) tiles.push({ key: 'reset', label: 'Desde o reset', m: since! })
  const active = tiles.find((t) => t.key === open)

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse motion-reduce:animate-none" />
        <span className="text-[11px] text-[var(--color-muted)]">ao vivo</span>
      </div>
      <div className={`grid gap-2 ${hasReset ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {tiles.map((t) => (
          <button
            key={t.key}
            onClick={() => setOpen(open === t.key ? null : t.key)}
            aria-pressed={open === t.key}
            className={`rounded-2xl border p-3 text-left transition-colors ${
              open === t.key
                ? 'border-[var(--color-accent)] bg-[var(--color-surface-2)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]'
            }`}
          >
            <div className="text-xs text-[var(--color-muted)]">{t.label}</div>
            <div className="mt-1 text-2xl font-semibold leading-none">
              {fmt(t.m.tokens)}
              <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">tokens</span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-muted)]">{t.m.count} chamadas</div>
            {t.key === 'reset' && resetAt != null && (
              <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                resetado {fmtTime(resetAt)}
              </div>
            )}
          </button>
        ))}
      </div>

      {active && (active.m.tokens > 0 ? <Drill m={active.m} /> : <EmptyWindow />)}

      {daily.length > 0 && <DailyChart data={daily} />}

      <p className="mt-2 px-1 text-[11px] text-[var(--color-muted)]">
        Uso local por tokens (input + saída + cache). O % oficial do limite diário/semanal vem da
        API do Claude — o co-panel é local e não acessa.
      </p>
    </div>
  )
}

function Drill({ m }: { m: WindowMetrics }) {
  return (
    <div className="cp-rise mt-2 grid gap-5 rounded-2xl bg-[var(--color-surface)] p-4 sm:grid-cols-2">
      <BreakdownList title="O que mais gastou — por projeto" items={m.byProject} />
      <BreakdownList title="Por modelo" items={m.byModel} />
    </div>
  )
}

function BreakdownList({ title, items }: { title: string; items: Breakdown[] }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold text-[var(--color-muted)]">{title}</h4>
      <ul className="space-y-2.5">
        {items.slice(0, 6).map((i) => (
          <li key={i.name}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="truncate pr-2 font-medium">{i.name}</span>
              <span className="shrink-0 text-[var(--color-muted)]">{Math.round(i.share * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${Math.max(2, i.share * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DailyChart({ data }: { data: { day: string; tokens: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.tokens))
  return (
    <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h4 className="mb-3 text-xs font-semibold text-[var(--color-muted)]">Uso por dia (7d)</h4>
      <div className="flex items-end gap-2">
        {data.map((d) => (
          <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            {/* trilha de altura fixa; barra = fração do max via height (só style) */}
            <div className="flex h-24 w-full items-end">
              <div
                className="w-full rounded-t-md bg-[var(--color-accent)]"
                style={{ height: `${Math.max(2, (d.tokens / max) * 100)}%` }}
                title={`${fmt(d.tokens)} tokens`}
              />
            </div>
            <div className="text-[10px] text-[var(--color-muted)]">{d.day}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyWindow() {
  return (
    <div className="cp-rise mt-2 rounded-2xl bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
      Sem uso registrado nessa janela ainda.
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { UsageMetrics, WindowMetrics, Breakdown } from '../../core/usage-metrics'

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'k'
  return String(n)
}

type Key = 'today' | 'week' | 'last5h'

export default function MetricsHeader({ usage }: { usage: UsageMetrics }) {
  const [open, setOpen] = useState<Key | null>('today')
  const tiles: { key: Key; label: string; m: WindowMetrics }[] = [
    { key: 'today', label: 'Hoje', m: usage.today },
    { key: 'week', label: '7 dias', m: usage.week },
    { key: 'last5h', label: 'Últimas 5h', m: usage.last5h },
  ]
  const active = tiles.find((t) => t.key === open)

  return (
    <div className="mb-5">
      <div className="grid grid-cols-3 gap-2">
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
          </button>
        ))}
      </div>

      {active && (active.m.tokens > 0 ? <Drill m={active.m} /> : <EmptyWindow />)}

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

function EmptyWindow() {
  return (
    <div className="cp-rise mt-2 rounded-2xl bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
      Sem uso registrado nessa janela ainda.
    </div>
  )
}

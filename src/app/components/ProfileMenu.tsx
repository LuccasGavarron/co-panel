'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { buildBundle, validateBundle, planImport, type ImportPlan } from '../../core/bundle'
import type { Setup, MarketplaceSource } from '../../core/types'
import { enablePlugins } from '../actions'
import { Dots, Download, Upload, Check, Warn, X } from './icons'

// Menu ⋮ (canto superior direito): exportar/importar o "perfil" (bundle) — funcional.
export default function ProfileMenu({
  setup,
  knownMarketplaces,
}: {
  setup: Setup
  knownMarketplaces: Record<string, MarketplaceSource>
}) {
  const [menu, setMenu] = useState(false)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menu])

  function exportProfile() {
    setMenu(false)
    const enabledMap = Object.fromEntries(setup.plugins.map((p) => [p.key, p.enabled]))
    const keys = setup.plugins.filter((p) => p.enabled).map((p) => p.key)
    const bundle = buildBundle(knownMarketplaces, enabledMap, { pluginKeys: keys, authored: [] })
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'co-panel-perfil.json'
    a.click()
    URL.revokeObjectURL(url)
    setToast(`Perfil exportado (${keys.length} plugins).`)
    setTimeout(() => setToast(null), 2500)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setMenu(false)
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const bundle = validateBundle(JSON.parse(await f.text()))
      setPlan(planImport(bundle, setup, knownMarketplaces))
    } catch {
      setToast('Arquivo inválido — não parece um perfil do co-panel.')
      setTimeout(() => setToast(null), 3000)
    }
  }

  function applySafe() {
    if (!plan) return
    start(async () => {
      const res = await enablePlugins(plan.pluginsToEnable)
      if (res.ok) {
        setPlan(null)
        setToast('Perfil aplicado.')
        setTimeout(() => setToast(null), 2500)
        router.refresh()
      } else {
        setToast(res.error)
        setTimeout(() => setToast(null), 3500)
      }
    })
  }

  const item =
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left hover:bg-[var(--color-surface-2)]'

  return (
    <>
      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label="Perfil — exportar ou importar"
          aria-expanded={menu}
          className="grid size-9 place-items-center rounded-xl text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
        >
          <Dots />
        </button>
        {menu && (
          <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-xl">
            <button onClick={exportProfile} className={item}>
              <Download /> Exportar perfil
            </button>
            <button onClick={() => fileRef.current?.click()} className={item}>
              <Upload /> Importar perfil
            </button>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onFile} />

      {plan && (
        <ImportModal plan={plan} pending={pending} onApply={applySafe} onClose={() => setPlan(null)} />
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-[var(--color-surface-2)] px-4 py-2 text-sm shadow-xl">
          {toast}
        </div>
      )}
    </>
  )
}

function ImportModal({
  plan,
  pending,
  onApply,
  onClose,
}: {
  plan: ImportPlan
  pending: boolean
  onApply: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const risky = plan.risky.hooks.length + plan.risky.mcp.length
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="cp-rise max-h-[80vh] w-full max-w-md overflow-auto rounded-2xl bg-[var(--color-surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Importar perfil</h3>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-fg)]">
            <X />
          </button>
        </div>

        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Nada é aplicado sem você confirmar. Só a parte segura (ligar plugins) é aplicada aqui.
        </p>

        <Group tone="ok" title={`Seguro — ${plan.pluginsToEnable.length} plugin(s) a ligar`}>
          {plan.pluginsToEnable.map((k) => (
            <li key={k}>{k}</li>
          ))}
          {plan.marketplacesToAdd.map((m) => (
            <li key={m.name}>
              marketplace: <code>{m.source.repo ?? m.source.url}</code> (adicione com{' '}
              <code>claude plugin marketplace add</code>)
            </li>
          ))}
        </Group>

        {risky > 0 && (
          <Group tone="danger" title={`Revise à mão — ${risky} que rodam comando`}>
            {plan.risky.hooks.map((h) => (
              <li key={h.relPath}>hook: {h.relPath}</li>
            ))}
            {plan.risky.mcp.map((m) => (
              <li key={m.relPath}>MCP: {m.relPath}</li>
            ))}
          </Group>
        )}
        {plan.rejected.length > 0 && (
          <Group tone="danger" title={`Barrado — ${plan.rejected.length} inseguro(s)`}>
            {plan.rejected.map((r) => (
              <li key={r.relPath}>
                {r.relPath} — {r.reason}
              </li>
            ))}
          </Group>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={onApply}
            disabled={pending || plan.pluginsToEnable.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-accent-fg)] disabled:opacity-60"
          >
            <Check />
            {pending ? 'aplicando…' : 'Aplicar seguro'}
          </button>
        </div>
        {risky > 0 && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Hooks e MCP não aplicam por aqui de propósito — são execução de comando na sua máquina.
          </p>
        )}
      </div>
    </div>
  )
}

function Group({
  tone,
  title,
  children,
}: {
  tone: 'ok' | 'danger'
  title: string
  children: React.ReactNode
}) {
  const color = tone === 'ok' ? 'var(--color-ok)' : 'var(--color-danger)'
  return (
    <div className="mt-3 rounded-xl bg-[var(--color-surface-2)] p-3">
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color }}>
        {tone === 'ok' ? <Check /> : <Warn />}
        {title}
      </div>
      <ul className="mt-2 space-y-1 pl-6 text-sm text-[var(--color-muted)]">{children}</ul>
    </div>
  )
}

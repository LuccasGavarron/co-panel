'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { buildBundle, validateBundle, planImport, type ImportPlan } from '../../core/bundle'
import type { Setup, MarketplaceSource } from '../../core/types'
import { enablePlugins, setEnabledPlugins } from '../actions'
import { Download, Upload, Check, Warn, X } from './icons'
import {
  type Profile,
  readProfiles,
  writeProfiles,
  readActiveId,
  writeActiveId,
  newProfileId,
  enabledKeys,
} from '../lib/profiles'
import { readResetAt, writeResetAt, clearResetAt } from '../lib/reset'

// Seletor de perfis (canto superior direito): troca o conjunto de plugins ligados;
// mantém o exportar/importar de perfil (bundle) com revisão de segurança.
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
  // Estado começa nulo e é preenchido no client no mount (evita mismatch de hidratação).
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  // Reset manual da assinatura: nulo até o mount ler o localStorage.
  const [hasReset, setHasReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Lê os perfis no mount; se vazio, cria 'Padrão' com o estado atual de plugins.
  useEffect(() => {
    let list = readProfiles()
    let id = readActiveId()
    if (list.length === 0) {
      const def: Profile = { id: newProfileId(), name: 'Padrão', enabledPlugins: currentEnabled() }
      list = [def]
      id = def.id
      writeProfiles(list)
      writeActiveId(id)
    } else if (!id || !list.some((p) => p.id === id)) {
      id = list[0].id
      writeActiveId(id)
    }
    setProfiles(list)
    setActiveId(id)
    setHasReset(readResetAt() != null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menu])

  const active = profiles?.find((p) => p.id === activeId) ?? null

  /** Snapshot de quais plugins estão ligados agora (derivado do setup). */
  function currentEnabled(): Record<string, boolean> {
    return Object.fromEntries(setup.plugins.map((p) => [p.key, p.enabled]))
  }

  function flash(msg: string, ms = 2500) {
    setToast(msg)
    setTimeout(() => setToast(null), ms)
  }

  /** Marca o reset manual da assinatura — métricas passam a contar a partir de agora. */
  function markReset() {
    setMenu(false)
    writeResetAt(Date.now())
    setHasReset(true)
    flash('Reset marcado — métricas contam a partir de agora.')
  }

  function undoReset() {
    setMenu(false)
    clearResetAt()
    setHasReset(false)
    flash('Reset desfeito.')
  }

  /** Torna o perfil ativo e aplica os plugins que ele liga. */
  function switchProfile(p: Profile) {
    setMenu(false)
    writeActiveId(p.id)
    setActiveId(p.id)
    start(async () => {
      // Aplica o perfil inteiro: liga E desliga (grava o mapa completo).
      const res = await setEnabledPlugins(p.enabledPlugins)
      if (res.ok) router.refresh()
      else flash(res.error, 3500)
    })
  }

  function renameProfile() {
    setMenu(false)
    if (!active || !profiles) return
    const name = window.prompt('Renomear perfil', active.name)?.trim()
    if (!name) return
    const list = profiles.map((p) => (p.id === active.id ? { ...p, name } : p))
    writeProfiles(list)
    setProfiles(list)
  }

  function newProfile() {
    setMenu(false)
    const name = window.prompt('Nome do novo perfil')?.trim()
    if (!name) return
    // Snapshot do estado atual — a config já bate com ele, então não precisa aplicar.
    const p: Profile = { id: newProfileId(), name, enabledPlugins: currentEnabled() }
    const list = [...(profiles ?? []), p]
    writeProfiles(list)
    writeActiveId(p.id)
    setProfiles(list)
    setActiveId(p.id)
  }

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
      const name = window.prompt('Nome do perfil importado', bundle.createdWith)?.trim()
      if (!name) return
      // Cria o perfil com o enabledPlugins do bundle e torna-o ativo já.
      const p: Profile = { id: newProfileId(), name, enabledPlugins: bundle.enabledPlugins }
      const list = [...(profiles ?? []), p]
      writeProfiles(list)
      writeActiveId(p.id)
      setProfiles(list)
      setActiveId(p.id)
      // Mostra a revisão de segurança; hooks/MCP nunca auto-aplicam.
      setPlan(planImport(bundle, setup, knownMarketplaces))
    } catch {
      flash('Arquivo inválido — não parece um perfil do co-panel.', 3000)
    }
  }

  function applySafe() {
    if (!plan) return
    start(async () => {
      const res = await enablePlugins(plan.pluginsToEnable)
      if (res.ok) {
        setPlan(null)
        flash('Perfil aplicado.')
        router.refresh()
      } else {
        flash(res.error, 3500)
      }
    })
  }

  const item =
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left hover:bg-[var(--color-surface-2)]'

  // Antes de carregar do localStorage não há perfil — reserva o espaço do avatar
  // sem interação (render idêntico no server e no primeiro client, sem mismatch).
  if (!active) {
    return <div className="size-9 rounded-full bg-[var(--color-surface-2)]" aria-hidden />
  }

  const initial = (active.name.trim()[0] ?? '?').toUpperCase()

  return (
    <>
      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label={`Perfil ativo: ${active.name}. Trocar perfil`}
          aria-haspopup="menu"
          aria-expanded={menu}
          className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-[var(--color-surface-2)]"
        >
          <span className="grid size-9 place-items-center rounded-full bg-[var(--color-accent)] text-sm font-semibold text-[var(--color-accent-fg)]">
            {initial}
          </span>
          <span className="text-sm">{active.name}</span>
        </button>
        {menu && (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-xl"
          >
            {profiles?.map((p) => (
              <button
                key={p.id}
                role="menuitemradio"
                aria-checked={p.id === activeId}
                onClick={() => switchProfile(p)}
                className={item}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-accent-fg)]">
                  {(p.name.trim()[0] ?? '?').toUpperCase()}
                </span>
                <span className="flex-1 truncate">{p.name}</span>
                {p.id === activeId && <Check />}
              </button>
            ))}
            <div className="my-1 h-px bg-[var(--color-border)]" />
            <button onClick={renameProfile} className={item}>
              Renomear perfil
            </button>
            <button onClick={newProfile} className={item}>
              Novo perfil
            </button>
            <div className="my-1 h-px bg-[var(--color-border)]" />
            <button onClick={exportProfile} className={item}>
              <Download /> Exportar perfil
            </button>
            <button onClick={() => fileRef.current?.click()} className={item}>
              <Upload /> Importar perfil
            </button>
            <div className="my-1 h-px bg-[var(--color-border)]" />
            <button onClick={markReset} className={item}>
              Minha assinatura resetou
            </button>
            {hasReset && (
              <button onClick={undoReset} className={`${item} text-[var(--color-muted)]`}>
                Desfazer reset
              </button>
            )}
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

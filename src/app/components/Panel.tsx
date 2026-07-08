'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Hello from './Hello'
import UpdateBanner from './UpdateBanner'
import { togglePlugin, enablePlugins } from '../actions'
import { buildBundle, validateBundle, planImport, type ImportPlan } from '../../core/bundle'
import type {
  Setup,
  PluginRef,
  ProvidedAsset,
  ContextLayer,
  MarketplaceSource,
} from '../../core/types'
import {
  Chevron,
  Plugin,
  Skill,
  Command,
  Agent,
  Mcp,
  Hook,
  Download,
  Upload,
  Compass,
  Check,
  Warn,
} from './icons'

interface Discover {
  name: string
  repo?: string
  url: string
  description: string
  tags: string[]
}

type Tab = 'setup' | 'contexto' | 'bundle' | 'descobrir'
const TABS: { id: Tab; label: string; Icon: typeof Plugin }[] = [
  { id: 'setup', label: 'Meu setup', Icon: Plugin },
  { id: 'contexto', label: 'Contexto', Icon: Skill },
  { id: 'bundle', label: 'Bundle', Icon: Download },
  { id: 'descobrir', label: 'Descobrir', Icon: Compass },
]

const KIND_ICON: Record<ProvidedAsset['kind'], typeof Plugin> = {
  skill: Skill,
  command: Command,
  agent: Agent,
  hook: Hook,
  mcp: Mcp,
}

export default function Panel({
  setup,
  context,
  marketplaces,
  knownMarketplaces,
  appVersion,
}: {
  setup: Setup
  context: { layers: ContextLayer[]; total: number }
  marketplaces: Discover[]
  knownMarketplaces: Record<string, MarketplaceSource>
  appVersion: string
}) {
  const [tab, setTab] = useState<Tab>('setup')

  function go(next: Tab) {
    // Transição de estado, não corte: anima a troca de aba quando suportado.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void }
    if (doc.startViewTransition) doc.startViewTransition(() => setTab(next))
    else setTab(next)
  }

  const navBtn = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-[var(--color-surface-2)] text-[var(--color-fg)]'
        : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
    }`

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:flex">
        <div className="px-1 pb-5 pt-1">
          <Hello />
        </div>
        <nav className="flex flex-col gap-1" role="tablist" aria-label="Seções">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => go(id)} className={navBtn(tab === id)}>
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between px-2 pt-4 text-xs text-[var(--color-muted)]">
          <span>local · sem nuvem</span>
          <span>v{appVersion}</span>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header + nav — mobile */}
        <div className="sm:hidden">
          <header className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
            <Hello />
            <span className="text-xs text-[var(--color-muted)]">local</span>
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] p-2" role="tablist">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => go(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  tab === id ? 'bg-[var(--color-surface-2)] text-[var(--color-fg)]' : 'text-[var(--color-muted)]'
                }`}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
          <UpdateBanner />
          <section className="mt-4">
            {tab === 'setup' && <MeuSetup setup={setup} onDiscover={() => go('descobrir')} />}
            {tab === 'contexto' && <Contexto context={context} />}
            {tab === 'bundle' && <Bundle setup={setup} knownMarketplaces={knownMarketplaces} />}
            {tab === 'descobrir' && <Descobrir marketplaces={marketplaces} />}
          </section>
        </main>
      </div>
    </div>
  )
}

// ---------------- Meu setup ----------------

function MeuSetup({ setup, onDiscover }: { setup: Setup; onDiscover: () => void }) {
  const router = useRouter()
  const [state, setState] = useState(setup.plugins)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const active = state.filter((p) => p.enabled).length

  function flip(key: string, on: boolean) {
    setError(null)
    setState((prev) => prev.map((p) => (p.key === key ? { ...p, enabled: on } : p)))
    start(async () => {
      const res = await togglePlugin(key, on)
      if (!res.ok) {
        setState((prev) => prev.map((p) => (p.key === key ? { ...p, enabled: !on } : p)))
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  if (state.length === 0) {
    return (
      <Empty
        title="Nenhum plugin ativo ainda"
        hint="Aqui é onde você liga e desliga o que o Claude Code usa. Ainda não há nada — comece adicionando uma fonte no Descobrir."
        action={{ label: 'Ver o Descobrir', onClick: onDiscover }}
      />
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--color-muted)]">
          <span className="font-semibold text-[var(--color-fg)]">{active}</span> de {state.length}{' '}
          plugins ligados · escopo <ScopeTag scope="user" />
        </p>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <ul className="cp-stagger space-y-2">
        {state.map((p) => (
          <PluginCard key={p.key} plugin={p} disabled={pending} onToggle={flip} />
        ))}
      </ul>

      {setup.authored.length > 0 && (
        <>
          <h3 className="mb-2 mt-8 text-sm font-semibold text-[var(--color-muted)]">
            Assets que você escreveu
          </h3>
          <ul className="space-y-1.5">
            {setup.authored.map((a) => (
              <li
                key={a.source}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-sm"
              >
                <AssetIcon kind={a.kind} />
                <span className="font-medium">{a.name}</span>
                {a.description && (
                  <span className="truncate text-[var(--color-muted)]">— {a.description}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {(setup.mcp.length > 0 || setup.hooks.length > 0) && (
        <div className="mt-8 flex flex-wrap gap-2">
          {setup.mcp.map((m) => (
            <Chip key={`mcp-${m.name}`} Icon={Mcp}>
              MCP: {m.name}
            </Chip>
          ))}
          {setup.hooks.map((h) => (
            <Chip key={`hook-${h.event}`} Icon={Hook}>
              hook: {h.event}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}

function PluginCard({
  plugin,
  disabled,
  onToggle,
}: {
  plugin: PluginRef
  disabled: boolean
  onToggle: (key: string, on: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <li className="overflow-hidden rounded-2xl bg-[var(--color-surface)]">
      <div className="flex items-center gap-3 p-3">
        <span className="text-[var(--color-muted)]">
          <Plugin />
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <span className="truncate font-medium">{plugin.name}</span>
          <span className="shrink-0 text-xs text-[var(--color-muted)]">
            {plugin.marketplace} · {plugin.version}
          </span>
          {plugin.provides.length > 0 && (
            <span
              className="ml-auto shrink-0 text-[var(--color-muted)] transition-transform"
              style={{ transform: open ? 'rotate(90deg)' : 'none' }}
            >
              <Chevron />
            </span>
          )}
        </button>
        <Switch on={plugin.enabled} disabled={disabled} onChange={(on) => onToggle(plugin.key, on)} />
      </div>
      {open && plugin.provides.length > 0 && (
        <ul className="border-t border-[var(--color-border)] px-3 py-2">
          {plugin.provides.map((a) => (
            <li key={a.source} className="flex items-center gap-2 py-1 text-sm">
              <AssetIcon kind={a.kind} />
              <span className="font-medium">{a.name}</span>
              {a.description && (
                <span className="truncate text-[var(--color-muted)]">— {a.description}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function Switch({
  on,
  disabled,
  onChange,
}: {
  on: boolean
  disabled?: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        on ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
      }`}
    >
      <span
        className="absolute top-0.5 size-5 rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

// ---------------- Contexto ----------------

function Contexto({ context }: { context: { layers: ContextLayer[]; total: number } }) {
  const max = Math.max(1, ...context.layers.map((l) => l.tokens))
  if (context.layers.length === 0) {
    return (
      <Empty
        title="Nada no seu contexto ainda"
        hint="Aqui aparece o que o Claude recebe no prompt (CLAUDE.md, skills, memória) e quanto cada fonte custa em tokens. Ligue skills ou adicione um CLAUDE.md global pra ver."
      />
    )
  }
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-muted)]">O que o Claude recebe</h2>
        <span className="text-sm">
          <span className="font-semibold">~{context.total.toLocaleString('pt-BR')}</span> tokens
        </span>
      </div>
      <ul className="cp-stagger space-y-2">
        {context.layers.map((l, i) => (
          <li key={`${l.source}-${i}`} className="rounded-2xl bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{l.label}</span>
              <span className="text-[var(--color-muted)]">~{l.tokens.toLocaleString('pt-BR')}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${(l.tokens / max) * 100}%` }}
              />
            </div>
            {l.detail && <p className="mt-1 text-xs text-[var(--color-muted)]">{l.detail}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[var(--color-muted)]">
        Mostra só as camadas que você controla por arquivo. Não inclui o system-prompt-base interno
        do Claude Code (é do harness, não dá pra ver nem mexer).
      </p>
    </div>
  )
}

// ---------------- Bundle ----------------

function Bundle({
  setup,
  knownMarketplaces,
}: {
  setup: Setup
  knownMarketplaces: Record<string, MarketplaceSource>
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(setup.plugins.filter((p) => p.enabled).map((p) => p.key)),
  )
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const enabledMap = useMemo(
    () => Object.fromEntries(setup.plugins.map((p) => [p.key, p.enabled])),
    [setup.plugins],
  )

  function toggleSel(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function doExport() {
    const bundle = buildBundle(knownMarketplaces, enabledMap, {
      pluginKeys: [...selected],
      authored: [],
    })
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'co-panel-bundle.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null)
    setPlan(null)
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const bundle = validateBundle(JSON.parse(await file.text()))
      setPlan(planImport(bundle, setup, knownMarketplaces))
    } catch {
      setImportError('Arquivo inválido — não parece um bundle do co-panel.')
    }
  }

  function applySafe() {
    if (!plan) return
    start(async () => {
      const res = await enablePlugins(plan.pluginsToEnable)
      if (res.ok) {
        setPlan(null)
        router.refresh()
      } else {
        setImportError(res.error)
      }
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-muted)]">Exportar</h2>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Escolha os plugins e baixe um bundle pra mandar pro seu amigo.
        </p>
        <ul className="mb-3 space-y-1.5">
          {setup.plugins.map((p) => (
            <li key={p.key} className="flex items-center gap-2 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(p.key)}
                onChange={() => toggleSel(p.key)}
                className="size-4 accent-[var(--color-accent)]"
              />
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-[var(--color-muted)]">{p.marketplace}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={doExport}
          disabled={selected.size === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-50"
        >
          <Download />
          Baixar bundle ({selected.size})
        </button>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-muted)]">Importar</h2>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Abra um bundle de amigo. Nada é aplicado sem você revisar.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-surface-2)] px-4 py-2 text-sm font-medium">
          <Upload />
          Escolher arquivo
          <input type="file" accept="application/json" className="hidden" onChange={onFile} />
        </label>

        {importError && <Banner tone="danger">{importError}</Banner>}
        {plan && <ImportReview plan={plan} pending={pending} onApply={applySafe} />}
      </div>
    </div>
  )
}

function ImportReview({
  plan,
  pending,
  onApply,
}: {
  plan: ImportPlan
  pending: boolean
  onApply: () => void
}) {
  const risky = plan.risky.hooks.length + plan.risky.mcp.length
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-[var(--color-muted)]">
        Li o bundle: <b className="text-[var(--color-fg)]">{plan.pluginsToEnable.length}</b> plugin(s) a
        ligar, <b className="text-[var(--color-fg)]">{plan.marketplacesToAdd.length}</b> marketplace(s),{' '}
        <b className="text-[var(--color-fg)]">{plan.authoredToCopy.length}</b> arquivo(s)
        {risky > 0 && (
          <>
            {' '}
            e <b style={{ color: 'var(--color-danger)' }}>{risky}</b> que roda comando
          </>
        )}
        .
      </p>
      <ReviewGroup tone="ok" title={`Seguro — ${plan.pluginsToEnable.length} plugin(s) a ligar`}>
        {plan.pluginsToEnable.map((k) => (
          <li key={k}>{k}</li>
        ))}
        {plan.marketplacesToAdd.map((m) => (
          <li key={m.name}>
            marketplace: <code>{m.source.repo ?? m.source.url}</code>
          </li>
        ))}
        {plan.authoredToCopy.map((a) => (
          <li key={a.relPath}>arquivo: {a.relPath}</li>
        ))}
      </ReviewGroup>

      {risky > 0 && (
        <ReviewGroup tone="danger" title={`Revisar — ${risky} item(ns) que rodam comando`}>
          {plan.risky.hooks.map((h) => (
            <li key={h.relPath}>hook: {h.relPath} (executa shell — confira o conteúdo)</li>
          ))}
          {plan.risky.mcp.map((m) => (
            <li key={m.relPath}>MCP: {m.relPath} (roda um servidor — confira o comando)</li>
          ))}
        </ReviewGroup>
      )}

      {plan.rejected.length > 0 && (
        <ReviewGroup tone="danger" title={`Barrado — ${plan.rejected.length} inseguro(s)`}>
          {plan.rejected.map((r) => (
            <li key={r.relPath}>
              {r.relPath} — {r.reason}
            </li>
          ))}
        </ReviewGroup>
      )}

      <button
        onClick={onApply}
        disabled={pending || plan.pluginsToEnable.length === 0}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-50"
      >
        <Check />
        Aplicar só o que é seguro
      </button>
      {risky > 0 && (
        <p className="text-xs text-[var(--color-muted)]">
          Hooks e MCP não são aplicados por aqui de propósito — copie o conteúdo à mão só depois de
          ler. É execução de comando na sua máquina.
        </p>
      )}
    </div>
  )
}

function ReviewGroup({
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
    <div className="rounded-2xl bg-[var(--color-surface)] p-3">
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color }}>
        {tone === 'ok' ? <Check /> : <Warn />}
        {title}
      </div>
      <ul className="mt-2 space-y-1 pl-6 text-sm text-[var(--color-muted)]">{children}</ul>
    </div>
  )
}

// ---------------- Descobrir ----------------

function Descobrir({ marketplaces }: { marketplaces: Discover[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-muted)]">
        Boas fontes de plugins, skills e design
      </h2>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {marketplaces.map((m) => (
          <DiscoverCard key={m.name} m={m} />
        ))}
      </div>
    </div>
  )
}

function DiscoverCard({ m }: { m: Discover }) {
  const [copied, setCopied] = useState(false)
  const cmd = m.repo ? `claude plugin marketplace add ${m.repo}` : null
  return (
    <article className="flex w-72 shrink-0 snap-start flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2">
        <span className="text-[var(--color-muted)]">
          <Compass />
        </span>
        <h3 className="font-semibold">{m.name}</h3>
      </div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{m.description}</p>
      {/* tags = rótulos com contorno (não parecem clicáveis) */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {m.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--color-muted)]"
          >
            {t}
          </span>
        ))}
      </div>
      {/* ações = botões de verdade (peso, cor, ícone) */}
      <div className="mt-4 flex items-center gap-2">
        <a
          href={m.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-[var(--color-accent-fg)] transition-opacity hover:opacity-90"
        >
          Abrir
        </a>
        {cmd && (
          <button
            onClick={() => {
              navigator.clipboard?.writeText(cmd)
              setCopied(true)
              setTimeout(() => setCopied(false), 1200)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-muted)]"
          >
            {copied ? (
              <>
                <Check /> copiado
              </>
            ) : (
              'copiar comando'
            )}
          </button>
        )}
      </div>
    </article>
  )
}

// ---------------- compartilhados ----------------

function AssetIcon({ kind }: { kind: ProvidedAsset['kind'] }) {
  const Icon = KIND_ICON[kind]
  return (
    <span className="text-[var(--color-muted)]">
      <Icon />
    </span>
  )
}

function Chip({ Icon, children }: { Icon: typeof Plugin; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
      <Icon />
      {children}
    </span>
  )
}

function ScopeTag({ scope }: { scope: 'user' | 'project' }) {
  return (
    <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-medium">
      {scope === 'user' ? 'usuário' : 'projeto'}
    </span>
  )
}

function Banner({ tone, children }: { tone: 'danger'; children: React.ReactNode }) {
  return (
    <div
      className="my-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
      style={{ background: 'color-mix(in oklch, var(--color-danger) 15%, transparent)', color: 'var(--color-danger)' }}
    >
      <Warn />
      {children}
    </div>
  )
}

function Empty({
  title,
  hint,
  action,
}: {
  title: string
  hint: string
  action?: { label: string; onClick: () => void }
}) {
  // Estado vazio ensina (reel synsation_): diz por que está vazio + o que fazer, sem parecer quebrado.
  return (
    <div className="cp-rise rounded-2xl bg-[var(--color-surface)] p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--color-muted)]">{hint}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)]"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Hello from './Hello'
import UpdateBanner from './UpdateBanner'
import MetricsHeader from './MetricsHeader'
import ProfileMenu from './ProfileMenu'
import ScopeSelector from './ScopeSelector'
import { togglePlugin, getAssetContent, getMcpDetail, getHookDetail } from '../actions'
import type {
  Setup,
  PluginRef,
  ProvidedAsset,
  ContextLayer,
  MarketplaceSource,
} from '../../core/types'
import type { UsageMetrics } from '../../core/usage-metrics'
import { Chevron, Plugin, Skill, Command, Agent, Mcp, Hook, Flow, Gauge, Compass, Check } from './icons'
import discover from '../data/discover.json'

interface Discover {
  name: string
  kind: 'plugin' | 'skill' | 'workflow' | 'marketplace'
  category: string
  repo?: string
  url: string
  description: string
}

type Tab = 'setup' | 'skills' | 'workflows' | 'mcp' | 'contexto' | 'descobrir'
const TABS: { id: Tab; label: string; Icon: typeof Plugin }[] = [
  { id: 'setup', label: 'Meu setup', Icon: Plugin },
  { id: 'skills', label: 'Skills', Icon: Skill },
  { id: 'workflows', label: 'Workflows', Icon: Flow },
  { id: 'mcp', label: 'MCP', Icon: Mcp },
  { id: 'contexto', label: 'Contexto', Icon: Gauge },
  { id: 'descobrir', label: 'Descobrir', Icon: Compass },
]

const KIND_ICON: Record<ProvidedAsset['kind'], typeof Plugin> = {
  skill: Skill,
  command: Command,
  agent: Agent,
  hook: Hook,
  mcp: Mcp,
  workflow: Flow,
}

// tom de "selecionado" consistente: leve tinta coral (nunca "mais escuro")
const selTint = 'color-mix(in oklch, var(--color-accent) 16%, var(--color-surface))'

export default function Panel({
  setup,
  context,
  knownMarketplaces,
  appVersion,
  usage,
  projects,
  activeProject,
}: {
  setup: Setup
  context: { layers: ContextLayer[]; total: number }
  marketplaces: unknown
  knownMarketplaces: Record<string, MarketplaceSource>
  appVersion: string
  usage: UsageMetrics
  projects: { path: string; name: string }[]
  activeProject: string | null
}) {
  const [tab, setTab] = useState<Tab>('setup')

  function go(next: Tab) {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void }
    if (doc.startViewTransition) doc.startViewTransition(() => setTab(next))
    else setTab(next)
  }

  const navBtn = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      active ? 'text-[var(--color-fg)]' : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
    }`

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:flex">
        <div className="px-1 pb-5 pt-1">
          <Hello />
        </div>
        <nav className="flex flex-col gap-1" role="tablist" aria-label="Seções">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => go(id)}
              className={navBtn(tab === id)}
              style={tab === id ? { background: selTint } : undefined}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <UpdateBanner />
          <div className="px-2 pt-1 text-right text-xs text-[var(--color-muted)]">v{appVersion}</div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sm:hidden">
          <header className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
            <Hello />
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] p-2" role="tablist">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => go(id)}
                className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-muted)] aria-selected:text-[var(--color-fg)]"
                style={tab === id ? { background: selTint } : undefined}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <main className="w-full px-6 pb-24 pt-5 lg:px-10">
          <div className="mb-4 flex items-center justify-between gap-2">
            <ScopeSelector projects={projects} active={activeProject} />
            <ProfileMenu setup={setup} knownMarketplaces={knownMarketplaces} />
          </div>

          {tab === 'setup' && (
            <MeuSetup
              setup={setup}
              usage={usage}
              onDiscover={() => go('descobrir')}
              projectDir={activeProject ?? undefined}
            />
          )}
          {tab === 'skills' && <AssetsTab setup={setup} kind="skill" title="Skills" />}
          {tab === 'workflows' && <AssetsTab setup={setup} kind="workflow" title="Workflows" />}
          {tab === 'mcp' && <McpTab setup={setup} />}
          {tab === 'contexto' && <Contexto context={context} />}
          {tab === 'descobrir' && <Descobrir items={discover as Discover[]} />}
        </main>
      </div>
    </div>
  )
}

// ---------------- compartilhados ----------------

function InfoTip({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="inline-grid size-4 shrink-0 cursor-help place-items-center rounded-full border border-[var(--color-border)] text-[10px] font-semibold text-[var(--color-muted)]"
    >
      ?
    </span>
  )
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mb-3 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
    />
  )
}

function AssetIcon({ kind }: { kind: ProvidedAsset['kind'] }) {
  const Icon = KIND_ICON[kind]
  return (
    <span className="text-[var(--color-muted)]">
      <Icon />
    </span>
  )
}

function Empty({ title, hint, action }: { title: string; hint: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="cp-rise rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--color-muted)]">{hint}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)]"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ---------------- Meu setup (home): métricas + plugins ----------------

function MeuSetup({
  setup,
  usage,
  onDiscover,
  projectDir,
}: {
  setup: Setup
  usage: UsageMetrics
  onDiscover: () => void
  projectDir?: string
}) {
  const router = useRouter()
  const [plugins, setPlugins] = useState(setup.plugins)
  const [q, setQ] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPlugins(setup.plugins)
  }, [setup.plugins])

  const active = plugins.filter((p) => p.enabled).length
  const shown = plugins.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))

  function flip(key: string, on: boolean) {
    setError(null)
    setPlugins((prev) => prev.map((p) => (p.key === key ? { ...p, enabled: on } : p)))
    start(async () => {
      const res = await togglePlugin(key, on, projectDir)
      if (!res.ok) {
        setPlugins((prev) => prev.map((p) => (p.key === key ? { ...p, enabled: !on } : p)))
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div>
      <MetricsHeader usage={usage} />

      {plugins.length === 0 ? (
        <Empty
          title="Nenhum plugin ativo ainda"
          hint="Aqui você liga e desliga o que o Claude Code usa. Comece adicionando uma fonte no Descobrir."
          action={{ label: 'Ver o Descobrir', onClick: onDiscover }}
        />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-fg)]">{active}</span> de {plugins.length} plugins ligados
            </p>
          </div>
          <SearchBox value={q} onChange={setQ} placeholder="Buscar plugin…" />
          {error && (
            <div className="mb-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklch, var(--color-danger) 15%, transparent)', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}
          <ul className="cp-stagger space-y-2">
            {shown.map((p) => (
              <PluginCard key={p.key} plugin={p} disabled={pending} onToggle={flip} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function PluginCard({ plugin, disabled, onToggle }: { plugin: PluginRef; disabled: boolean; onToggle: (key: string, on: boolean) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-3 p-3">
        <span className="text-[var(--color-muted)]">
          <Plugin />
        </span>
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={open}>
          <span className="truncate font-medium">{plugin.name}</span>
          <span className="shrink-0 text-xs text-[var(--color-muted)]">{plugin.marketplace} · {plugin.version}</span>
          <span className="ml-auto shrink-0 text-[var(--color-muted)] transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
            <Chevron />
          </span>
        </button>
        <Switch on={plugin.enabled} disabled={disabled} onChange={(on) => onToggle(plugin.key, on)} />
      </div>
      {open && (
        <ul className="border-t border-[var(--color-border)] px-3 py-2">
          {plugin.provides.length === 0 ? (
            <li className="py-1 text-sm text-[var(--color-muted)]">Nada exposto por este plugin.</li>
          ) : (
            plugin.provides.map((a) => <AssetRow key={a.source} ownerKey={plugin.key} asset={a} />)
          )}
        </ul>
      )}
    </li>
  )
}

function Switch({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!on)
      }}
      className="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
      style={{ background: on ? 'var(--color-accent)' : 'var(--color-border)' }}
    >
      <span className="inline-block size-5 rounded-full bg-white shadow transition-transform" style={{ transform: on ? 'translateX(18px)' : 'translateX(2px)' }} />
    </button>
  )
}

// Linha de asset (skill/command/agent/workflow) que expande e mostra o conteúdo do arquivo.
function AssetRow({ ownerKey, asset, badge }: { ownerKey: string; asset: ProvidedAsset; badge?: string }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && content === null) {
      setLoading(true)
      try {
        setContent(await getAssetContent(ownerKey, asset.source))
      } catch {
        setContent('')
      }
      setLoading(false)
    }
  }

  return (
    <li className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <button onClick={toggle} className="flex w-full items-start gap-2 p-3 text-left text-sm" aria-expanded={open}>
        <span className="mt-0.5 shrink-0">
          <AssetIcon kind={asset.kind} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-medium">{asset.name}</span>
          {asset.description && <span className="text-[var(--color-muted)]"> — {asset.description}</span>}
        </span>
        {badge && (
          <span className="shrink-0 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-muted)]">{badge}</span>
        )}
        <span className="mt-0.5 shrink-0 text-[var(--color-muted)] transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
          <Chevron />
        </span>
      </button>
      {open && (
        <pre className="mx-3 mb-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--color-surface-2)] p-3 font-mono text-xs">
          {loading ? 'carregando…' : content || 'sem conteúdo'}
        </pre>
      )}
    </li>
  )
}

// ---------------- Skills / Workflows (mesma estrutura) ----------------

function AssetsTab({ setup, kind, title }: { setup: Setup; kind: ProvidedAsset['kind']; title: string }) {
  const [q, setQ] = useState('')
  const items = useMemo(() => {
    const fromPlugins = setup.plugins
      .filter((p) => p.enabled)
      .flatMap((p) => p.provides.filter((a) => a.kind === kind).map((a) => ({ ...a, from: p.name, ownerKey: p.key })))
    const authored = setup.authored.filter((a) => a.kind === kind).map((a) => ({ ...a, from: 'você', ownerKey: 'authored' }))
    return [...fromPlugins, ...authored]
  }, [setup, kind])

  const shown = items.filter(
    (a) => a.name.toLowerCase().includes(q.toLowerCase()) || (a.description ?? '').toLowerCase().includes(q.toLowerCase()),
  )

  if (items.length === 0) {
    return <Empty title={`Nenhum ${title.toLowerCase()} ativo`} hint={`${title} vêm dos plugins ligados e do que você escreve em ~/.claude. Ligue um plugin ou crie os seus.`} />
  }

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--color-muted)]">{items.length} {title.toLowerCase()} disponíveis</p>
      <SearchBox value={q} onChange={setQ} placeholder={`Buscar ${title.toLowerCase()}…`} />
      <ul className="cp-stagger space-y-2">
        {shown.map((a) => (
          <AssetRow key={`${a.ownerKey}-${a.source}`} ownerKey={a.ownerKey} asset={a} badge={a.from} />
        ))}
      </ul>
    </div>
  )
}

// ---------------- MCP + hooks ----------------

function McpTab({ setup }: { setup: Setup }) {
  if (setup.mcp.length === 0 && setup.hooks.length === 0) {
    return <Empty title="Nenhum MCP ou hook" hint="Servidores MCP (~/.claude.json) e hooks (settings.json) aparecem aqui quando existem." />
  }
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">Servidores MCP</h3>
        {setup.mcp.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Nenhum.</p>
        ) : (
          <ul className="cp-stagger grid gap-2 sm:grid-cols-2">
            {setup.mcp.map((m) => (
              <DetailRow key={m.name} name={m.name} Icon={Mcp} load={() => getMcpDetail(m.name)} />
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">Hooks</h3>
        {setup.hooks.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Nenhum.</p>
        ) : (
          <ul className="cp-stagger grid gap-2 sm:grid-cols-2">
            {setup.hooks.map((h) => (
              <DetailRow key={h.event} name={h.event} Icon={Hook} load={() => getHookDetail(h.event)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// Linha de MCP/hook que expande e mostra a config crua (só leitura). Mesmo padrão do AssetRow.
function DetailRow({ name, Icon, load }: { name: string; Icon: typeof Plugin; load: () => Promise<string> }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && content === null) {
      setLoading(true)
      try {
        setContent(await load())
      } catch {
        setContent('')
      }
      setLoading(false)
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <button onClick={toggle} className="flex w-full items-center gap-2 p-3 text-left" aria-expanded={open}>
        <span className="shrink-0 text-[var(--color-muted)]"><Icon /></span>
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        <span className="shrink-0 text-[var(--color-muted)] transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
          <Chevron />
        </span>
      </button>
      {open && (
        <pre className="mx-3 mb-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--color-surface-2)] p-3 font-mono text-xs">
          {loading ? 'carregando…' : content || 'sem conteúdo'}
        </pre>
      )}
    </li>
  )
}

// ---------------- Contexto ----------------

function Contexto({ context }: { context: { layers: ContextLayer[]; total: number } }) {
  const [open, setOpen] = useState<number | null>(null)
  const max = Math.max(1, ...context.layers.map((l) => l.tokens))
  if (context.layers.length === 0) {
    return <Empty title="Nada no seu contexto ainda" hint="Aqui aparece o que o Claude recebe no prompt (CLAUDE.md, skills, memória) e quanto cada fonte custa em tokens." />
  }
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-muted)]">
          O que o Claude recebe
          <InfoTip text="Só as camadas que você controla por arquivo. Não inclui o system-prompt interno do Claude Code (é do harness)." />
        </h2>
        <span className="text-sm"><span className="font-semibold">~{context.total.toLocaleString('pt-BR')}</span> tokens</span>
      </div>
      <ul className="cp-stagger space-y-2">
        {context.layers.map((l, i) => {
          const isOpen = open === i
          return (
            <li key={`${l.source}-${i}`} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <button
                onClick={() => setOpen((o) => (o === i ? null : i))}
                aria-expanded={isOpen}
                className="w-full p-3 text-left"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{l.label}</span>
                  <span className="ml-auto text-[var(--color-muted)]">~{l.tokens.toLocaleString('pt-BR')}</span>
                  <span className="shrink-0 text-[var(--color-muted)] transition-transform" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>
                    <Chevron />
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${(l.tokens / max) * 100}%` }} />
                </div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3">
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--color-surface-2)] p-3 font-mono text-xs">
                    {l.content || 'sem conteúdo'}
                  </pre>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------- Descobrir: carrosséis por categoria ----------------

function Descobrir({ items }: { items: Discover[] }) {
  const categories = useMemo(() => {
    const map = new Map<string, Discover[]>()
    for (const it of items) {
      const arr = map.get(it.category) ?? []
      arr.push(it)
      map.set(it.category, arr)
    }
    return [...map.entries()]
  }, [items])

  return (
    <div className="space-y-6">
      {categories.map(([cat, list]) => (
        <section key={cat}>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">{cat}</h3>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
            {list.map((m) => (
              <DiscoverCard key={m.name} m={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function DiscoverCard({ m }: { m: Discover }) {
  const [copied, setCopied] = useState(false)
  const cmd = m.repo ? `claude plugin marketplace add ${m.repo}` : null
  return (
    <article className="flex w-64 shrink-0 snap-start flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--color-muted)]">{m.kind}</span>
        <h4 className="truncate font-semibold">{m.name}</h4>
      </div>
      <p className="mt-2 flex-1 text-sm text-[var(--color-muted)]">{m.description}</p>
      <div className="mt-3 flex items-center gap-2">
        <a href={m.url} target="_blank" rel="noreferrer" className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-[var(--color-accent-fg)]">Abrir</a>
        {cmd && (
          <button
            onClick={() => {
              navigator.clipboard?.writeText(cmd)
              setCopied(true)
              setTimeout(() => setCopied(false), 1200)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs font-medium"
          >
            {copied ? (<><Check /> copiado</>) : 'copiar comando'}
          </button>
        )}
      </div>
    </article>
  )
}

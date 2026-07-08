import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
import { resolveClaudePaths, type ClaudePaths } from './paths'
import { FsConfigStore } from './fs-config-store'
import { scanPlugins, type InstalledFile } from './plugin-scanner'
import { computeContextLayers, totalTokens } from '../core/context'
import type {
  ContextLayer,
  HookRef,
  MarketplaceSource,
  McpRef,
  ProvidedAsset,
  Setup,
} from '../core/types'

// Adapter "host": resolve a máquina do usuário e monta as visões do domínio.
// Só roda no servidor (fs). O core continua puro.

export function hostPaths(): ClaudePaths {
  return resolveClaudePaths(os.homedir())
}
export function makeStore(): FsConfigStore {
  return new FsConfigStore(hostPaths())
}

async function readText(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, 'utf8')
  } catch {
    return null
  }
}
async function listDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}
function parseFm(raw: string): { name?: string; description?: string } {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!m) return {}
  // js-yaml v4 load() é seguro por padrão (DEFAULT_SCHEMA).
  const fm = yaml.load(m[1]) as Record<string, unknown> | null
  return {
    name: typeof fm?.name === 'string' ? fm.name : undefined,
    description: typeof fm?.description === 'string' ? fm.description : undefined,
  }
}

async function readAuthored(p: ClaudePaths): Promise<ProvidedAsset[]> {
  const out: ProvidedAsset[] = []
  for (const e of await listDir(p.authoredDirs.skills)) {
    const raw = await readText(path.join(p.authoredDirs.skills, e, 'SKILL.md'))
    const fm = raw ? parseFm(raw) : {}
    out.push({ kind: 'skill', name: fm.name ?? e, description: fm.description, source: `skills/${e}` })
  }
  for (const [sub, kind] of [
    ['commands', 'command'],
    ['agents', 'agent'],
  ] as const) {
    for (const e of await listDir(p.authoredDirs[sub])) {
      if (!e.endsWith('.md')) continue
      const raw = await readText(path.join(p.authoredDirs[sub], e))
      const fm = raw ? parseFm(raw) : {}
      out.push({ kind, name: fm.name ?? e.replace(/\.md$/, ''), description: fm.description, source: `${sub}/${e}` })
    }
  }
  return out
}

export async function getSetup(): Promise<Setup> {
  const store = makeStore()
  const [settings, installed, claudeJson] = await Promise.all([
    store.readSettings(),
    store.readInstalledPlugins(),
    store.readClaudeJson(),
  ])
  const enabled = (settings.data.enabledPlugins ?? {}) as Record<string, boolean>
  const plugins = await scanPlugins(installed.data as InstalledFile, enabled)
  const authored = await readAuthored(hostPaths())
  const mcp: McpRef[] = Object.keys(
    (claudeJson.data.mcpServers ?? {}) as Record<string, unknown>,
  ).map((name) => ({ name, scope: 'user' }))
  const hooks: HookRef[] = Object.keys(
    (settings.data.hooks ?? {}) as Record<string, unknown>,
  ).map((event) => ({ event, scope: 'user' }))
  return { plugins, authored, mcp, hooks }
}

export async function getContextView(): Promise<{ layers: ContextLayer[]; total: number }> {
  const setup = await getSetup()
  const claudeMd: { label: string; scope: 'global' | 'user' | 'project'; text: string }[] = []
  const globalMd = await readText(path.join(os.homedir(), '.claude', 'CLAUDE.md'))
  if (globalMd) claudeMd.push({ label: 'CLAUDE.md global (~/.claude)', scope: 'global', text: globalMd })

  const skills = [
    ...setup.plugins.filter((p) => p.enabled).flatMap((p) => p.provides.filter((a) => a.kind === 'skill')),
    ...setup.authored.filter((a) => a.kind === 'skill'),
  ]
  const layers = computeContextLayers({ claudeMd, skills })
  return { layers, total: totalTokens(layers) }
}

/** Marketplaces já conhecidos (nome → fonte git), pra montar/planejar bundles. */
export async function getKnownMarketplaces(): Promise<Record<string, MarketplaceSource>> {
  const store = makeStore()
  const km = await store.readKnownMarketplaces()
  const out: Record<string, MarketplaceSource> = {}
  for (const [name, v] of Object.entries(km.data as Record<string, { source?: MarketplaceSource }>)) {
    if (v?.source) out[name] = v.source
  }
  return out
}

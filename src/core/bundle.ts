import { z } from 'zod'
import type { Bundle, BundledAsset, MarketplaceSource, Setup } from './types'

// ---------- Schemas (validação de input não confiável) ----------

const MarketplaceSourceSchema = z.object({
  source: z.enum(['github', 'url']),
  repo: z.string().optional(),
  url: z.string().optional(),
})

const BundledAssetSchema = z.object({
  kind: z.enum(['skill', 'command', 'agent', 'hook', 'mcp']),
  relPath: z.string(),
  content: z.string(),
})

export const BundleSchema = z.object({
  version: z.literal(1),
  createdWith: z.string(),
  marketplaces: z.record(MarketplaceSourceSchema),
  enabledPlugins: z.record(z.boolean()),
  authored: z.array(BundledAssetSchema),
})

/** Valida um bundle vindo de fora (arquivo de amigo). Lança ZodError se inválido. */
export function validateBundle(input: unknown): Bundle {
  return BundleSchema.parse(input) as Bundle
}

// ---------- Build ----------

export interface BundleSelection {
  pluginKeys: string[]
  authored: BundledAsset[]
}

export function buildBundle(
  marketplaces: Record<string, MarketplaceSource>,
  enabledPlugins: Record<string, boolean>,
  selection: BundleSelection,
  createdWith = 'co-panel@0.1.0',
): Bundle {
  const chosenPlugins: Record<string, boolean> = {}
  const chosenMarkets: Record<string, MarketplaceSource> = {}
  for (const key of selection.pluginKeys) {
    chosenPlugins[key] = enabledPlugins[key] ?? true
    const mp = key.split('@')[1]
    if (mp && marketplaces[mp]) chosenMarkets[mp] = marketplaces[mp]
  }
  return {
    version: 1,
    createdWith,
    marketplaces: chosenMarkets,
    enabledPlugins: chosenPlugins,
    authored: selection.authored,
  }
}

// ---------- Import (segurança: hooks/mcp nunca aplicam sozinhos) ----------

/** Rejeita caminho absoluto ou com `..` (path traversal), cross-platform. */
export function isSafeRelPath(p: string): boolean {
  if (!p) return false
  if (p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p)) return false
  return !p.split(/[\\/]/).includes('..')
}

export interface ImportPlan {
  marketplacesToAdd: { name: string; source: MarketplaceSource }[]
  pluginsToEnable: string[]
  authoredToCopy: BundledAsset[]
  /** Execução de comando arbitrário — só entra com confirmação explícita do usuário. */
  risky: { hooks: BundledAsset[]; mcp: BundledAsset[] }
  rejected: { relPath: string; reason: string }[]
}

export function planImport(
  bundle: Bundle,
  current: Setup,
  currentMarketplaces: Record<string, MarketplaceSource>,
): ImportPlan {
  const marketplacesToAdd = Object.entries(bundle.marketplaces)
    .filter(([name]) => !currentMarketplaces[name])
    .map(([name, source]) => ({ name, source }))

  const alreadyEnabled = new Set(current.plugins.filter((p) => p.enabled).map((p) => p.key))
  const pluginsToEnable = Object.entries(bundle.enabledPlugins)
    .filter(([, on]) => on)
    .map(([key]) => key)
    .filter((key) => !alreadyEnabled.has(key))

  const authoredToCopy: BundledAsset[] = []
  const risky = { hooks: [] as BundledAsset[], mcp: [] as BundledAsset[] }
  const rejected: { relPath: string; reason: string }[] = []

  for (const a of bundle.authored) {
    if (!isSafeRelPath(a.relPath)) {
      rejected.push({ relPath: a.relPath, reason: 'caminho inseguro (absoluto ou com "..")' })
      continue
    }
    if (a.kind === 'hook') risky.hooks.push(a)
    else if (a.kind === 'mcp') risky.mcp.push(a)
    else authoredToCopy.push(a)
  }

  return { marketplacesToAdd, pluginsToEnable, authoredToCopy, risky, rejected }
}

// Modelo de domínio do co-panel. Puro: sem fs, sem Next.

export type Scope = 'user' | 'project'
export type AssetKind = 'skill' | 'command' | 'agent' | 'hook' | 'mcp' | 'workflow'

/** Uma capacidade que um plugin traz, ou que o usuário escreveu. */
export interface ProvidedAsset {
  kind: AssetKind
  name: string
  description?: string
  source: string // caminho relativo de origem (exibição/debug)
}

/** Um plugin instalado, com o que ele fornece e se está ligado. */
export interface PluginRef {
  key: string // "superpowers@claude-plugins-official"
  name: string // "superpowers"
  marketplace: string // "claude-plugins-official"
  version: string
  enabled: boolean
  scope: Scope
  provides: ProvidedAsset[]
}

export interface McpRef {
  name: string
  scope: Scope
}
export interface HookRef {
  event: string
  scope: Scope
}

/** Visão unificada "o que está ativo". */
export interface Setup {
  plugins: PluginRef[]
  authored: ProvidedAsset[] // skills/commands/agents/workflows do próprio usuário
  mcp: McpRef[]
  hooks: HookRef[]
}

/** Uma camada do contexto que o Claude recebe, com gasto estimado. */
export interface ContextLayer {
  source:
    | 'claude-md'
    | 'memory'
    | 'skills'
    | 'plugin-instructions'
    | 'mcp-instructions'
    | 'hooks'
    | 'agents'
  label: string
  scope: Scope | 'global'
  tokens: number
  detail?: string
  content?: string
}

export interface MarketplaceSource {
  source: 'github' | 'url'
  repo?: string
  url?: string
}

/** Um asset autoral empacotado num bundle (o conteúdo viaja junto). */
export interface BundledAsset {
  kind: AssetKind
  relPath: string // relativo, sanitizado (sem '..')
  content: string
}

/** Pacote compartilhável entre amigos. */
export interface Bundle {
  version: 1
  createdWith: string // "co-panel@0.1.0"
  marketplaces: Record<string, MarketplaceSource>
  enabledPlugins: Record<string, boolean>
  authored: BundledAsset[]
}

// Porta de persistência da config do Claude Code. Adapters implementam;
// o resto do app depende só desta interface (nunca do fs direto).

export interface LoadedJson<T = Record<string, unknown>> {
  data: T
  mtimeMs: number
  exists: boolean
}

/** Lançado quando o arquivo mudou fora do co-panel desde a leitura (evita clobber). */
export class ExternalChangeError extends Error {
  constructor(public readonly file: string) {
    super(`O arquivo mudou fora do co-panel desde a leitura: ${file}`)
    this.name = 'ExternalChangeError'
  }
}

export interface ConfigStore {
  readSettings(): Promise<LoadedJson>
  readClaudeJson(): Promise<LoadedJson>
  readKnownMarketplaces(): Promise<LoadedJson>
  readInstalledPlugins(): Promise<LoadedJson>

  /** Grava o settings.json inteiro (já modificado pelo core, com as chaves preservadas). */
  writeSettings(next: Record<string, unknown>, expectMtimeMs: number): Promise<void>

  /** Patch cirúrgico no ~/.claude.json (lê fresco, aplica `mutate`, grava com segurança). */
  patchClaudeJson(
    mutate: (data: Record<string, unknown>) => Record<string, unknown>,
    expectMtimeMs: number,
  ): Promise<void>
}

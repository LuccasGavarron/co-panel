import fs from 'node:fs/promises'
import type { ClaudePaths } from './paths'
import {
  type ConfigStore,
  type LoadedJson,
  ExternalChangeError,
} from '../ports/config-store'

async function readJson(file: string): Promise<LoadedJson> {
  try {
    const [raw, stat] = await Promise.all([fs.readFile(file, 'utf8'), fs.stat(file)])
    return { data: JSON.parse(raw) as Record<string, unknown>, mtimeMs: stat.mtimeMs, exists: true }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return { data: {}, mtimeMs: 0, exists: false }
    }
    throw e
  }
}

/**
 * Escrita segura: valida (round-trip), recusa se mudou fora (mtime), faz backup
 * timestamped e grava atômico (temp + rename). Preserva o que veio em `next`.
 */
async function writeJsonSafe(file: string, next: unknown, expectMtimeMs: number): Promise<void> {
  const serialized = JSON.stringify(next, null, 2) + '\n'
  JSON.parse(serialized) // valida; lança se inválido

  let currentMtime = 0
  try {
    currentMtime = (await fs.stat(file)).mtimeMs
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
  }
  if (currentMtime !== expectMtimeMs) throw new ExternalChangeError(file)

  const ts = Date.now()
  if (currentMtime !== 0) {
    await fs.copyFile(file, `${file}.bak.${ts}`)
  }
  const tmp = `${file}.tmp.${ts}`
  await fs.writeFile(tmp, serialized, 'utf8')
  await fs.rename(tmp, file)
}

/** Implementação sobre o filesystem real. */
export class FsConfigStore implements ConfigStore {
  constructor(private readonly paths: ClaudePaths) {}

  readSettings() {
    return readJson(this.paths.settings)
  }
  readClaudeJson() {
    return readJson(this.paths.claudeJson)
  }
  readKnownMarketplaces() {
    return readJson(this.paths.knownMarketplaces)
  }
  readInstalledPlugins() {
    return readJson(this.paths.installedPlugins)
  }

  writeSettings(next: Record<string, unknown>, expectMtimeMs: number) {
    return writeJsonSafe(this.paths.settings, next, expectMtimeMs)
  }

  async patchClaudeJson(
    mutate: (data: Record<string, unknown>) => Record<string, unknown>,
    expectMtimeMs: number,
  ) {
    const cur = await readJson(this.paths.claudeJson)
    if (cur.mtimeMs !== expectMtimeMs) throw new ExternalChangeError(this.paths.claudeJson)
    const next = mutate(structuredClone(cur.data))
    return writeJsonSafe(this.paths.claudeJson, next, cur.mtimeMs)
  }
}

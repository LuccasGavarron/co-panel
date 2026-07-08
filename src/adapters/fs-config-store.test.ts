import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { resolveClaudePaths } from './paths'
import { FsConfigStore } from './fs-config-store'
import { ExternalChangeError } from '../ports/config-store'

let home: string
beforeEach(async () => {
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'copanel-'))
  await fs.mkdir(path.join(home, '.claude', 'plugins'), { recursive: true })
})
afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true })
})
function store() {
  return new FsConfigStore(resolveClaudePaths(home))
}

describe('FsConfigStore', () => {
  it('lê settings existentes com mtime', async () => {
    const p = resolveClaudePaths(home)
    await fs.writeFile(p.settings, JSON.stringify({ enabledPlugins: { 'a@mp': true } }))
    const loaded = await store().readSettings()
    expect(loaded.exists).toBe(true)
    expect(loaded.data.enabledPlugins).toEqual({ 'a@mp': true })
    expect(loaded.mtimeMs).toBeGreaterThan(0)
  })

  it('arquivo ausente → exists:false e data vazio', async () => {
    const loaded = await store().readSettings()
    expect(loaded.exists).toBe(false)
    expect(loaded.data).toEqual({})
    expect(loaded.mtimeMs).toBe(0)
  })

  it('escreve com backup, atômico, preservando as demais chaves', async () => {
    const p = resolveClaudePaths(home)
    const original = { permissions: { allow: ['x'] }, enabledPlugins: { 'a@mp': true } }
    await fs.writeFile(p.settings, JSON.stringify(original, null, 2))
    const loaded = await store().readSettings()

    const next = { ...loaded.data, enabledPlugins: { 'a@mp': false } }
    await store().writeSettings(next, loaded.mtimeMs)

    const after = JSON.parse(await fs.readFile(p.settings, 'utf8'))
    expect(after.enabledPlugins).toEqual({ 'a@mp': false })
    expect(after.permissions).toEqual({ allow: ['x'] })

    const files = await fs.readdir(path.dirname(p.settings))
    expect(files.some((f) => f.startsWith('settings.json.bak.'))).toBe(true)
  })

  it('recusa a escrita se o arquivo mudou fora (mtime divergente)', async () => {
    const p = resolveClaudePaths(home)
    await fs.writeFile(p.settings, JSON.stringify({ enabledPlugins: {} }, null, 2))
    const loaded = await store().readSettings()

    await new Promise((r) => setTimeout(r, 15))
    await fs.writeFile(p.settings, JSON.stringify({ enabledPlugins: { x: true } }, null, 2))

    await expect(
      store().writeSettings({ enabledPlugins: {} }, loaded.mtimeMs),
    ).rejects.toBeInstanceOf(ExternalChangeError)
  })
})

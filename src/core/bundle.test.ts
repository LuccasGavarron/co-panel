import { describe, it, expect } from 'vitest'
import { buildBundle, validateBundle, planImport, isSafeRelPath } from './bundle'
import type { Bundle, MarketplaceSource, Setup } from './types'

const markets: Record<string, MarketplaceSource> = {
  mp: { source: 'github', repo: 'u/mp' },
  outra: { source: 'github', repo: 'u/outra' },
}

describe('buildBundle', () => {
  it('inclui só os plugins escolhidos e os marketplaces deles', () => {
    const b = buildBundle(markets, { 'a@mp': true, 'z@outra': true }, {
      pluginKeys: ['a@mp'],
      authored: [],
    })
    expect(b.enabledPlugins).toEqual({ 'a@mp': true })
    expect(b.marketplaces).toEqual({ mp: markets.mp })
    expect(b.version).toBe(1)
  })
})

describe('validateBundle', () => {
  it('faz round-trip de um bundle válido', () => {
    const b = buildBundle(markets, { 'a@mp': true }, { pluginKeys: ['a@mp'], authored: [] })
    const clone = JSON.parse(JSON.stringify(b))
    expect(validateBundle(clone)).toEqual(b)
  })
  it('rejeita input inválido', () => {
    expect(() => validateBundle({ foo: 'bar' })).toThrow()
    expect(() => validateBundle({ version: 2, marketplaces: {}, enabledPlugins: {}, authored: [], createdWith: 'x' })).toThrow()
  })
})

describe('isSafeRelPath', () => {
  it('aceita relativo simples', () => {
    expect(isSafeRelPath('skills/foo/SKILL.md')).toBe(true)
  })
  it('rejeita traversal e absoluto', () => {
    expect(isSafeRelPath('../etc/passwd')).toBe(false)
    expect(isSafeRelPath('skills/../../x')).toBe(false)
    expect(isSafeRelPath('/etc/passwd')).toBe(false)
    expect(isSafeRelPath('C:\\Windows\\x')).toBe(false)
    expect(isSafeRelPath('')).toBe(false)
  })
})

describe('planImport', () => {
  const current: Setup = {
    plugins: [
      { key: 'ja@mp', name: 'ja', marketplace: 'mp', version: '1', enabled: true, scope: 'user', provides: [] },
    ],
    authored: [],
    mcp: [],
    hooks: [],
  }

  it('separa hooks/mcp como risky e nunca auto-aplica; barra path traversal', () => {
    const bundle: Bundle = {
      version: 1,
      createdWith: 'co-panel@0.1.0',
      marketplaces: { nova: { source: 'github', repo: 'u/nova' } },
      enabledPlugins: { 'ja@mp': true, 'novo@nova': true },
      authored: [
        { kind: 'skill', relPath: 'skills/ok/SKILL.md', content: '---\nname: ok\n---' },
        { kind: 'hook', relPath: 'hooks/run.sh', content: 'echo perigo' },
        { kind: 'mcp', relPath: 'mcp/srv.json', content: '{}' },
        { kind: 'skill', relPath: '../fora.md', content: 'x' },
      ],
    }
    const plan = planImport(bundle, current, markets)

    expect(plan.marketplacesToAdd).toEqual([{ name: 'nova', source: { source: 'github', repo: 'u/nova' } }])
    expect(plan.pluginsToEnable).toEqual(['novo@nova']) // 'ja@mp' já está ligado
    expect(plan.authoredToCopy.map((a) => a.relPath)).toEqual(['skills/ok/SKILL.md'])
    expect(plan.risky.hooks).toHaveLength(1)
    expect(plan.risky.mcp).toHaveLength(1)
    expect(plan.rejected.map((r) => r.relPath)).toEqual(['../fora.md'])
  })
})

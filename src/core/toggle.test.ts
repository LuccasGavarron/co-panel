import { describe, it, expect } from 'vitest'
import { setPluginEnabled } from './toggle'

describe('setPluginEnabled', () => {
  const base = {
    permissions: { allow: ['Bash(git *)'] },
    model: 'opus',
    enabledPlugins: { 'a@mp': true, 'b@mp': false },
    hooks: { UserPromptSubmit: [{ hooks: [] }] },
    chaveDesconhecida: 42,
  }

  it('desliga um plugin sem tocar nas outras chaves', () => {
    const out = setPluginEnabled(base, 'a@mp', false)
    expect(out.enabledPlugins['a@mp']).toBe(false)
    expect(out.enabledPlugins['b@mp']).toBe(false)
    expect(out.permissions).toEqual(base.permissions)
    expect(out.hooks).toEqual(base.hooks)
    expect(out.chaveDesconhecida).toBe(42)
  })

  it('liga um plugin novo sem apagar os existentes', () => {
    const out = setPluginEnabled(base, 'c@mp', true)
    expect(out.enabledPlugins).toEqual({ 'a@mp': true, 'b@mp': false, 'c@mp': true })
  })

  it('não muta o objeto original', () => {
    setPluginEnabled(base, 'a@mp', false)
    expect(base.enabledPlugins['a@mp']).toBe(true)
  })

  it('cria enabledPlugins se ainda não existir', () => {
    const out = setPluginEnabled({ model: 'x' } as Record<string, unknown>, 'a@mp', true)
    expect((out.enabledPlugins as Record<string, boolean>)['a@mp']).toBe(true)
  })
})

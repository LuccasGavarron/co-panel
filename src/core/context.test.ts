import { describe, it, expect } from 'vitest'
import { computeContextLayers, totalTokens } from './context'
import type { ProvidedAsset } from './types'

describe('computeContextLayers', () => {
  it('gera uma camada por CLAUDE.md, na ordem de precedência, com tokens ceil(len/4)', () => {
    const layers = computeContextLayers({
      claudeMd: [
        { label: 'global', scope: 'global', text: 'x'.repeat(400) }, // 100 tokens
        { label: 'projeto', scope: 'project', text: 'y'.repeat(40) }, // 10 tokens
      ],
      skills: [],
    })
    expect(layers.map((l) => l.label)).toEqual(['global', 'projeto'])
    expect(layers[0].tokens).toBe(100)
    expect(layers[1].tokens).toBe(10)
  })

  it('agrega skills numa camada só (nome + descrição)', () => {
    const skills: ProvidedAsset[] = [
      { kind: 'skill', name: 'a', description: 'faz a', source: 's/a' },
      { kind: 'skill', name: 'b', description: 'faz b', source: 's/b' },
    ]
    const layers = computeContextLayers({ claudeMd: [], skills })
    const s = layers.find((l) => l.source === 'skills')
    expect(s?.label).toBe('2 skills disponíveis')
    expect(s?.tokens).toBeGreaterThan(0)
  })

  it('sem skills não cria camada de skills', () => {
    const layers = computeContextLayers({ claudeMd: [], skills: [] })
    expect(layers.find((l) => l.source === 'skills')).toBeUndefined()
  })

  it('totalTokens soma tudo', () => {
    const layers = computeContextLayers({
      claudeMd: [{ label: 'g', scope: 'global', text: 'x'.repeat(400) }],
      memory: { label: 'mem', text: 'z'.repeat(40) },
      skills: [],
    })
    expect(totalTokens(layers)).toBe(110)
  })
})

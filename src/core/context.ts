import type { ContextLayer, ProvidedAsset, Scope } from './types'
import { estimateTokens } from './tokens'

// Monta as camadas de contexto que o Claude recebe (as que o usuário controla por
// arquivo), cada uma com gasto de tokens. Puro: recebe os textos já lidos.

export interface ContextInputs {
  claudeMd: { label: string; scope: Scope | 'global'; text: string }[]
  memory?: { label: string; text: string }
  skills: ProvidedAsset[]
  pluginInstructions?: { label: string; text: string }[]
  mcpInstructions?: { label: string; text: string }[]
  hooks?: { label: string; text: string }[]
}

export function computeContextLayers(inp: ContextInputs): ContextLayer[] {
  const layers: ContextLayer[] = []

  // Precedência: a ordem em que claudeMd[] chega já é a de precedência (global→projeto→...).
  for (const c of inp.claudeMd) {
    layers.push({ source: 'claude-md', label: c.label, scope: c.scope, tokens: estimateTokens(c.text) })
  }
  if (inp.memory) {
    layers.push({ source: 'memory', label: inp.memory.label, scope: 'global', tokens: estimateTokens(inp.memory.text) })
  }
  if (inp.skills.length) {
    const text = inp.skills.map((s) => `${s.name}: ${s.description ?? ''}`).join('\n')
    layers.push({
      source: 'skills',
      label: `${inp.skills.length} skills disponíveis`,
      scope: 'global',
      tokens: estimateTokens(text),
      detail: 'nome + descrição de cada skill',
    })
  }
  for (const p of inp.pluginInstructions ?? []) {
    layers.push({ source: 'plugin-instructions', label: p.label, scope: 'global', tokens: estimateTokens(p.text) })
  }
  for (const m of inp.mcpInstructions ?? []) {
    layers.push({ source: 'mcp-instructions', label: m.label, scope: 'global', tokens: estimateTokens(m.text) })
  }
  for (const h of inp.hooks ?? []) {
    layers.push({ source: 'hooks', label: h.label, scope: 'global', tokens: estimateTokens(h.text) })
  }
  return layers
}

export function totalTokens(layers: ContextLayer[]): number {
  return layers.reduce((sum, l) => sum + l.tokens, 0)
}

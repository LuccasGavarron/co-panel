import { describe, it, expect } from 'vitest'
import { estimateTokens } from './tokens'

describe('estimateTokens', () => {
  it('texto vazio = 0 tokens', () => expect(estimateTokens('')).toBe(0))
  it('400 chars = 100 tokens', () => expect(estimateTokens('x'.repeat(400))).toBe(100))
  it('arredonda pra cima', () => expect(estimateTokens('abc')).toBe(1))
})

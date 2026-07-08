// Estimativa barata de tokens (~4 chars/token). Suficiente pro "gasto" da aba Contexto.
// ponytail: heurística chars/4; trocar por tokenizer real só se a estimativa doer na prática.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

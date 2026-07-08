# co-panel — convenções do projeto

> Painel **local** (sem servidor/nuvem/login) pra ver, ligar/desligar e compartilhar o setup do
> Claude Code. Stack: Next 16 (App Router) · React 19 · Tailwind v4 · TS · Vitest · Zod.
> Fonte da verdade do design: `docs/superpowers/specs/2026-07-08-co-panel-design.md`.

## Arquitetura (hexagonal — não-negociável)

- **`src/core/`** — domínio **puro**, sem `fs`/Next. Regras de toggle, bundle, contexto. Testável
  sem tocar disco. É o coração; é onde a qualidade se prova.
- **`src/ports/`** — interfaces (ex.: `ConfigStore`). Adapters implementam.
- **`src/adapters/`** — implementações sobre o mundo real: filesystem, git, scan de plugins.
  Toda escrita passa por aqui, com backup + atômico + validação.
- **`src/app/`** — Next **fino**. Server actions só chamam casos de uso; não contêm regra.

Onde **não** abstrair: sem camada de "verticais" (é um produto só); sem porta com uma
implementação só, a não ser que pague em teste/segurança (`ConfigStore` paga).

## Escrita em arquivos do Claude Code — SEMPRE seguro

Isto escreve na config real do usuário. Regras inegociáveis:

1. **Backup timestamped** antes de toda escrita (`arquivo.json.bak.<ts>`).
2. **Escrita atômica**: grava em temp e faz `rename`.
3. **Valida** o JSON (parse + round-trip) antes de sobrescrever.
4. **Preserva chaves desconhecidas**: patch só da chave-alvo. Nunca dropar `permissions`, etc.
   `~/.claude.json` **nunca** é reescrito inteiro.
5. **Detecção de mudança externa**: compara `mtime` do load com o atual; divergiu → não grava,
   avisa (`ExternalChangeError`).
6. **Escopo explícito** (user/projeto) — nunca editar o errado em silêncio.

## Segurança de bundle (input não confiável)

`hooks` e `mcpServers` de um bundle importado são **execução de comando arbitrário**. Nunca
aplicar automático: revisão item a item com confirmação. Validar schema (Zod); barrar path
traversal ao copiar assets.

## UI / UX / Movimento

- **Sem emoji, nunca.** Ícones SVG do pack (`components/icons.tsx`), stroke 2, monocromáticos.
- **Dark-first**, OKLCH, tokens no `@theme`. Tipografia forte; respiro generoso.
- **Só anime `transform`/`opacity`.** `prefers-reduced-motion` sempre. Curva
  `cubic-bezier(0.22,1,0.36,1)`; micro 120–200ms, entrada 200–320ms; nada > 400ms.
- **shadcn/ui (Radix)** pros primitivos; movimento nativo (View Transitions / Web Animations);
  `motion` **só** se um efeito for inviável nativo.
- **Cross-platform:** `os.homedir()` + `path.join`; nunca hardcode caminho.

## Testes

`src/**/*.test.ts` com Vitest. Core e adapters cobertos por fixtures. `npm test` verde antes de
"pronto". Verificação sem navegador: `npm run build` + `npm run typecheck` + `npm test`.

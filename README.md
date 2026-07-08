# co-panel

**Veja, gerencie e compartilhe seu setup do Claude Code — num painel local, sem nuvem.**

O Claude Code guarda plugins, skills, slash commands, subagents, servidores MCP e hooks
espalhados em vários arquivos JSON. Fica difícil saber **o que está ligado**, **o que cada coisa
faz** e **como levar seu setup pra outro PC ou pra um amigo**. O co-panel resolve isso numa
interface só — que roda na sua máquina, lê e escreve sua config com segurança, e **nunca** manda
nada pra internet.

> _(GIF/screenshot aqui — rode e capture a home.)_

## O que faz

Quatro abas:

- **Meu setup** — tudo que está ativo, agrupado por plugin, com **liga/desliga** de um toque.
- **Contexto** — o que o Claude realmente recebe no prompt (CLAUDE.md, skills, memória…), com o
  **gasto de tokens** por fonte. Você vê onde o contexto está sendo gasto e corta o que não usa.
- **Bundle** — **exporta** seu setup num arquivo e **importa** o de um amigo. Nada é aplicado sem
  você revisar.
- **Descobrir** — diretório curado das melhores fontes de plugins, skills e design systems
  (inclui [getdesign.md](https://getdesign.md)).

## Como abrir

**Clique 2x** em `scripts/Abrir co-panel.command` (mac) ou `scripts/Abrir co-panel.bat` (Windows).
Na primeira vez ele se prepara sozinho (instala e builda); depois abre direto no navegador em
`http://localhost:4571`. Sem terminal no dia a dia.

Precisa ter o [Node.js](https://nodejs.org) instalado.

## Compartilhar com amigos

Um **bundle** é um `.json`. Plugins viajam como *fonte git + flag* (o amigo reinstala do repo);
o que **você** escreveu (skills/commands/agents) viaja como *arquivos*. Exporte na aba Bundle,
mande o arquivo, o amigo importa.

## Segurança

Isto escreve na sua config real, então:

- **Backup timestamped** + **escrita atômica** + validação antes de sobrescrever.
- **Preserva** as chaves que não gerencia (nunca apaga `permissions`, etc.).
- **Detecta mudança externa** (se o Claude Code editou o arquivo, não sobrescreve — avisa).
- **Hooks e MCP de um bundle importado NUNCA são aplicados automaticamente** — são execução de
  comando na sua máquina, então exigem revisão explícita.

## Atualizar

Como roda de um clone git, o co-panel avisa quando há **versão nova** (faixa no topo, estilo app
desktop). Atualizar é um comando: `git pull && npm install && npm run build`.

## Arquitetura

Hexagonal, testável:

- `src/core/` — domínio **puro** (toggle, bundle, contexto, tokens). Sem `fs`. É onde os testes
  vivem.
- `src/ports/` — interfaces (`ConfigStore`).
- `src/adapters/` — filesystem, scan de plugins, git. Toda escrita passa por aqui.
- `src/app/` — Next fino (server actions chamam casos de uso).

## Stack

Next 16 · React 19 · Tailwind v4 (OKLCH) · TypeScript · Zod · Vitest.

## Dev

```bash
npm install
npm run dev        # http://localhost:4571
npm test           # domínio + adapters (Vitest)
npm run build      # build de produção
npm run typecheck  # tsc --noEmit
```

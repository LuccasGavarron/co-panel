# co-panel MVP — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (execução inline, o
> próprio autor executa nesta sessão AFK, com self-review por task). Steps em checkbox.

**Goal:** Painel local (Next) que lê/escreve a config do Claude Code, mostra o que está ativo,
liga/desliga com segurança, mostra o contexto que o Claude recebe (com gasto de tokens), e
exporta/importa bundles pra compartilhar — cross-platform mac/Windows.

**Architecture:** Hexagonal. `core/` domínio puro (sem fs) e testável; `ports/` interfaces;
`adapters/` implementações sobre o filesystem real (com backup/atômico/validação); `app/` Next
fino (server actions chamam casos de uso). Fonte da verdade: spec
`docs/superpowers/specs/2026-07-08-co-panel-design.md`.

**Tech Stack:** Next 16 (App Router) · React 19 · Tailwind v4 (OKLCH, tokens `@theme`) · TS ·
Zod · Vitest · shadcn/ui (Radix) + View Transitions/Web Animations nativas.

## Global Constraints (copiadas da spec — valem pra TODA task)

- **Cross-platform:** `os.homedir()` + `path.join`; nunca hardcode `/Users/...`. Scripts por SO.
- **Escrita segura (SEMPRE):** escrita atômica (temp + `rename`), **backup timestamped antes de
  toda escrita**, validação JSON + round-trip antes de sobrescrever, **preservar chaves
  desconhecidas** (patch só da chave-alvo), `~/.claude.json` nunca reescrito inteiro,
  **detecção de mudança externa** (recarrega e compara antes de gravar).
- **Segurança de bundle:** `hooks`/`mcpServers` importados **nunca aplicam sozinhos** — revisão
  item a item com confirmação explícita; validar schema (Zod); barrar path traversal ao copiar
  assets.
- **Escopo sempre rotulado** (user/projeto); nunca editar o errado em silêncio.
- **UI:** sem emoji (ícones SVG do pack); só `transform`/`opacity`; `prefers-reduced-motion`
  sempre; dark-first; curva `cubic-bezier(0.22,1,0.36,1)`; nada > 400ms. shadcn/ui pros
  primitivos; `motion` só se um efeito for inviável nativo.

## File Structure (decomposição)

```
src/core/           domínio puro, sem fs — 1 responsabilidade por arquivo
  types.ts          modelos: Scope, SetupItem, PluginRef, ProvidedAsset, ContextLayer, Bundle
  tokens.ts         estimateTokens(text): number = ceil(len/4)
  toggle.ts         setPluginEnabled(settings, key, on): Settings (preserva chaves)
  bundle.ts         buildBundle / validateBundle (Zod) / planImport
  context.ts        computeContextLayers(inputs): ContextLayer[]
src/ports/
  config-store.ts   interface ConfigStore (read/write settings, claude.json, marketplaces)
src/adapters/
  paths.ts          resolveClaudePaths(homedir, cwd?) — cross-platform
  fs-config-store.ts FsConfigStore implements ConfigStore (backup/atômico/validate/extchange)
  plugin-scanner.ts scanPlugins(paths) -> PluginRef[] com ProvidedAsset[] (lê frontmatter)
  updater.ts        checkForUpdate(dir) / applyUpdate(dir) via git (child_process)
src/app/
  globals.css       Tailwind v4 @theme (tokens OKLCH dark-first, durações/curvas)
  layout.tsx        shell
  page.tsx          4 abas
  actions.ts        'use server' — casos de uso (getSetup, toggle, buildBundle, importPlan, ...)
  data/marketplaces.json  diretório curado (Descobrir), inclui getdesign.md
  components/icons.tsx, hello.tsx, tabs/*, ui/* (shadcn)
scripts/            Abrir co-panel.command|.bat, Instalar.command|.bat
CLAUDE.md, README.md
```

Testes colocados: `src/core/*.test.ts`, `src/adapters/*.test.ts` (Vitest, fixtures em
`test/fixtures/`).

---

## Milestone 1 — Fundação (core + ports + adapters, testado)

### Task 1: Scaffold + CLAUDE.md
**Files:** Create `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`,
`src/app/globals.css`, `CLAUDE.md`.
- [ ] Next 16 + React 19 + TS + Tailwind v4 + Vitest + Zod instalados.
- [ ] `CLAUDE.md` com as regras de arquitetura adaptadas (hexagonal, sem emoji, escrita segura).
- [ ] Deliverable: `npm run build` e `npx vitest run` rodam (sem testes ainda → passa vazio).

### Task 2: `core/types.ts` + `core/tokens.ts`
**Produces:** tipos `Scope='user'|'project'`, `AssetKind='skill'|'command'|'agent'|'hook'|'mcp'`,
`ProvidedAsset{kind,name,description?,source}`, `PluginRef{key,marketplace,version,enabled,provides:ProvidedAsset[]}`,
`Setup{plugins:PluginRef[], authored:ProvidedAsset[], mcp:{name,scope}[], hooks:{event,scope}[]}`,
`ContextLayer{source,label,scope,tokens,detail?}`, `Bundle{version, marketplaces, enabledPlugins, authored}`.
`estimateTokens(s:string):number`.
- [ ] Test `tokens.test.ts`: `estimateTokens('')===0`, `estimateTokens('x'.repeat(400))===100`.

### Task 3: `adapters/paths.ts` (cross-platform)
**Produces:** `resolveClaudePaths(homedir:string, projectDir?:string): { settings, claudeJson,
knownMarketplaces, installedPlugins, cacheDir, authoredDirs, projectSettings?, projectMcp? }` —
usando `path.join(homedir, '.claude', ...)` etc.
- [ ] Test: dado `homedir='/home/u'` → `settings==='/home/u/.claude/settings.json'`; com
  `projectDir` → `projectMcp` aponta pra `<proj>/.mcp.json`. (Roda igual em win32 via `path.join`.)

### Task 4: `ports/config-store.ts` + leitura do `FsConfigStore`
**Produces (interface):** `ConfigStore { readSettings():Promise<{data,raw,mtimeMs}>;
readClaudeJson(); readKnownMarketplaces(); readInstalledPlugins(); writeSettingsKey(key,value,expectMtimeMs);
patchClaudeJson(mutator,expectMtimeMs) }`.
- [ ] Implementar só leitura agora. Test lê fixtures (`test/fixtures/.claude/*`) e retorna
  `enabledPlugins` parseado. Fixtures baseadas nos arquivos reais (settings/known_marketplaces/installed).

### Task 5: `adapters/plugin-scanner.ts`
**Produces:** `scanPlugins(paths, installed, enabled): PluginRef[]` — pra cada plugin instalado,
varre `cache/<mp>/<plugin>/<ver>/{skills,commands,agents}` lendo o frontmatter YAML (`name`,
`description`) e monta `provides`.
- [ ] Test em fixture com 1 plugin + 1 skill (SKILL.md com frontmatter) → `provides` tem a skill
  com name/description certos; `enabled` reflete `enabledPlugins`.

### Task 6: `core/toggle.ts` (puro — preserva chaves)
**Produces:** `setPluginEnabled(settings:object, key:string, on:boolean): object` — retorna cópia
com `enabledPlugins[key]=on`, **sem tocar em `permissions`/`hooks`/outras chaves**.
- [ ] Test: settings com `permissions` + `enabledPlugins` → após toggle, `permissions` intacto,
  só o flag mudou; chaves desconhecidas preservadas.

### Task 7: escrita segura do `FsConfigStore`
**Consumes:** ConfigStore interface. **Produces:** `writeSettingsKey` e `patchClaudeJson` com:
backup `foo.json.bak.<ts>`, escrita atômica (temp+rename), `JSON.parse` de validação,
**mtime check** (se `mtimeMs !== expectMtimeMs` → lança `ExternalChangeError`).
- [ ] Test: escreve chave → arquivo válido, backup criado, demais chaves preservadas. Test:
  mtime divergente → lança `ExternalChangeError` (não grava).

---

## Milestone 2 — Aba "Meu setup" + toggle seguro

### Task 8: App shell (layout, tokens, abas, ícones, hello)
**Files:** `globals.css` (@theme OKLCH dark-first + `--ease-out-expo`, `--duration-fast`),
`layout.tsx`, `page.tsx` (Tabs shadcn: Meu setup / Contexto / Bundle / Descobrir),
`components/icons.tsx` (pack SVG stroke-2, sem emoji), `components/hello.tsx` (SVG `stroke-dashoffset`
handwriting, respeita `prefers-reduced-motion`).
- [ ] Deliverable: `npm run build` ok; abas trocam via View Transition; hello anima na entrada.

### Task 9: `actions.ts getSetup()` + render "Meu setup"
**Produces:** server action `getSetup(): Promise<Setup>` (resolve paths → ConfigStore + scanner).
UI agrupa por plugin, mostra `provides`, seção "assets autorais", header "X de Y ativos",
**rótulo de escopo**. Estado vazio ensina.
- [ ] Deliverable: abrir localhost mostra os plugins reais do usuário agrupados.

### Task 10: toggle wired (otimista + backup)
**Produces:** action `togglePlugin(key, on)` → `setPluginEnabled` + `writeSettingsKey` (backup).
UI: switch otimista, `router.refresh()` no sucesso; erro de mudança externa → aviso.
- [ ] Deliverable: ligar/desligar reflete no `settings.json` (com `.bak`), `permissions` intacto.

---

## Milestone 3 — Aba "Contexto"

### Task 11: `core/context.ts`
**Produces:** `computeContextLayers(inputs:{claudeMd:{label,scope,text}[], memory?, skills:ProvidedAsset[],
pluginInstr, mcpInstr, hooks}): ContextLayer[]` — cada camada com `tokens=estimateTokens(text)`.
- [ ] Test: dado 2 CLAUDE.md + 1 skill → 3 camadas, tokens = ceil(len/4), ordenadas por precedência.

### Task 12: UI "Contexto"
**Produces:** aba que lista camadas por fonte com barras de token (gasto) e total; nota do limite
honesto (não mostra o system-prompt-base do harness).
- [ ] Deliverable: abrir mostra CLAUDE.md global+projeto, memória, skills, com gasto por fonte.

---

## Milestone 4 — Aba "Bundle"

### Task 13: `core/bundle.ts` (build/validate/merge)
**Produces:** `buildBundle(setup, selection): Bundle`; `BundleSchema` (Zod);
`validateBundle(unknown): Bundle` (rejeita inválido/perigoso); `planImport(bundle, currentSetup):
{ marketplacesToAdd, pluginsToEnable, authoredToCopy, risky:{hooks[],mcp[]} }` — `risky` separado
pra exigir confirmação. Sanitiza paths de asset (sem `..`).
- [ ] Test: round-trip export→validate→plan; bundle com path traversal em asset → rejeitado;
  bundle com hook/mcp → aparecem em `risky`, nunca em auto-apply.

### Task 14: UI "Bundle" export/import
**Produces:** export (seleção + baixa `.json`); import (upload → tela de revisão: verde = seguro
auto, vermelho = `risky` com os comandos e confirmação item a item). Aplica via actions.
- [ ] Deliverable: exportar gera arquivo; importar mostra revisão; hooks/MCP exigem confirmação.

---

## Milestone 5 — Aba "Descobrir" + empacotar

### Task 15: `data/marketplaces.json` + aba "Descobrir"
**Produces:** JSON curado (oficial Anthropic, ponytail, **getdesign.md**, etc.) com
`{name,repo?,url,description,tags}`. UI = cards no padrão apple-cards-carousel (scroll-snap +
morph via View Transitions), botão "adicionar marketplace" (mostra a fonte git antes).
- [ ] Deliverable: carousel navegável por teclado; card abre detalhe com morph.

### Task 16: launcher + update via git + README + ícone
**Files:** `scripts/Abrir co-panel.command|.bat`, `Instalar.command|.bat`, `adapters/updater.ts`,
`actions.ts checkUpdate/applyUpdate`, banner de "nova versão", `README.md`, `public/icon.svg`
(app-mac com ferramentas, monocromático).
- [ ] Deliverable: `.command`/`.bat` sobem servidor + abrem navegador; banner de update aparece
  quando `origin` está à frente; README com passo-a-passo e GIF placeholder.

---

## Self-Review (autor)
- **Cobertura da spec:** 4 abas (T9/T12/T14/T15), escopo completo plugins/skills/commands/agents/
  MCP/hooks (T4/T5/T13), escrita segura (T7), atualização git (T16), launcher (T16), design/motion
  (T8/T15), Contexto+tokens (T11/T12). ✔
- **Sem placeholder de código** nas peças load-bearing (interfaces/tipos/escrita segura/bundle
  definidos). Testes descritos por asserção concreta (execução pelo próprio autor).
- **Consistência de tipos:** `PluginRef/ProvidedAsset/Setup/Bundle/ContextLayer` usados igual entre
  tasks. `ConfigStore` com `writeSettingsKey`/`patchClaudeJson` consistente T4→T7→T10.

**Nota (contexto AFK/orçamento):** plano condensado de propósito — o autor executa inline e
prioriza software funcionando + testado sobre verbosidade de plano. Cada task termina com
deliverable testável.

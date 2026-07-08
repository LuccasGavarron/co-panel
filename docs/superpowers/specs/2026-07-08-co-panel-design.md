# co-panel — painel local de setup do Claude Code (spec de design)

> Data: 2026-07-08 · Status: desenho aprovado em brainstorm, aguardando revisão da spec
> Stack: Next 16 (App Router) · React 19 · Tailwind v4 · TS · sem banco, sem auth, sem nuvem

## 1. Problema

Gerenciar o que está ativo no Claude Code — plugins, skills, slash commands, subagents,
servidores MCP e hooks — é opaco e manual: tudo vive espalhado em arquivos JSON. Três dores
concretas do dono:

1. **Não sei o que está ativo** nem o que cada coisa faz.
2. **Ligar/desligar dá trabalho** (editar arquivo, lembrar comando).
3. **Sincronizar entre PCs e compartilhar com amigos** não tem caminho fácil.

**co-panel** é uma ferramenta **local, sem servidor**, que torna isso **visual, seguro e
compartilhável** — e serve de peça de portfólio no GitHub.

## 2. Usuários e objetivo

- Dono (Samuel) + amigos devs que usam Claude Code em **mac e Windows**.
- Objetivo: **ver**, **ligar/desligar** e **trocar setups**. Sem nuvem, sem login, sem conta.

## 3. Princípios (herdados do FacilitaCRM, adaptados honestamente)

**O que transfere:**
- **Regra 00000 adaptada:** tudo bem-feito de verdade; **portas antes de adaptadores**; domínio
  puro testável sem disco; **integridade no sistema de arquivos como backstop** (backup + escrita
  atômica + validação). Reuso, qualidade e segurança são a mesma coisa — sem trade-off.
- **Sem emoji na UI, nunca.** Ícones SVG monocromáticos de um pack próprio (stroke consistente).
- **Animações intencionais:** só `transform`/`opacity`, `prefers-reduced-motion` respeitado,
  nenhuma lib de animação nova (CSS/Web Animations nativo).
- **UX óbvia:** aba, toggle, zero manual; a ação principal de cada tela é uma e clara.

**O que NÃO transfere (flag honesto, não cargo-cult):**
- **Regra 0 (mobile-first):** não se aplica. O alvo é o **navegador desktop no PC de dev** — não
  se gerencia a config da máquina de dev pelo celular. UI responsável (não quebra estreita), mas
  desktop-first.
- **Multi-tenant / RLS / `tenant_id` / Central Fá:** não há tenants, banco nem multiempresa.
  N/A. co-panel é single-user local.

## 4. Modelo mental: dois tipos de coisa compartilhável

O que torna este projeto **pequeno**: existem dois tipos de item, e cada um se compartilha
diferente.

1. **Plugins (de marketplaces)** → compartilhar = a **fonte git** + o flag ligado. O amigo
   re-instala do repo pelo mecanismo nativo. **Nunca copiamos o código do plugin.**
2. **Assets autorais** (skills/commands/agents/workflows que *você* escreveu em `~/.claude/`) →
   compartilhar = **copiar os arquivos** pro bundle. Este é o coração de "compartilhar meus
   workflows".

Um **bundle** é só um `.json` (marketplaces + enabledPlugins + manifest) acompanhado de uma pasta
com os assets autorais. Importar = "adicione estes marketplaces, ligue estes plugins, copie estas
pastas — depois de você revisar".

## 5. Mapa de arquivos (a verdade no disco — verificado, não presumido)

**Escopo user:**
- `~/.claude/settings.json` → `enabledPlugins`, `hooks`, `extraKnownMarketplaces`, `permissions`,
  `model`, `statusLine`, `theme`, `language`, `effortLevel`.
- `~/.claude.json` → `mcpServers` (user), `projects{}` (config por projeto) **+ muito estado do
  app**. **ARQUIVO FRÁGIL E CRÍTICO** — patch cirúrgico, backup reforçado, nunca reescrever inteiro.
- `~/.claude/plugins/known_marketplaces.json`, `installed_plugins.json` → fontes + o que está
  instalado (versões, paths).
- `~/.claude/{skills,commands,agents,workflows}/` → assets autorais (hoje vazios no dono).
- `~/.claude/plugins/cache/<mp>/<plugin>/<ver>/{skills,commands,agents,hooks}` → o que cada plugin
  **traz** (lido via frontmatter pra montar a visão "o que está ativo").

**Escopo projeto:**
- `<proj>/.mcp.json` → `mcpServers` do projeto.
- `<proj>/.claude/settings.json`, `settings.local.json` → hooks/enabledPlugins do projeto.

## 6. Arquitetura (hexagonal — na linha da Regra 00000)

```
core/      domínio puro, SEM fs — modelo do setup, regras de toggle,
           build/merge/validate de bundle. Testável sem tocar disco.
ports/     interfaces — ConfigStore (ler/escrever config), Launcher.
adapters/  FsConfigStore (lê/escreve os arquivos reais: backup + atômico +
           validação), PluginCacheScanner (varre cache lendo frontmatter).
app/       Next (fino) — server actions chamam casos de uso; UI (3 abas).
```

**Onde NÃO abstrair (ponytail + Regra 00000):** sem camada `verticais/` — é um produto só, não
há verticais. Sem porta com uma implementação só, **a não ser que pague em teste/segurança** —
`ConfigStore` paga: permite fixtures em memória nos testes **e** o padrão "ler fresco antes de
escrever". Não inventamos flexibilidade morta.

## 7. UI — 4 abas

- **Meu setup:** lista agrupada por plugin (+ seção "assets autorais"), **toggle liga/desliga**,
  header "X de Y ativos", **escopo (user/projeto) sempre rotulado**. Estado vazio ensina.
- **Contexto:** o que o Claude realmente recebe no prompt, por fonte, com "gasto" de tokens
  (ver §7.1).
- **Bundle:** **exportar** (seleciona o que entra) → gera `.json` + pasta de assets;
  **importar** (tela de revisão antes de aplicar — ver §8).
- **Descobrir:** **diretório curado** (um JSON versionado no repo) dos melhores marketplaces/fontes
  (oficial da Anthropic, ponytail, bons da comunidade), cada um com link e botão **"adicionar
  marketplace"** (chama o mecanismo nativo). Curado à mão; comunidade soma via PR. **Sem crawler.**

## 7.1 Aba Contexto — o que o Claude realmente recebe

Reconstrói e mostra, fiel, as camadas de contexto que **você controla via arquivos** e que o
Claude Code injeta no prompt — agrupadas por fonte, com **precedência** e **estimativa de tokens
("gasto") por fonte**:

- **CLAUDE.md em cascata:** global (`~/.claude/CLAUDE.md`) → projeto (`CLAUDE.md`) → subpastas →
  `CLAUDE.local.md`, com a ordem de precedência explícita.
- **Memória:** `MEMORY.md` + arquivos de memória do projeto.
- **Skills ativas:** `name` + `description` de cada uma — o que é injetado como "skills
  disponíveis" e o que **dispara** cada uma.
- **Instruções de plugin** e de **servidor MCP**.
- **Hooks que injetam contexto** (ex.: `UserPromptSubmit` → a saída entra no prompt): mostra o
  script e sinaliza que ele injeta.
- **Subagents** (`agents/*.md`) e seus gatilhos.

Cada fonte com **estimativa de tokens** (≈ chars/4 no v1; tokenizer real depois) → você vê **onde
o gasto de contexto está indo** e corta o que não usa. Fecha o loop com "Meu setup": desligar uma
skill/plugin ali reduz o gasto mostrado aqui.

**Limite honesto:** co-panel mostra o contexto que **você controla por arquivos**; **não** reproduz
o system-prompt-base interno/proprietário do harness do Claude Code. O objetivo é entender e
enxugar **as suas camadas** — que é o que dá pra gerenciar.

## 8. Robustez e segurança (onde NÃO somos preguiçosos)

Isto escreve na config real do Claude Code — a barra aqui é máxima.

- **Escrita atômica** (temp + rename) + **backup timestamped antes de toda escrita** + **validação
  JSON e round-trip antes de sobrescrever**.
- **Preservar chaves desconhecidas:** patch só da chave-alvo; **nunca** dropar `permissions`,
  `statusLine`, etc. `~/.claude.json` nunca é reescrito inteiro — patch cirúrgico com backup extra.
- **Ler fresco antes de escrever + detectar mudança externa:** se o arquivo mudou desde o load
  (Claude Code ou o usuário editou à mão), **avisa e não clobbera**.
- **Código de estranho = risco real, tratado como tal:** `hooks` e `mcpServers` num bundle são
  **execução de comando arbitrário** na sua máquina. No import, **hooks/MCP nunca são aplicados
  automaticamente** — são exibidos como os comandos que vão rodar, com aviso destacado, e exigem
  **confirmação explícita item a item**. Plugins idem: mostrar a **fonte git** antes de adicionar.
- **Escopo explícito:** sempre deixar claro se edita **user** ou **projeto**; nunca o errado em
  silêncio.
- **Bundle é input não confiável:** validar schema (Zod), sanitizar, limitar tamanho, barrar
  **path traversal** ao copiar assets.

## 9. Como abrir (launcher clicável — mata o medo do "como executo?")

- **`Abrir co-panel.command`** (mac) / **`Abrir co-panel.bat`** (Windows): checa se está buildado
  (builda se preciso), sobe o servidor local numa **porta fixa** (ex.: 4571), **abre o navegador**
  na página. Porta ocupada → trata com clareza. Fechar a janela do terminal encerra o servidor.
- **Setup inicial:** um `Instalar.command` / `.bat` roda `install` + `build` uma vez.
- **Cross-platform:** `os.homedir()` + `path.join`; scripts por SO. Sem framework — 3 linhas cada.
- **Fora do v1:** app no dock via Tauri (empacotamento mac+Windows é trabalho real → v2).

## 9.1 Atualização automática (estilo app Claude desktop)

Como roda local a partir de um clone git, "tem versão nova?" é **git puro** — sem framework de
auto-update (Squirrel/electron-updater etc.).

- **Distribuição = `git clone` do repo** (não zip). É o que faz o update por git funcionar: o
  `origin` do amigo aponta pro seu GitHub, então ele recebe suas atualizações.
- **Checagem:** ao abrir, um `git fetch` em segundo plano compara a versão local com a do
  `origin` (versão do `package.json` + tag/commit). Atrás → faixa **"Nova versão disponível"** +
  botão **Atualizar**, no capricho do app Claude desktop.
- **Atualizar:** `git pull` → `install` se as deps mudaram → `build` → recarrega. Nunca silencioso
  (é botão, o usuário clica).
- **Robustez:** **offline** → pula a checagem sem erro; **árvore suja** (usuário editou arquivos)
  → avisa e **não clobbera**, oferece continuar mesmo assim; conflito de pull → mostra e para.
- **Sem servidor de update:** o GitHub é a fonte da verdade da versão.

## 10. Ícone e marca

- **Ícone estilo app do macOS** (quadrado arredondado) com **motivo de ferramentas** (chave
  inglesa / conjunto de ferramentas) — **SVG, monocromático, sem emoji**. Norte visual: a vibe do
  ícone de **Utilitários do macOS**, limpo e sólido. Vira **favicon** e ícone do atalho clicável.
- **Sem emoji em lugar nenhum** da UI; ícones de um pack SVG próprio com stroke consistente.

## 11. Stack

Next 16 (App Router) + React 19 + Tailwind v4 + TypeScript. **Server actions** pra acesso ao fs
(rodam na máquina do usuário). **Zod** pra validar bundle/config. **Sem** banco, **sem** auth,
**sem** dependência de animação. O repo nasce com seu próprio **CLAUDE.md** (regras de arquitetura
adaptadas desta spec).

## 12. Testes

`core/` e `adapters/` cobertos com **fixtures JSON + asserts**: toggle preserva chaves
desconhecidas; bundle faz round-trip (export → import → mesmo estado); merge de import;
**bundle malicioso é rejeitado** (path traversal, schema inválido). UI não testada (YAGNI).

## 13. Fora do v1 (adicionar quando pedir)

Tauri (app no dock) · sync em nuvem · editar o *conteúdo* de skill (v1 só liga/desliga + ver) ·
descobrir/instalar plugin novo pela UI (pra isso `claude plugin` já existe) · tradução de config
de MCP entre SOs.

## 14. Repo

`~/Projetos/co-panel` (irmão do FacilitaCRM). **Repo git próprio**, independente do FacilitaCRM
(**não commitar junto**). README com GIF. História de portfólio: *"veja, gerencie e compartilhe
seu setup do Claude Code"*.

## 15. Marcos (ordem de construção)

1. **Fundação:** `core/` + `ports/` + `adapters/` — ler o setup real do disco, **testado**.
2. **Meu setup:** UI da aba + **toggle seguro** (backup/atômico/validação).
3. **Contexto:** reconstrução das camadas + estimativa de tokens por fonte (§7.1).
4. **Bundle:** export/import com a **tela de revisão de segurança** (§8).
5. **Descobrir:** diretório curado (JSON) + "adicionar marketplace".
6. **Empacotar:** launcher clicável + **atualização via git** (§9.1) + ícone + README + CLAUDE.md.

## 16. Decisões explícitas (registro)

- **Local, sem servidor/nuvem/auth.** Compartilhar = bundle (arquivo), não sync online. *(Pedido
  do dono: "algo local, sem site, porém que dê pra compartilhar".)*
- **Escopo v1 = tudo** (plugins, skills, commands, agents, MCP, hooks), mas **MCP/hooks de bundle
  importado nunca aplicam sozinhos** (execução de código). *(Segurança > conveniência.)*
- **Abrir = atalho clicável**, não Tauri no v1. *(Pedido do dono; Tauri fica v2.)*
- **Descobrir = diretório curado estático**, não crawler. *(Reverte o "sem descoberta" do desenho
  inicial — o dono pediu juntar os melhores sites.)*
- **Arquitetura = regras do FacilitaCRM adaptadas**; mobile-first e multi-tenant/Fá **não se
  aplicam** e ficam de fora conscientemente. *(Pedido do dono + flag honesto.)*
- **Atualização via git** (faixa "nova versão" + botão Atualizar, estilo app Claude desktop);
  **distribuição = `git clone`**, GitHub como fonte da versão. Sem framework de auto-update.
  *(Pedido do dono.)*
- **Aba Contexto** pra entender "o que o Claude recebe de prompt" com gasto de tokens por fonte;
  **limite honesto:** não mostra o system-prompt-base interno do harness, só as camadas que o
  dono controla por arquivo. *(Pedido do dono.)*

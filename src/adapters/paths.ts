import path from 'node:path'

/** Caminhos da config do Claude Code, resolvidos cross-platform. */
export interface ClaudePaths {
  settings: string
  claudeJson: string
  knownMarketplaces: string
  installedPlugins: string
  cacheDir: string
  authoredDirs: Record<'skills' | 'commands' | 'agents' | 'workflows', string>
  projectSettings?: string
  projectSettingsLocal?: string
  projectMcp?: string
}

/**
 * Resolve todos os arquivos/pastas de config do Claude Code.
 * Cross-platform via path.join: no mac usa ~/.claude, no Windows %USERPROFILE%\.claude.
 * Passe `homedir` (de os.homedir()) e opcionalmente o diretório de um projeto.
 */
export function resolveClaudePaths(homedir: string, projectDir?: string): ClaudePaths {
  const claude = path.join(homedir, '.claude')
  const plugins = path.join(claude, 'plugins')
  const paths: ClaudePaths = {
    settings: path.join(claude, 'settings.json'),
    claudeJson: path.join(homedir, '.claude.json'),
    knownMarketplaces: path.join(plugins, 'known_marketplaces.json'),
    installedPlugins: path.join(plugins, 'installed_plugins.json'),
    cacheDir: path.join(plugins, 'cache'),
    authoredDirs: {
      skills: path.join(claude, 'skills'),
      commands: path.join(claude, 'commands'),
      agents: path.join(claude, 'agents'),
      workflows: path.join(claude, 'workflows'),
    },
  }
  if (projectDir) {
    paths.projectSettings = path.join(projectDir, '.claude', 'settings.json')
    paths.projectSettingsLocal = path.join(projectDir, '.claude', 'settings.local.json')
    paths.projectMcp = path.join(projectDir, '.mcp.json')
  }
  return paths
}

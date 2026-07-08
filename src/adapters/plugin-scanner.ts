import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
import type { PluginRef, ProvidedAsset, AssetKind, Scope } from '../core/types'

interface InstalledEntry {
  installPath: string
  version: string
}
export interface InstalledFile {
  plugins?: Record<string, InstalledEntry[]>
}

async function parseFrontmatter(file: string): Promise<{ name?: string; description?: string }> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const m = raw.match(/^---\s*\n([\s\S]*?)\n---/)
    if (!m) return {}
    // js-yaml v4: load() já é seguro por padrão (DEFAULT_SCHEMA, sem construção de
    // tipos arbitrários / execução de código). Não é o yaml.load() perigoso do PyYAML.
    const fm = yaml.load(m[1]) as Record<string, unknown> | null
    return {
      name: typeof fm?.name === 'string' ? fm.name : undefined,
      description: typeof fm?.description === 'string' ? fm.description : undefined,
    }
  } catch {
    return {}
  }
}

async function listDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}

// Skills vivem como subpastas de skills/, cada uma com SKILL.md (frontmatter name/description).
async function scanSkills(root: string): Promise<ProvidedAsset[]> {
  const dir = path.join(root, 'skills')
  const out: ProvidedAsset[] = []
  for (const e of await listDir(dir)) {
    const fm = await parseFrontmatter(path.join(dir, e, 'SKILL.md'))
    out.push({ kind: 'skill', name: fm.name ?? e, description: fm.description, source: path.join('skills', e) })
  }
  return out
}

// Commands e agents são arquivos .md numa pasta.
async function scanMd(root: string, sub: string, kind: AssetKind): Promise<ProvidedAsset[]> {
  const dir = path.join(root, sub)
  const out: ProvidedAsset[] = []
  for (const e of await listDir(dir)) {
    if (!e.endsWith('.md')) continue
    const fm = await parseFrontmatter(path.join(dir, e))
    out.push({ kind, name: fm.name ?? e.replace(/\.md$/, ''), description: fm.description, source: path.join(sub, e) })
  }
  return out
}

// Workflows são arquivos .js/.ts/.md numa pasta; nome = arquivo sem extensão.
async function scanWorkflows(root: string): Promise<ProvidedAsset[]> {
  const out: ProvidedAsset[] = []
  for (const e of await listDir(path.join(root, 'workflows'))) {
    if (!/\.(js|ts|md)$/.test(e)) continue
    out.push({ kind: 'workflow', name: e.replace(/\.(js|ts|md)$/, ''), source: path.join('workflows', e) })
  }
  return out
}

/**
 * Monta a lista de plugins instalados com o que cada um fornece (skills/commands/agents)
 * e se está ligado (a partir de enabledPlugins do settings.json).
 */
export async function scanPlugins(
  installed: InstalledFile,
  enabled: Record<string, boolean>,
  scope: Scope = 'user',
): Promise<PluginRef[]> {
  const refs: PluginRef[] = []
  for (const [key, entries] of Object.entries(installed.plugins ?? {})) {
    const entry = entries?.[0]
    if (!entry) continue
    const [name, marketplace] = key.split('@')
    const provides = [
      ...(await scanSkills(entry.installPath)),
      ...(await scanMd(entry.installPath, 'commands', 'command')),
      ...(await scanMd(entry.installPath, 'agents', 'agent')),
      ...(await scanWorkflows(entry.installPath)),
    ]
    refs.push({
      key,
      name: name ?? key,
      marketplace: marketplace ?? '',
      version: entry.version ?? 'unknown',
      enabled: enabled[key] ?? false,
      scope,
      provides,
    })
  }
  return refs.sort((a, b) => a.name.localeCompare(b.name))
}

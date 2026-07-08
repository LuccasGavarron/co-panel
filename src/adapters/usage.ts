import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { UsageRecord } from '../core/usage-metrics'

const MAX_FILES = 400 // limite de segurança; se passar, avisamos (sem corte silencioso)

/**
 * Lê os logs de sessão do Claude Code (~/.claude/projects/**\/*.jsonl) e extrai
 * registros de uso (tokens) a partir de `since`. Só varre arquivos modificados
 * desde `since` (performance). Cada linha com `message.usage` vira um UsageRecord.
 */
export async function readUsage(
  since: number,
): Promise<{ records: UsageRecord[]; capped: boolean }> {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects')
  let dirs: string[] = []
  try {
    dirs = await fs.readdir(projectsDir)
  } catch {
    return { records: [], capped: false }
  }

  const files: { file: string; mtime: number }[] = []
  for (const d of dirs) {
    const pdir = path.join(projectsDir, d)
    let entries: string[] = []
    try {
      entries = await fs.readdir(pdir)
    } catch {
      continue
    }
    for (const e of entries) {
      if (!e.endsWith('.jsonl')) continue
      const fp = path.join(pdir, e)
      try {
        const st = await fs.stat(fp)
        if (st.mtimeMs >= since) files.push({ file: fp, mtime: st.mtimeMs })
      } catch {
        /* ignora arquivo ilegível */
      }
    }
  }

  files.sort((a, b) => b.mtime - a.mtime)
  const capped = files.length > MAX_FILES
  const use = files.slice(0, MAX_FILES)

  const records: UsageRecord[] = []
  for (const { file } of use) {
    let raw: string
    try {
      raw = await fs.readFile(file, 'utf8')
    } catch {
      continue
    }
    for (const line of raw.split('\n')) {
      if (!line.includes('"usage"')) continue // pré-filtro rápido
      let o: {
        message?: { usage?: Record<string, number>; model?: string }
        timestamp?: string
        cwd?: string
      }
      try {
        o = JSON.parse(line)
      } catch {
        continue
      }
      const u = o.message?.usage
      const tsStr = o.timestamp
      if (!u || !tsStr) continue
      const ts = Date.parse(tsStr)
      if (Number.isNaN(ts) || ts < since) continue
      const tokens =
        (u.input_tokens ?? 0) +
        (u.output_tokens ?? 0) +
        (u.cache_creation_input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0)
      if (tokens <= 0) continue
      records.push({
        ts,
        project: o.cwd ? path.basename(o.cwd) : 'sem projeto',
        model: (o.message?.model ?? 'desconhecido').replace(/^claude-/, ''),
        tokens,
      })
    }
  }
  return { records, capped }
}

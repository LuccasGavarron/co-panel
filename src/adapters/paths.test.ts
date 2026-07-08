import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { resolveClaudePaths } from './paths'

describe('resolveClaudePaths', () => {
  it('resolve o escopo user a partir do homedir', () => {
    const p = resolveClaudePaths('/home/u')
    expect(p.settings).toBe(path.join('/home/u', '.claude', 'settings.json'))
    expect(p.claudeJson).toBe(path.join('/home/u', '.claude.json'))
    expect(p.cacheDir).toBe(path.join('/home/u', '.claude', 'plugins', 'cache'))
    expect(p.authoredDirs.skills).toBe(path.join('/home/u', '.claude', 'skills'))
  })

  it('inclui o escopo de projeto quando projectDir é dado', () => {
    const p = resolveClaudePaths('/home/u', '/proj')
    expect(p.projectMcp).toBe(path.join('/proj', '.mcp.json'))
    expect(p.projectSettings).toBe(path.join('/proj', '.claude', 'settings.json'))
  })

  it('sem projectDir, o escopo de projeto fica indefinido', () => {
    const p = resolveClaudePaths('/home/u')
    expect(p.projectMcp).toBeUndefined()
    expect(p.projectSettings).toBeUndefined()
  })
})

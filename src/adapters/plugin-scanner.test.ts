import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { scanPlugins } from './plugin-scanner'

let root: string
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'copanel-scan-'))
})
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('scanPlugins', () => {
  it('lê skills (frontmatter) e commands de um plugin instalado', async () => {
    const installPath = path.join(root, 'cache', 'mp', 'demo', '1.0.0')
    await fs.mkdir(path.join(installPath, 'skills', 'fazer-algo'), { recursive: true })
    await fs.mkdir(path.join(installPath, 'commands'), { recursive: true })
    await fs.writeFile(
      path.join(installPath, 'skills', 'fazer-algo', 'SKILL.md'),
      '---\nname: fazer-algo\ndescription: faz uma coisa\n---\n# corpo\n',
    )
    await fs.writeFile(
      path.join(installPath, 'commands', 'oi.md'),
      '---\ndescription: diz oi\n---\n',
    )

    const installed = { plugins: { 'demo@mp': [{ installPath, version: '1.0.0' }] } }
    const refs = await scanPlugins(installed, { 'demo@mp': true })

    expect(refs).toHaveLength(1)
    const p = refs[0]
    expect(p.name).toBe('demo')
    expect(p.marketplace).toBe('mp')
    expect(p.enabled).toBe(true)
    const skill = p.provides.find((a) => a.kind === 'skill')
    expect(skill).toMatchObject({ name: 'fazer-algo', description: 'faz uma coisa' })
    const cmd = p.provides.find((a) => a.kind === 'command')
    expect(cmd).toMatchObject({ name: 'oi', description: 'diz oi' })
  })

  it('marca enabled=false quando não está em enabledPlugins', async () => {
    const installPath = path.join(root, 'cache', 'mp', 'quieto', '2.0.0')
    await fs.mkdir(installPath, { recursive: true })
    const installed = { plugins: { 'quieto@mp': [{ installPath, version: '2.0.0' }] } }
    const refs = await scanPlugins(installed, {})
    expect(refs[0].enabled).toBe(false)
    expect(refs[0].provides).toEqual([])
  })

  it('ordena por nome', async () => {
    const mk = async (name: string) => {
      const ip = path.join(root, name)
      await fs.mkdir(ip, { recursive: true })
      return ip
    }
    const installed = {
      plugins: {
        'zeta@mp': [{ installPath: await mk('zeta'), version: '1' }],
        'alpha@mp': [{ installPath: await mk('alpha'), version: '1' }],
      },
    }
    const refs = await scanPlugins(installed, {})
    expect(refs.map((r) => r.name)).toEqual(['alpha', 'zeta'])
  })
})

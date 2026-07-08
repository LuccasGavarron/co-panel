import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

export interface UpdateStatus {
  behind: boolean
  commitsBehind: number
  /** Silencioso quando offline ou sem upstream configurado. */
  error?: string
}

/**
 * "Tem versão nova?" via git puro (estilo app Claude desktop): faz fetch e compara
 * o HEAD local com o upstream. Offline ou sem origin → behind:false, sem barulho.
 */
export async function checkForUpdate(dir: string): Promise<UpdateStatus> {
  try {
    await run('git', ['-C', dir, 'fetch', '--quiet'], { timeout: 15_000 })
    const [{ stdout: local }, { stdout: remote }] = await Promise.all([
      run('git', ['-C', dir, 'rev-parse', 'HEAD']),
      run('git', ['-C', dir, 'rev-parse', '@{u}']),
    ])
    if (local.trim() === remote.trim()) return { behind: false, commitsBehind: 0 }
    const { stdout } = await run('git', [
      '-C',
      dir,
      'rev-list',
      '--count',
      'HEAD..@{u}',
    ])
    const commitsBehind = Number(stdout.trim()) || 0
    return { behind: commitsBehind > 0, commitsBehind }
  } catch (e) {
    return { behind: false, commitsBehind: 0, error: (e as Error).message }
  }
}

export interface UpdateResult {
  ok: boolean
  message: string
}

/**
 * Aplica a atualização: git pull (ff-only, seguro), reinstala deps se preciso e builda.
 * Não reinicia o servidor sozinho (frágil) — pede pro usuário reabrir. Árvore suja → falha
 * clara sem clobber (ff-only recusa se houver divergência local).
 */
export async function applyUpdate(dir: string): Promise<UpdateResult> {
  try {
    await run('git', ['-C', dir, 'pull', '--ff-only'], { timeout: 60_000 })
    await run('npm', ['--prefix', dir, 'install', '--no-audit', '--no-fund'], { timeout: 180_000 })
    await run('npm', ['--prefix', dir, 'run', 'build'], { timeout: 300_000 })
    return {
      ok: true,
      message: 'Atualizado. Feche o Terminal e reabra o atalho pra carregar a versão nova.',
    }
  } catch (e) {
    return { ok: false, message: (e as Error).message }
  }
}

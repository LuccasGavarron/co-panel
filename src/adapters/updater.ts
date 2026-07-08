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

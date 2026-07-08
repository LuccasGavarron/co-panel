// Perfis do co-panel guardados no localStorage do navegador.
// Cada perfil é um snapshot de quais plugins ficam ligados.

export interface Profile {
  id: string
  name: string
  enabledPlugins: Record<string, boolean>
}

const PROFILES_KEY = 'copanel.profiles'
const ACTIVE_KEY = 'copanel.activeProfileId'

export function readProfiles(): Profile[] {
  try {
    const list = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]')
    return Array.isArray(list) ? (list as Profile[]) : []
  } catch {
    return []
  }
}

export function writeProfiles(list: Profile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list))
}

export function readActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function writeActiveId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function newProfileId(): string {
  return crypto.randomUUID()
}

/** Chaves dos plugins ligados neste perfil. */
export function enabledKeys(p: Profile): string[] {
  return Object.entries(p.enabledPlugins)
    .filter(([, on]) => on)
    .map(([key]) => key)
}

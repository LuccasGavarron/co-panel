'use server'

import { setPluginEnabled } from '../core/toggle'
import { makeStore } from '../adapters/host'
import { ExternalChangeError } from '../ports/config-store'

export type ActionResult = { ok: true } | { ok: false; error: string }

/** Liga/desliga um plugin no settings.json (com backup + escrita segura). */
export async function togglePlugin(key: string, on: boolean): Promise<ActionResult> {
  try {
    const store = makeStore()
    const settings = await store.readSettings()
    const next = setPluginEnabled(settings.data, key, on)
    await store.writeSettings(next, settings.mtimeMs)
    return { ok: true }
  } catch (e) {
    if (e instanceof ExternalChangeError) {
      return { ok: false, error: 'A config mudou fora do co-panel. Recarregue e tente de novo.' }
    }
    return { ok: false, error: (e as Error).message }
  }
}

/** Aplica só a parte segura de um import: liga os plugins pedidos. */
export async function enablePlugins(keys: string[]): Promise<ActionResult> {
  try {
    const store = makeStore()
    for (const key of keys) {
      const settings = await store.readSettings()
      const next = setPluginEnabled(settings.data, key, true)
      await store.writeSettings(next, settings.mtimeMs)
    }
    return { ok: true }
  } catch (e) {
    if (e instanceof ExternalChangeError) {
      return { ok: false, error: 'A config mudou fora do co-panel. Recarregue e tente de novo.' }
    }
    return { ok: false, error: (e as Error).message }
  }
}

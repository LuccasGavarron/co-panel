'use server'

import { setPluginEnabled, setEnabledPlugins as setEnabledPluginsCore } from '../core/toggle'
import { makeStore, readAssetContent, readMcpDetail, readHookDetail } from '../adapters/host'
import {
  checkForUpdate,
  applyUpdate as runApplyUpdate,
  type UpdateStatus,
  type UpdateResult,
} from '../adapters/updater'
import { ExternalChangeError } from '../ports/config-store'
import { readUsage } from '../adapters/usage'
import { aggregateUsage, aggregateDaily, type UsageMetrics, type WindowMetrics } from '../core/usage-metrics'

export type ActionResult = { ok: true } | { ok: false; error: string }

/** Métricas de uso agregadas (hoje / 7 dias / 5h) — usado pelo polling ao vivo. */
export async function getUsage(): Promise<UsageMetrics> {
  const now = Date.now()
  const day = new Date(now); day.setHours(0,0,0,0)
  const weekStart = now - 7*24*3600_000
  const windows = { dayStart: day.getTime(), weekStart, h5Start: now - 5*3600_000 }
  const { records } = await readUsage(weekStart)
  return aggregateUsage(records, windows)
}

/** Uso agregado desde o reset manual da assinatura (tudo desde `since`). */
export async function getUsageSince(since: number): Promise<WindowMetrics> {
  const { records } = await readUsage(since)
  return aggregateUsage(records, { dayStart: since, weekStart: since, h5Start: since }).today
}

/** Lê o conteúdo de um asset (skill/command/agent/workflow) pra ver na UI. */
export async function getAssetContent(ownerKey: string, source: string): Promise<string> {
  return readAssetContent(ownerKey, source)
}

/** Detalhe cru de um servidor MCP pra ver na UI (só leitura). */
export async function getMcpDetail(name: string): Promise<string> {
  return readMcpDetail(name)
}

/** Detalhe cru de um hook por evento pra ver na UI (só leitura). */
export async function getHookDetail(event: string): Promise<string> {
  return readHookDetail(event)
}

/** Uso somado por dia nos últimos 7 dias (pro mini gráfico ao vivo). */
export async function getUsageDaily(): Promise<{ day: string; tokens: number }[]> {
  const now = Date.now()
  const { records } = await readUsage(now - 7 * 24 * 3600_000)
  return aggregateDaily(records, now)
}

/** Aplica um perfil: grava o mapa inteiro de enabledPlugins (liga E desliga). */
export async function setEnabledPlugins(map: Record<string, boolean>): Promise<ActionResult> {
  try {
    const store = makeStore()
    const settings = await store.readSettings()
    const next = setEnabledPluginsCore(settings.data, map)
    await store.writeSettings(next, settings.mtimeMs)
    return { ok: true }
  } catch (e) {
    if (e instanceof ExternalChangeError) {
      return { ok: false, error: 'A config mudou fora do co-panel. Recarregue e tente de novo.' }
    }
    return { ok: false, error: (e as Error).message }
  }
}

/** "Tem versão nova?" — usado pela faixa de atualização (estilo app Claude desktop). */
export async function checkUpdate(): Promise<UpdateStatus> {
  return checkForUpdate(process.cwd())
}

/** Aplica a atualização (git pull + build). Retorna mensagem pro usuário. */
export async function applyUpdate(): Promise<UpdateResult> {
  return runApplyUpdate(process.cwd())
}

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

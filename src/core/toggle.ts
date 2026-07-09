// Regra pura: ligar/desligar um plugin preservando TODO o resto do settings.json.
// Sem fs — o adapter cuida de backup/atômico/escrita. Não muta a entrada.
export function setPluginEnabled<T extends Record<string, unknown>>(
  settings: T,
  key: string,
  on: boolean,
): T {
  const current = (settings.enabledPlugins ?? {}) as Record<string, boolean>
  return {
    ...settings,
    enabledPlugins: { ...current, [key]: on },
  } as T
}

// Define o mapa INTEIRO de enabledPlugins (troca de perfil: liga E desliga),
// preservando todas as outras chaves do settings. Não muta a entrada.
export function setEnabledPlugins<T extends Record<string, unknown>>(
  settings: T,
  map: Record<string, boolean>,
): T {
  return { ...settings, enabledPlugins: { ...map } } as T
}

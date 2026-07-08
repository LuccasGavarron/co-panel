import { getSetup, getContextView, getKnownMarketplaces } from '../adapters/host'
import { readUsage } from '../adapters/usage'
import { aggregateUsage } from '../core/usage-metrics'
import Panel from './components/Panel'
import marketplaces from './data/marketplaces.json'
import pkg from '../../package.json'

// Lê a config VIVA do usuário a cada carga (nunca cacheia no build) — é uma ferramenta local.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const now = Date.now()
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  const weekStart = now - 7 * 24 * 3600_000
  const windows = { dayStart: day.getTime(), weekStart, h5Start: now - 5 * 3600_000 }

  const [setup, context, knownMarketplaces, usageData] = await Promise.all([
    getSetup(),
    getContextView(),
    getKnownMarketplaces(),
    readUsage(weekStart),
  ])
  const usage = aggregateUsage(usageData.records, windows)

  return (
    <Panel
      setup={setup}
      context={context}
      marketplaces={marketplaces}
      knownMarketplaces={knownMarketplaces}
      appVersion={pkg.version}
      usage={usage}
    />
  )
}

import { getSetup, getContextView, getKnownMarketplaces, getProjects } from '../adapters/host'
import { readUsage } from '../adapters/usage'
import { aggregateUsage } from '../core/usage-metrics'
import Panel from './components/Panel'
import marketplaces from './data/marketplaces.json'
import pkg from '../../package.json'

// Lê a config VIVA do usuário a cada carga (nunca cacheia no build) — é uma ferramenta local.
export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const sp = await searchParams
  const projectDir = sp?.project || undefined

  const now = Date.now()
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  const weekStart = now - 7 * 24 * 3600_000
  const windows = { dayStart: day.getTime(), weekStart, h5Start: now - 5 * 3600_000 }

  const [setup, context, knownMarketplaces, usageData, projects] = await Promise.all([
    getSetup(projectDir),
    getContextView(projectDir),
    getKnownMarketplaces(),
    readUsage(weekStart),
    getProjects(),
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
      projects={projects}
      activeProject={projectDir ?? null}
    />
  )
}

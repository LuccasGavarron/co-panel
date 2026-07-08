import { getSetup, getContextView, getKnownMarketplaces } from '../adapters/host'
import Panel from './components/Panel'
import marketplaces from './data/marketplaces.json'
import pkg from '../../package.json'

// Lê a config VIVA do usuário a cada carga (nunca cacheia no build) — é uma ferramenta local.
export const dynamic = 'force-dynamic'

// Server component: lê o setup real da máquina e entrega ao painel (client).
export default async function Home() {
  const [setup, context, knownMarketplaces] = await Promise.all([
    getSetup(),
    getContextView(),
    getKnownMarketplaces(),
  ])
  return (
    <Panel
      setup={setup}
      context={context}
      marketplaces={marketplaces}
      knownMarketplaces={knownMarketplaces}
      appVersion={pkg.version}
    />
  )
}

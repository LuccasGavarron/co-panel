import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'co-panel',
  description: 'Veja, gerencie e compartilhe seu setup do Claude Code.',
}

export const viewport: Viewport = {
  themeColor: '#0b0d12',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}

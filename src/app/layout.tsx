import type { Metadata, Viewport } from 'next'
import { Fraunces } from 'next/font/google'
import './globals.css'
import ThemeToggle from './components/ThemeToggle'

// Fonte do wordmark: Fraunces (serifa display encorpada e com caráter). Auto-hospedada
// no build — funciona offline depois.
const wordmark = Fraunces({
  subsets: ['latin'],
  weight: ['900'],
  style: ['normal'],
  variable: '--font-wordmark',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'co-panel',
  description: 'Veja, gerencie e compartilhe seu setup do Claude Code.',
}

export const viewport: Viewport = {
  themeColor: '#12100e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={wordmark.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('copanel.theme');if(t==='light')document.documentElement.dataset.theme='light'}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  )
}

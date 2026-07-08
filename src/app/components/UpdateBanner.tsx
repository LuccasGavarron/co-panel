'use client'

import { useEffect, useState } from 'react'
import { checkUpdate } from '../actions'

// Faixa "nova versão" estilo app Claude desktop. Checa via git em segundo plano;
// offline/sem origin → não aparece. Atualizar é 1 comando (seguro, sem auto-rebuild frágil).
export default function UpdateBanner() {
  const [behind, setBehind] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    checkUpdate()
      .then((s) => {
        if (alive && s.behind) setBehind(s.commitsBehind)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (behind === 0) return null
  const cmd = 'git pull && npm install && npm run build'
  return (
    <div
      className="cp-rise mt-4 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm"
      style={{
        background: 'color-mix(in oklch, var(--color-accent) 15%, transparent)',
        color: 'var(--color-accent)',
      }}
    >
      <span className="font-medium">
        Nova versão disponível ({behind} commit{behind > 1 ? 's' : ''} atrás).
      </span>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(cmd)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        }}
        className="rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--color-fg)]"
      >
        {copied ? 'copiado!' : 'copiar: git pull && build'}
      </button>
    </div>
  )
}

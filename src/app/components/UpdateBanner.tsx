'use client'

import { useEffect, useState, useTransition } from 'react'
import { checkUpdate, applyUpdate } from '../actions'
import { Download, Check, Warn } from './icons'

// Faixa "nova versão" estilo app Claude desktop: checa via git em segundo plano e
// atualiza com um clique (git pull + build). Offline/sem origin → não aparece.
export default function UpdateBanner() {
  const [behind, setBehind] = useState(0)
  const [state, setState] = useState<'idle' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()

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

  if (behind === 0 && state === 'idle') return null

  function update() {
    start(async () => {
      const res = await applyUpdate()
      setState(res.ok ? 'done' : 'error')
      setMsg(res.message)
      if (res.ok) setBehind(0)
    })
  }

  const tone = state === 'error' ? 'var(--color-danger)' : 'var(--color-accent)'
  return (
    <div
      className="cp-rise mb-2 flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
      style={{ background: `color-mix(in oklch, ${tone} 15%, transparent)`, color: tone }}
    >
      {state === 'done' ? (
        <span className="flex items-center gap-2 font-medium">
          <Check /> {msg}
        </span>
      ) : state === 'error' ? (
        <span className="flex items-center gap-2 font-medium">
          <Warn /> Falha ao atualizar: {msg}
        </span>
      ) : (
        <>
          <span className="font-medium">
            Nova versão disponível ({behind} commit{behind > 1 ? 's' : ''}).
          </span>
          <button
            onClick={update}
            disabled={pending}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent-fg)] disabled:opacity-60"
          >
            <Download />
            {pending ? 'atualizando…' : 'Atualizar agora'}
          </button>
        </>
      )}
    </div>
  )
}

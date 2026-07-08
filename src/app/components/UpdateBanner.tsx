'use client'

import { useEffect, useState, useTransition } from 'react'
import { checkUpdate, applyUpdate } from '../actions'
import { Download, Check, Warn } from './icons'

// Aviso de "nova versão" no rodapé da sidebar (compacto). Checa via git; offline/sem
// origin → não aparece. Atualiza com um clique (git pull + build).
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
      className="cp-rise mx-1 mb-2 rounded-xl px-3 py-2.5 text-xs"
      style={{ background: `color-mix(in oklch, ${tone} 14%, transparent)`, color: tone }}
    >
      {state === 'done' ? (
        <span className="flex items-center gap-1.5 font-medium">
          <Check /> Atualizado — reabra o app
        </span>
      ) : state === 'error' ? (
        <span className="flex items-start gap-1.5 font-medium">
          <Warn /> Falha ao atualizar
        </span>
      ) : (
        <>
          <div className="font-medium">
            Nova versão ({behind} commit{behind > 1 ? 's' : ''})
          </div>
          <button
            onClick={update}
            disabled={pending}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-2.5 py-1 font-semibold text-[var(--color-accent-fg)] disabled:opacity-60"
          >
            <Download />
            {pending ? 'atualizando…' : 'Atualizar'}
          </button>
        </>
      )}
    </div>
  )
}

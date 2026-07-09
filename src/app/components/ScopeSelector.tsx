'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chevron, Check } from './icons'

// Seletor de escopo: Usuário (global) ou um dos projetos que você já usou.
// Navega por ?project=<path> (server-driven). O co-panel relê a config daquele escopo.
export default function ScopeSelector({
  projects,
  active,
}: {
  projects: { path: string; name: string }[]
  active: string | null
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const activeName = active ? projects.find((p) => p.path === active)?.name ?? 'projeto' : 'Usuário (global)'

  function pick(path: string | null) {
    setOpen(false)
    router.push(path ? `/?project=${encodeURIComponent(path)}` : '/')
  }

  const item =
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left hover:bg-[var(--color-surface-2)]'

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
      >
        <span className="text-[var(--color-muted)]">escopo</span>
        <span className="font-medium">{activeName}</span>
        <span className="text-[var(--color-muted)]">
          <Chevron />
        </span>
      </button>
      {open && (
        <div
          className="absolute left-0 z-30 mt-1 max-h-80 w-64 overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-xl"
          role="listbox"
        >
          <button onClick={() => pick(null)} className={item} role="option" aria-selected={!active}>
            <span className="grid w-4 shrink-0 place-items-center">{!active && <Check />}</span>
            <span className="truncate">Usuário (global)</span>
          </button>
          {projects.length > 0 && <div className="my-1 border-t border-[var(--color-border)]" />}
          {projects.map((p) => (
            <button
              key={p.path}
              onClick={() => pick(p.path)}
              className={item}
              role="option"
              aria-selected={active === p.path}
              title={p.path}
            >
              <span className="grid w-4 shrink-0 place-items-center">{active === p.path && <Check />}</span>
              <span className="truncate">{p.name}</span>
            </button>
          ))}
          {projects.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-[var(--color-muted)]">Nenhum projeto conhecido ainda.</p>
          )}
        </div>
      )}
    </div>
  )
}

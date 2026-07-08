import type { SVGProps } from 'react'

// Pack de ícones SVG monocromáticos, stroke 2, 24×24, herdam currentColor.
// Sem emoji, nunca. Falta um? Cria aqui seguindo o mesmo traço.

function Base({ children, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  )
}

export const Chevron = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="m9 6 6 6-6 6" />
  </Base>
)
export const Plugin = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M3 9h18M9 3v18" />
  </Base>
)
export const Skill = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 4.5 13.6 9 18 10.5 13.6 12 12 16.5 10.4 12 6 10.5 10.4 9z" />
  </Base>
)
export const Command = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="m6 8 4 4-4 4M12 16h6" />
  </Base>
)
export const Agent = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <rect x="5" y="8" width="14" height="11" rx="2" />
    <path d="M12 8V5M9 13h.01M15 13h.01" />
  </Base>
)
export const Mcp = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0zM12 17v4" />
  </Base>
)
export const Hook = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
  </Base>
)
export const Download = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
  </Base>
)
export const Upload = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 21V9m0 0 4 4m-4-4-4 4M5 3h14" />
  </Base>
)
export const Compass = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m16 8-2 6-6 2 2-6z" />
  </Base>
)
export const Check = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="m5 12 4 4 10-10" />
  </Base>
)
export const Warn = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 3 2 20h20zM12 10v5M12 18h.01" />
  </Base>
)
export const Wrench = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M15 6a4 4 0 0 0-5.3 5.3L4 17l3 3 5.7-5.7A4 4 0 0 0 18 9l-2.2 2.2-2-2z" />
  </Base>
)
export const Dots = (p: SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="12" cy="5" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="12" cy="19" r="1.7" />
  </svg>
)
export const X = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Base>
)
// Sunburst inspirado no símbolo do Claude — 12 raios a partir do centro.
export const Spark = (p: SVGProps<SVGSVGElement>) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
    strokeLinecap="round"
    aria-hidden="true"
    {...p}
  >
    {Array.from({ length: 12 }).map((_, i) => (
      <line key={i} x1="32" y1="9" x2="32" y2="25" transform={`rotate(${i * 30} 32 32)`} />
    ))}
  </svg>
)

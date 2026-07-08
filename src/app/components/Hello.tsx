import { Spark } from './icons'

// Entrada assinatura do co-panel: símbolo (sunburst coral) + wordmark serifado + floreio.
export default function Hello() {
  return (
    <div className="cp-rise flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-accent)]">
        <Spark />
      </span>
      <div className="flex flex-col leading-none">
        <span className="wordmark text-xl">co-panel</span>
        <svg
          width="132"
          height="12"
          viewBox="0 0 132 12"
          fill="none"
          aria-hidden="true"
          className="mt-0.5 overflow-visible"
        >
          <path
            className="cp-flourish"
            pathLength={1}
            d="M2 8 C 22 2, 44 2, 64 7 S 108 12, 130 4"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}

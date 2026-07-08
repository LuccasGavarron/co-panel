import { Spark } from './icons'

// Marca do co-panel: símbolo (sunburst coral, sem caixa, grande) + wordmark encorpado
// com o floreio passando pelo meio da palavra.
export default function Hello() {
  return (
    <div className="cp-rise">
      <Spark className="mb-3 size-11 text-[var(--color-accent)]" />
      <div className="relative inline-block">
        <span className="wordmark block whitespace-nowrap text-4xl leading-none">co-panel</span>
        <svg
          className="pointer-events-none absolute inset-x-0 top-[56%] w-full overflow-visible"
          viewBox="0 0 200 18"
          height="16"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="cp-flourish"
            pathLength={1}
            d="M4 10 C 44 3, 92 3, 122 9 S 182 15, 196 6"
            stroke="var(--color-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  )
}

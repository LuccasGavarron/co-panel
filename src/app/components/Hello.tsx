import { Spark } from './icons'

// Marca: símbolo (sunburst coral) + wordmark AO LADO, com o floreio logo ABAIXO da palavra.
export default function Hello() {
  return (
    <div className="cp-rise flex items-center gap-2.5">
      <Spark className="size-9 shrink-0 text-[var(--color-accent)]" />
      <div className="inline-block">
        <span className="wordmark block whitespace-nowrap text-2xl leading-none">co-panel</span>
        <svg
          className="mt-1 block w-full overflow-visible"
          viewBox="0 0 140 10"
          height="8"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="cp-flourish"
            pathLength={1}
            d="M2 6 C 32 2, 72 2, 100 6 S 132 9, 138 4"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  )
}

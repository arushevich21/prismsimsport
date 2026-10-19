// One beam in, three colours out: the idea behind the name.
export function PrismBeam({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 80" className={className}>
      <path d="M0 44 L105 40" stroke="#14161B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M105 40 L134 42" stroke="#5B6068" strokeWidth="1.5" />
      <polygon points="120,6 152,72 88,72" fill="none" stroke="#14161B" strokeWidth="2" strokeLinejoin="round" />
      <path d="M134 40 L240 16" stroke="#9CC4F2" strokeWidth="4" />
      <path d="M136 42 L240 40" stroke="#A5A8F7" strokeWidth="4" />
      <path d="M136 44 L240 64" stroke="#FFB678" strokeWidth="4" />
    </svg>
  )
}

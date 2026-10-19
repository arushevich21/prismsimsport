// The three-colour "prism" stripe used under the header.
export function SpectrumRule({ className = 'h-1' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`grid grid-cols-3 ${className}`}>
      <div className="bg-ice" />
      <div className="bg-iris" />
      <div className="bg-ember" />
    </div>
  )
}

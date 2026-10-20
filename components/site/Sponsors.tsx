import Image from 'next/image'
import { SUPPORTERS, TITLE_SPONSOR, type Sponsor } from '@/lib/site'
import { eyebrow } from '@/lib/ui'

// One sponsor: label, logo, then their line about themselves.
function SponsorRow({ label, s, className = '' }: { label: string; s: Sponsor; className?: string }) {
  const mark = s.logo ? (
    <Image src={s.logo.src} alt={s.name} width={s.logo.width} height={s.logo.height} className="h-11 w-auto sm:h-14" />
  ) : (
    <span className="font-heading text-xl font-bold tracking-wide text-white uppercase">{s.name}</span>
  )
  return (
    <div className={`flex flex-col gap-5 md:flex-row md:items-center md:gap-10 ${className}`}>
      <span className={`${eyebrow} shrink-0 text-muted-dark md:w-32`}>{label}</span>
      {/* Fixed-width logo column, so the blurbs line up whatever the logo's shape. */}
      {s.url ? <a href={s.url} aria-label={s.name} className="shrink-0 md:w-80">{mark}</a> : <span className="shrink-0 md:w-80">{mark}</span>}
      {s.blurb && <p className="flex-1 leading-relaxed text-body-dark">{s.blurb}</p>}
    </div>
  )
}

// Title sponsor, then the supporters, on a dark background.
export function Sponsors() {
  return (
    <div className="page-x flex flex-col gap-8 py-9 sm:py-12">
      <SponsorRow label="Sponsored by" s={TITLE_SPONSOR} />
      {SUPPORTERS.map((s) => (
        <SponsorRow key={s.name} label="Supported by" s={s} className="border-t border-graphite-3 pt-8" />
      ))}
    </div>
  )
}

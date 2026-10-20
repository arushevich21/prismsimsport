import Image from 'next/image'
import { SUPPORTERS, TITLE_SPONSOR, type Sponsor } from '@/lib/site'
import { eyebrow } from '@/lib/ui'

function Supporter({ s }: { s: Sponsor }) {
  const mark = s.logo ? (
    <Image src={s.logo.src} alt={s.name} title={s.name} width={s.logo.width} height={s.logo.height} className="h-10 w-auto max-w-[140px] object-contain sm:h-12" />
  ) : (
    <span className="font-heading text-lg font-bold tracking-wide text-white uppercase">{s.name}</span>
  )
  return s.url ? <a href={s.url} aria-label={s.name} className="flex items-center opacity-80 transition-opacity hover:opacity-100">{mark}</a> : <span className="flex items-center opacity-80">{mark}</span>
}

// Title sponsor plus the supporters row, on a dark background.
export function Sponsors() {
  return (
    <div className="page-x flex flex-col gap-8 py-9 sm:py-12">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-10">
        <span className={`${eyebrow} text-muted-dark md:w-32`}>Sponsored by</span>
        <a href={TITLE_SPONSOR.url} aria-label={TITLE_SPONSOR.name} className="shrink-0">
          <Image src={TITLE_SPONSOR.logo.src} alt={TITLE_SPONSOR.name} width={TITLE_SPONSOR.logo.width} height={TITLE_SPONSOR.logo.height} className="h-10 w-auto sm:h-12" />
        </a>
        <p className="flex-1 leading-relaxed text-body-dark">{TITLE_SPONSOR.blurb}</p>
      </div>
      <div className="flex flex-col gap-5 border-t border-graphite-3 pt-8 md:flex-row md:items-center md:gap-10">
        <span className={`${eyebrow} text-muted-dark md:w-32`}>Supported by</span>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
          {SUPPORTERS.map((s) => <Supporter key={s.name} s={s} />)}
        </div>
      </div>
    </div>
  )
}

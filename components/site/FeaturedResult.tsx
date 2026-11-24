import Image from 'next/image'
import { carMake } from '@/lib/cars'
import { CAR_PHOTOS, classChip } from '@/lib/site'
import { SIM_LABEL, type Result } from '@/lib/types'
import { CarLogo } from './CarLogo'

function longDate(date: string | null) {
  if (!date) return null
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Our most recent result, set large: the finishing position is the headline,
// beside a photo of the car that raced when we have one.
export function FeaturedResult({ result }: { result: Result }) {
  const position = result.finish ? `P${result.finish}` : '—'
  const date = longDate(result.raced_on)
  const make = carMake(result.car)
  const photo = make ? CAR_PHOTOS[result.sim]?.[make.name] : undefined

  return (
    <article className="relative isolate overflow-hidden rounded-2xl bg-graphite-2 md:flex md:min-h-[24rem] md:items-center">
      {photo && (
        <div className="relative aspect-[16/9] md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:w-[58%]">
          <Image src={photo} alt="" fill sizes="(min-width: 48rem) 58vw, 100vw" className="object-cover object-[50%_85%]" />
          {/* Fades the photo into the card behind the text */}
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,var(--color-graphite-2)_0%,transparent_45%)] md:bg-[linear-gradient(90deg,var(--color-graphite-2)_0%,rgb(30_33_40/0.6)_35%,transparent_70%)]" />
        </div>
      )}
      <div className={`relative flex flex-col gap-5 p-6 sm:p-10 lg:p-12 ${photo ? '-mt-16 md:mt-0 md:max-w-[52%]' : ''}`}>
        <span className="font-heading text-[5.5rem] leading-[0.8] font-extrabold tabular-nums sm:text-[8rem]">{position}</span>
        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-2xl leading-tight font-bold sm:text-3xl">{result.championship ?? 'Race'}</h3>
          <p className="text-body-dark">{[result.track, date].filter(Boolean).join(', ')}</p>
        </div>
        {(result.car || result.class) && (
          <p className="flex flex-wrap items-center gap-2.5 text-[15px]">
            <CarLogo car={result.car} size="sm" />
            {result.car}
            {result.class && <span className={`rounded px-2 py-0.5 text-xs font-semibold text-ink ${classChip(result.class)}`}>{result.class}</span>}
            <span className="text-muted-dark">{SIM_LABEL[result.sim]}</span>
          </p>
        )}
      </div>
    </article>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import { Editable } from '@/components/admin/Editable'
import { DriverList } from '@/components/site/DriverList'
import { FeaturedResult } from '@/components/site/FeaturedResult'
import { NextRaceCard } from '@/components/site/NextRaceCard'
import { ResultsList } from '@/components/site/ResultsList'
import { SeasonRecord } from '@/components/site/SeasonRecord'
import { Sponsors } from '@/components/site/Sponsors'
import { getLatestResults, getMainLineup, getNextRace, getSeasonResults, getSeasons } from '@/lib/data'
import { DISCORD_INVITE_URL, INSTAGRAM_URL, PHOTOS, SITE_URL, SUPPORTERS, TITLE_SPONSOR } from '@/lib/site'
import { btn, h1, h2, section } from '@/lib/ui'

// Rebuilt in the background at most every 5 minutes; admin edits refresh it immediately.
export const revalidate = 300

const link = 'tap inline-flex shrink-0 items-center text-[15px] font-semibold text-ice hover:text-white'
const body = 'text-[17px] leading-relaxed text-body-dark'

export default async function HomePage() {
  const [race, results, lineup, seasons] = await Promise.all([
    // The home page is PRISM's own LMU program; ACC lives on its team page.
    getNextRace('lmu'),
    getLatestResults(5, 'lmu'),
    getMainLineup('lmu'),
    getSeasons('lmu'),
  ])
  const season = seasons[0] ?? new Date().getFullYear()
  const record = await getSeasonResults('lmu', season)
  const discordHref = DISCORD_INVITE_URL ?? '/community'
  // The latest result with a finishing position is set large; the rest are listed.
  const latest = results.find((r) => r.finish) ?? results[0]
  const earlier = results.filter((r) => r !== latest)

  const hero = PHOTOS.hero
  const feature = PHOTOS.feature
  const intro = (
    <div className="flex flex-col gap-6 sm:gap-7">
      <h1 className={h1}>North America&apos;s challenge to the front of the grid.</h1>
      <p className={`max-w-xl ${body} sm:text-lg`}>
        PRISM is a sim racing esports team. We race Hypercar, LMP2, LMP3 and GT3 in Le Mans Ultimate endurance
        and sprint championships.
      </p>
      <div className="flex flex-col gap-3 xs:flex-row">
        <Link href="/team" className={btn.ice}>Meet the drivers</Link>
        <Link href="/team#results" className={btn.outlineDark}>See our results</Link>
      </div>
    </div>
  )
  const raceCard = (
    <Editable editor="race">
      <NextRaceCard race={race} />
    </Editable>
  )
  const seasonRecord = record.races > 0 && <SeasonRecord stats={record} caption={`${season} season in Le Mans Ultimate`} />

  // Tells search engines this is a sports team: its drivers, sponsors and accounts.
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: 'PRISM Sim Sport',
    alternateName: 'PRISM',
    sport: 'Sim racing',
    url: SITE_URL,
    logo: `${SITE_URL}/brand/prism-logo.png`,
    description: 'North American sim racing esports team racing Hypercar, LMP2, LMP3 and GT3 in Le Mans Ultimate.',
    sameAs: [INSTAGRAM_URL, DISCORD_INVITE_URL].filter(Boolean),
    athlete: lineup.map((d) => ({ '@type': 'Person', name: d.name })),
    sponsor: [TITLE_SPONSOR, ...SUPPORTERS].map((s) => ({ '@type': 'Organization', name: s.name, ...(s.url ? { url: s.url } : {}) })),
  }

  return (
    <div className="bg-graphite text-white">
      <script
        type="application/ld+json"
        // Escapes "<" so a driver's name can't close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      {hero ? (
        <>
          {/* Hero: the car on the right, the headline on the left where the photo fades to graphite */}
          <section className="relative isolate overflow-hidden">
            <div className="relative aspect-[16/9] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[78%]">
              <Image src={hero.src} alt={hero.alt} fill priority sizes="(min-width: 64rem) 78vw, 100vw" className="object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,var(--color-graphite)_0%,transparent_40%)] lg:bg-[linear-gradient(90deg,var(--color-graphite)_0%,rgb(21_23_28/0.55)_30%,transparent_60%),linear-gradient(0deg,var(--color-graphite)_0%,transparent_30%)]" />
            </div>
            <div className="page-x relative -mt-10 pb-12 sm:-mt-16 sm:pb-16 lg:mt-0 lg:flex lg:min-h-[min(82vh,46rem)] lg:items-center lg:py-24">
              <div className="lg:max-w-[42rem]">{intro}</div>
            </div>
          </section>

          {/* Race week: the season so far and the next race, side by side like a pit wall screen */}
          <section className="border-t border-graphite-3">
            <div className={`page-x grid items-center gap-10 py-10 sm:py-14 ${seasonRecord ? 'lg:grid-cols-[1.2fr_1fr] lg:gap-16' : ''}`}>
              {seasonRecord}
              <div className={seasonRecord ? '' : 'max-w-xl'}>{raceCard}</div>
            </div>
          </section>
        </>
      ) : (
        /* Hero without a photo: the headline beside the next-race panel */
        <section>
          <div className="page-x relative py-14 sm:py-20 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
              {intro}
              {raceCard}
            </div>
          </div>
          {seasonRecord && (
            <div className="border-t border-graphite-3 bg-graphite">
              <div className="page-x pt-5">{seasonRecord}</div>
            </div>
          )}
        </section>
      )}

      {/* Title sponsor, where pro teams put theirs: straight under the hero */}
      <a
        href={TITLE_SPONSOR.url}
        className="group block border-y border-graphite-3 bg-graphite-2"
        aria-label={`Presented by ${TITLE_SPONSOR.name}`}
      >
        <div className="page-x flex flex-col items-start gap-3 py-6 sm:flex-row sm:items-center sm:gap-6">
          <span className="text-sm text-muted-dark">Presented by</span>
          <Image
            src={TITLE_SPONSOR.logo.src}
            alt=""
            width={TITLE_SPONSOR.logo.width}
            height={TITLE_SPONSOR.logo.height}
            className="h-6 w-auto sm:h-7"
          />
          <span className="text-sm text-muted-dark group-hover:text-white sm:ml-auto">{TITLE_SPONSOR.blurb}</span>
        </div>
      </a>

      {/* Results: the latest one set large, the rest as a short list */}
      <section className={`${section} flex flex-col gap-6`}>
        <div className="flex items-end justify-between gap-4">
          <h2 className={h2}>Results</h2>
          <Link href="/team#results" className={link}>All results</Link>
        </div>
        {latest ? (
          <>
            <FeaturedResult result={latest} />
            {earlier.length > 0 && <ResultsList results={earlier} empty="" />}
          </>
        ) : (
          <ResultsList results={[]} empty="Results show up here after our next race." />
        )}
      </section>

      {/* Drivers, as a roster */}
      <section className="border-t border-graphite-3">
        <div className={`${section} flex flex-col gap-6`}>
          <div className="flex items-end justify-between gap-4">
            <h2 className={h2}>Drivers</h2>
            <Link href="/team" className={link}>Full team and academy</Link>
          </div>
          {lineup.length > 0 ? (
            <DriverList drivers={lineup} />
          ) : (
            <p className="text-muted-dark">The lineup is being finalised.</p>
          )}
        </div>
      </section>

      {/* Photo break, signed with the car's number */}
      {feature && (
        <figure className="relative h-[clamp(18rem,42vw,36rem)] overflow-hidden">
          <Image src={feature.src} alt={feature.alt} fill sizes="100vw" className="object-cover object-[50%_85%]" />
          {(feature.number || feature.caption) && (
            <figcaption className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgb(21_23_28/0.9)_0%,transparent_100%)] pt-16 pb-5">
              <span className="page-x flex items-end gap-4">
                {feature.number && <span className="font-heading text-6xl leading-[0.85] font-extrabold sm:text-8xl">{feature.number}</span>}
                {feature.caption && <span className="pb-1 text-sm text-body-dark">{feature.caption}</span>}
              </span>
            </figcaption>
          )}
        </figure>
      )}

      {/* Partners */}
      <section id="partners" className="scroll-mt-24 bg-graphite-2">
        <div className="page-x flex flex-col gap-3 pt-16 sm:pt-24">
          <h2 className={h2}>Partners</h2>
          <p className={`max-w-2xl ${body}`}>Want your brand on our cars and broadcasts? Talk to us in the Discord.</p>
        </div>
        <Sponsors />
      </section>

      {/* About */}
      <section className={`${section} grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16`}>
        <h2 className={h2}>About PRISM</h2>
        <div className="flex flex-col gap-5">
          <p className={`${body} sm:text-lg sm:leading-[1.7]`}>
            The top of sim racing has always leaned European. North America has drivers who can run with them, but rarely a
            team that brings them together, pushes them and gets them seen.
          </p>
          <p className={`${body} sm:text-lg sm:leading-[1.7]`}>
            PRISM is that team. One beam of light in, a full spectrum out: drivers arrive with raw pace and leave with the
            data, the racecraft and the confidence to race anyone, anywhere.
          </p>
          <p className="text-sm text-muted-dark">Anton Rushevich, founder, LMU GT3 team captain and head coach</p>
        </div>
      </section>

      {/* Join */}
      <section className="border-t border-graphite-3">
        <div className={`${section} flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16`}>
          <div className="flex max-w-2xl flex-col gap-4">
            <h2 className={h2}>Race for PRISM</h2>
            <p className={body}>
              Lineups are picked from our Discord and our academy. Join, train with our coaches, and earn a seat.
            </p>
          </div>
          <div className="flex flex-col gap-3 xs:flex-row lg:shrink-0">
            <a href={discordHref} className={btn.ice}>Join the Discord</a>
            <Link href="/academy" className={btn.outlineDark}>Explore the academy</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import { NextRaceCard } from '@/components/site/NextRaceCard'
import { PrismBeam } from '@/components/site/PrismBeam'
import { ResultsList } from '@/components/site/ResultsList'
import { getLatestResults, getNextRace } from '@/lib/data'
import { DISCORD_INVITE_URL, PARTNERS } from '@/lib/site'
import { btn, eyebrow, h1, h2, section } from '@/lib/ui'

// Rebuilt in the background at most every 5 minutes; admin edits refresh it immediately.
export const revalidate = 300

const PILLARS = [
  {
    title: 'eSports team',
    body: 'Entries in endurance and sprint championships on Le Mans Ultimate, plus the ACC program run with Falcon Motorsport.',
    href: '/team',
    link: 'Lineups and results',
    bar: 'bg-ice',
    text: 'text-ice-deep',
    icon: <path d="M4 21V4M4 4h13l-2 4 2 4H4" />,
  },
  {
    title: 'Community',
    body: 'A Discord full of sim racers who care about the same tenth you do: setups, replays and people to run laps with.',
    href: '/community',
    link: 'Join the community',
    bar: 'bg-iris',
    text: 'text-iris-deep',
    icon: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14.5c2.3 0 4 1.4 4.5 4" /></>,
  },
  {
    title: 'Academy',
    body: '1-on-1 coaching, telemetry review, setups and a video library for drivers who want to find more pace.',
    href: '/academy',
    link: 'Get coached',
    bar: 'bg-ember',
    text: 'text-ember-deep',
    icon: <><path d="M3 17l5-6 4 3 6-8" /><path d="M14 6h4v4" /><path d="M3 21h18" /></>,
  },
]

const STEPS = [
  { title: 'Join the Discord', body: 'Say hi, grab your sim roles, find people to run with.' },
  { title: 'Get faster with the Academy', body: '1-on-1 coaching, telemetry review and setups when you want to step up.' },
  { title: 'Try out for the team', body: 'Get in touch with our captains!' },
]

export default async function HomePage() {
  const [race, results] = await Promise.all([getNextRace(), getLatestResults(3)])
  const discordHref = DISCORD_INVITE_URL ?? '/community'

  return (
    <>
      {/* Hero */}
      <section className="bg-graphite text-white">
        <div className="page-x grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:py-24">
          <div className="flex flex-col gap-6 sm:gap-7">
            <div className="flex items-center gap-3">
              <Image src="/brand/prism-mark-light.png" alt="" width={164} height={164} className="h-8 w-8 sm:h-9 sm:w-9" />
              <span className={`${eyebrow} text-ice`}>Le Mans Ultimate · ACC</span>
            </div>
            <h1 className={h1}>A team you race for. A community you race with.</h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-body-dark sm:text-lg">
              PRISM is a sim racing community and a competitive eSports team. Le Mans Ultimate is home. In ACC we race
              alongside our partners at Falcon Motorsport.
            </p>
            <div className="flex flex-col gap-3 xs:flex-row">
              <a href={discordHref} className={btn.ice}>Join the Discord</a>
              <Link href="/team" className={btn.outlineDark}>Meet the team</Link>
            </div>
          </div>
          <NextRaceCard race={race} />
        </div>
      </section>

      {/* Where we race */}
      <section className="border-b border-line">
        <div className="page-x flex flex-col gap-4 py-7 md:flex-row md:items-center md:gap-14">
          <span className={`${eyebrow} text-muted`}>Where we race</span>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <span className="font-heading text-base font-bold sm:text-lg">Le Mans Ultimate</span>
            <span className="text-sm text-muted">Primary platform</span>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <span className="font-heading text-base font-bold sm:text-lg">Assetto Corsa Competizione</span>
            <span className="text-sm text-muted">With Falcon Motorsport</span>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className={`${section} flex flex-col gap-10 sm:gap-12`}>
        <div className="flex max-w-2xl flex-col gap-3.5">
          <h2 className={h2}>One team, three sides.</h2>
          <p className="text-[17px] leading-relaxed text-[#4a4f57]">
            Race for the team, race with the community, or come to get faster. Most people end up doing all three.
          </p>
        </div>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <article key={p.title} className="flex flex-col overflow-hidden rounded-xl border border-line">
              <div aria-hidden="true" className={`h-1 ${p.bar}`} />
              <div className="flex flex-1 flex-col gap-3.5 p-6 sm:p-8">
                <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={p.text}>
                  {p.icon}
                </svg>
                <h3 className="font-heading text-xl font-bold sm:text-[1.35rem]">{p.title}</h3>
                <p className="flex-1 leading-relaxed text-[#4a4f57]">{p.body}</p>
                <Link href={p.href} className={`tap inline-flex items-center text-[15px] font-semibold ${p.text}`}>
                  {p.link} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-mist">
        <div className={`${section} grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-16`}>
          <div className="flex flex-col gap-5 sm:gap-6">
            <span className={`${eyebrow} text-iris-deep`}>About us</span>
            <h2 className={h2}>Why I started PRISM.</h2>
            <p className="text-[17px] leading-[1.7] text-[#33373e] sm:text-lg">
              I&apos;m Anton Rushevich. Everything I teach, I taught myself first: years of trial, error and obsessing
              over the data. I&apos;ve spent 5+ years coaching across multiple disciplines, and I captain our LMU GT3 team.
            </p>
            <p className="text-[17px] leading-[1.7] text-[#33373e] sm:text-lg">
              I started PRISM because North American sim racing was missing something: a real community. The top of this
              sport has always leaned European, and the drivers over here who can run with them rarely had a place to come
              together, push each other and get seen.
            </p>
            <p className="text-[17px] leading-[1.7] text-[#33373e] sm:text-lg">
              PRISM is that place, and it&apos;s built to do two things at once. Grow into a large, thriving community
              where anyone can find people to race with. And put a team on the grid that challenges at the very top,
              proving NA has drivers who can go toe-to-toe with the best in Europe.
            </p>
            <div className="flex flex-col gap-0.5 border-t border-[#d5dae1] pt-4">
              <span className="font-semibold">Anton Rushevich</span>
              <span className="text-sm text-muted">Founder · LMU GT3 team captain · Head coach</span>
            </div>
          </div>
          <div className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-6 sm:p-8">
            <PrismBeam className="h-auto w-full max-w-[280px]" />
            <h3 className="font-heading text-lg font-bold">Why “PRISM”</h3>
            <p className="leading-[1.7] text-[#33373e]">
              Shine one beam of light into a prism and a whole spectrum comes out the other side. That&apos;s what we want
              for every driver who joins. Someone arrives with raw pace and a lot of questions, and leaves with the data,
              the racecraft and the confidence to race anyone, anywhere. One light in, every colour out.
            </p>
          </div>
        </div>
      </section>

      {/* Latest results */}
      <section className={`${section} flex flex-col gap-7`}>
        <div className="flex items-end justify-between gap-4">
          <h2 className={h2}>Latest results</h2>
          <Link href="/team#results" className="tap inline-flex shrink-0 items-center text-[15px] font-semibold text-iris-deep">
            All results →
          </Link>
        </div>
        <ResultsList results={results} showSim empty="Results show up here after our next race." />
      </section>

      {/* Partners */}
      <section className="bg-graphite text-white">
        <div className={`${section} grid items-center gap-10 lg:grid-cols-2 lg:gap-14`}>
          <a href={PARTNERS.falcon.url} className="flex justify-center rounded-xl border border-graphite-3 bg-graphite-2 p-8 sm:p-12" aria-label="Falcon Motorsport">
            <Image src="/brand/falcon-logo.png" alt="Falcon Motorsport" width={1200} height={848} className="h-auto w-full max-w-[320px]" />
          </a>
          <div className="flex flex-col gap-5">
            <span className={`${eyebrow} text-ember`}>ACC partner</span>
            <h2 className={h2}>Driven by competition. United by precision.</h2>
            <p className="text-[17px] leading-relaxed text-body-dark sm:text-lg">
              Falcon Motorsport brings together dedicated sim racers to compete in championships and endurance events
              across Assetto Corsa Competizione. Every lap demands focus, every decision matters, and every race is an
              opportunity to prove ourselves.
            </p>
          </div>
        </div>
        <div className="border-t border-graphite-3">
          <div className="page-x flex flex-col gap-5 py-9 md:flex-row md:items-center md:gap-10">
            <span className={`${eyebrow} text-muted-dark`}>Supported by</span>
            <a href={PARTNERS.cube.url} aria-label="Cube Controls" className="shrink-0">
              <Image src="/brand/cube-controls-white.png" alt="Cube Controls" width={1137} height={290} className="h-11 w-auto sm:h-14" />
            </a>
            <p className="flex-1 leading-relaxed text-body-dark">
              Redefining the sim racing experience, offering high-quality products for the most demanding virtual drivers.
            </p>
          </div>
        </div>
      </section>

      {/* Join */}
      <section className={`${section} flex flex-col gap-10`}>
        <h2 className={h2}>Pull up a seat.</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2.5 border-t-2 border-ink pt-5">
              <span className="font-mono text-[13px] text-muted">0{i + 1}</span>
              <span className="text-lg font-semibold">{s.title}</span>
              <span className="leading-relaxed text-[#4a4f57]">{s.body}</span>
            </li>
          ))}
        </ol>
        <a href={discordHref} className={`${btn.dark} self-stretch xs:self-start`}>Join the Discord</a>
      </section>
    </>
  )
}

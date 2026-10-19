import type { Metadata } from 'next'
import Link from 'next/link'
import { getDiscordCounts } from '@/lib/data'
import { DISCORD_INVITE_URL } from '@/lib/site'
import { btn, eyebrow, h1, h2, section } from '@/lib/ui'

export const revalidate = 900

export const metadata: Metadata = {
  title: 'Community',
  description: 'Clean racing and good people. Join the PRISM sim racing Discord.',
}

const PERKS = [
  { text: 'People to practice and race with', color: 'text-ice' },
  { text: 'Setups, replays and lap-time chat per car', color: 'text-iris' },
  { text: 'Team tryout and academy announcements', color: 'text-ember' },
]

export default async function CommunityPage() {
  const counts = await getDiscordCounts()
  const fmt = new Intl.NumberFormat('en-US')

  return (
    <>
      <section className="bg-graphite text-white">
        <div className="page-x grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col gap-5 sm:gap-6">
            <span className={`${eyebrow} text-iris`}>Community</span>
            <h1 className={h1}>Clean racing. Good people.</h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-body-dark sm:text-lg">
              You don&apos;t need to be on the team to be part of PRISM. The Discord is where drivers swap setups, share
              replays and find people to run laps with.
            </p>
          </div>

          <div id="join" className="flex flex-col gap-5 rounded-xl border border-graphite-3 bg-graphite-2 p-6 sm:p-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-[#5865F2]">
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v10H8l-4 4z" /></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold">PRISM Discord</span>
                {counts && (
                  <span className="text-sm text-muted-dark">
                    {fmt.format(counts.members)} members · {fmt.format(counts.online)} online
                  </span>
                )}
              </div>
            </div>
            <ul className="flex flex-col gap-2.5 text-[15px] text-body-dark">
              {PERKS.map((p) => (
                <li key={p.text} className="flex gap-2.5">
                  <span aria-hidden="true" className={p.color}>—</span>
                  {p.text}
                </li>
              ))}
            </ul>
            {DISCORD_INVITE_URL ? (
              <a href={DISCORD_INVITE_URL} className={btn.iris}>Join the Discord</a>
            ) : (
              <p className="text-sm text-muted-dark">Invite link coming soon.</p>
            )}
          </div>
        </div>
      </section>

      <section className={`${section} grid gap-5 md:grid-cols-2`}>
        <article className="flex flex-col gap-3.5 rounded-xl border border-line p-6 sm:p-8">
          <h2 className="font-heading text-xl font-bold sm:text-2xl">Want to race for PRISM?</h2>
          <p className="leading-relaxed text-[#4a4f57]">
            Our team captains run tryouts for the LMU and ACC lineups. Get in touch with them in the Discord.
          </p>
          <Link href="/team" className="tap inline-flex items-center font-semibold text-ice-deep">Meet the team →</Link>
        </article>
        <article className="flex flex-col gap-3.5 rounded-xl border border-line p-6 sm:p-8">
          <h2 className="font-heading text-xl font-bold sm:text-2xl">Want to get faster?</h2>
          <p className="leading-relaxed text-[#4a4f57]">
            PRISM Academy offers 1-on-1 coaching, telemetry review and setups, from the people who race for the team.
          </p>
          <Link href="/academy" className="tap inline-flex items-center font-semibold text-ember-deep">See the Academy →</Link>
        </article>
      </section>

      <section className="bg-mist">
        <div className={`${section} flex flex-col items-start gap-5`}>
          <h2 className={h2}>See you on track.</h2>
          <a href={DISCORD_INVITE_URL ?? '#join'} className={`${btn.dark} self-stretch xs:self-start`}>Join the Discord</a>
        </div>
      </section>
    </>
  )
}

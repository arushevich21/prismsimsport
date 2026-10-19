import type { Metadata } from 'next'
import Link from 'next/link'
import { Flag } from '@/components/site/Flag'
import { btn, eyebrow, h1, h2, section } from '@/lib/ui'

export const metadata: Metadata = {
  title: 'Academy',
  description: '1-on-1 sim racing coaching in driving, data and setup, from PRISM drivers.',
}

const COACHES = [
  {
    name: 'Anton Rushevich',
    initials: 'AR',
    country: 'US',
    tag: 'Founder · Head coach',
    tagClass: 'bg-ember',
    line: 'PRISM founder · LMU GT3 team captain',
    bio: 'Anton started the Academy to make serious coaching personal. Everything he teaches he taught himself first, through years of trial, error and obsessing over the data, and he’s spent 5+ years teaching across multiple disciplines.',
  },
  {
    name: 'Adam Krolikowski',
    initials: 'AK',
    country: 'US',
    tag: 'Coach',
    tagClass: 'bg-ice',
    line: 'PRISM LMU driver',
    bio: 'One of Anton’s longest-standing students. Adam has spent four seasons of GT3 Team Series on SRA under his wing, about a year and a half, knows the method inside out and coaches it the same way: meet the driver at their level, then build pace, consistency and racecraft.',
  },
]

const INCLUDED = [
  { title: 'Video library', body: 'Track guides and coaching breakdowns, filtered by car and track.', icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9.5v5l4-2.5z" /></> },
  { title: 'Telemetry review', body: 'Upload your laps, get written feedback from your coach.', icon: <><path d="M3 17l5-6 4 3 6-8" /><path d="M3 21h18" /></> },
  { title: 'Setups', body: 'Qualifying, race, wet and stable setups to download.', icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></> },
  { title: 'Ask your coach', body: 'Message your coach any time between sessions.', icon: <path d="M4 6h16v10H8l-4 4z" /> },
]

const TESTIMONIALS = [
  {
    quote: "If you want to compete at the front, Anton will help get you there. Fast drivers don't necessarily make great coaches, but this guy really puts in the work on both sides. With multiple championships under his belt, Anton's proven expertise comes through in every session - and between them, too. Blending technical knowledge to spot subtle technique and setup issues with strategy and experience to put it all together, Anton meets you at your level to improve your pace, consistency, and racecraft. Working with Anton has helped me improve tremendously, and I've seen the growth of others he coaches first hand. Anyway, I love Anton as a coach, but also as a human being. I definitely recommend working with him.",
    name: 'Adam K.',
    mark: 'text-ice',
  },
  {
    quote: "Because of Anton's coaching, my driving improved tremendously. I was able to learn things for myself and apply that on track. I went from midpack at best to fighting at the front. Thanks Anton!",
    name: 'Jacob R.',
    mark: 'text-iris',
  },
  {
    quote: "I talked to Anton about a coaching session, and after the first one, I was hooked. I've never been coached, so this was a game changer. Overall, my experience has been excellent. The way he helps you in every corner and even goes into the smallest details is incredibly valuable. What I liked the most was his ability to adapt to my learning pace. He knows how to balance the amount of information without overwhelming you. I would highly recommend PRISM Academy to anyone who wants to improve.",
    name: 'Ian K.',
    mark: 'text-ember',
  },
]

const SESSIONS = [
  { minutes: 30, price: '$20', bestFor: 'Quick telemetry review or dialing in a single corner or sector' },
  { minutes: 60, price: '$35', bestFor: 'A full session on one track: driving, data, and setup' },
  { minutes: 90, price: '$50', bestFor: 'Deep dive across multiple tracks or full race-weekend prep' },
]

const STEPS = [
  { title: 'Sign in with Discord', body: 'One account for the community, the team and the Academy.' },
  { title: 'Tell us where you are', body: 'What you want to improve, your goals and your experience so far.' },
  { title: 'Get matched, then book', body: 'Once approved you unlock the member area and session booking.' },
]

function Testimonial({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <figure className="flex flex-col gap-5 rounded-xl border border-graphite-3 bg-graphite-2 p-6 sm:p-9">
      <span aria-hidden="true" className={`font-heading text-5xl leading-[0.6] ${t.mark}`}>“</span>
      <blockquote className="text-base leading-[1.7] text-[#e3e6eb] sm:text-[17px]">{t.quote}</blockquote>
      <figcaption className="flex items-center gap-3 border-t border-graphite-3 pt-4">
        <span className="font-semibold">{t.name}</span>
        <span className="font-mono text-xs text-muted-dark">ACC</span>
      </figcaption>
    </figure>
  )
}

export default function AcademyPage() {
  return (
    <>
      <section className="bg-graphite text-white">
        <div className="page-x flex flex-col gap-5 py-14 sm:gap-6 sm:py-20 lg:py-24">
          <span className={`${eyebrow} text-ember`}>PRISM Academy</span>
          <h1 className={`${h1} max-w-4xl`}>Find the time you&apos;re leaving on track.</h1>
          <p className="max-w-2xl text-[17px] leading-relaxed text-body-dark sm:text-lg">
            1-on-1 coaching in driving, data and setup. Members also get the video library, setups and telemetry review
            between sessions.
          </p>
          <div className="mt-2 flex flex-col gap-3 xs:flex-row">
            <Link href="/apply" className={btn.ember}>Apply for coaching</Link>
            <a href="#coaches" className={btn.outlineDark}>Meet the coaches</a>
          </div>
        </div>
      </section>

      <section id="coaches" className={`${section} flex scroll-mt-24 flex-col gap-10`}>
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 className={h2}>Meet the coaches</h2>
          <p className="text-[17px] leading-relaxed text-[#4a4f57]">
            Personal, accessible coaching: steady growth, clear goals, and finding your own pace without the pressure to
            drive like someone else.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {COACHES.map((c) => (
            <article key={c.name} className="flex flex-col gap-5 rounded-xl border border-line p-6 sm:flex-row sm:p-7">
              <div aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-graphite font-heading text-2xl font-bold text-muted-dark/50 sm:h-28 sm:w-28 sm:text-3xl">
                {c.initials}
              </div>
              <div className="flex flex-col gap-3">
                <span className={`self-start rounded px-2 py-1 text-[11px] font-semibold tracking-wider text-ink uppercase ${c.tagClass}`}>{c.tag}</span>
                <h3 className="font-heading text-xl font-bold sm:text-[1.35rem]">{c.name}</h3>
                <div className="flex items-center gap-2 text-sm text-[#4a4f57]">
                  <Flag code={c.country} />
                  {c.line}
                </div>
                <p className="leading-relaxed text-[#4a4f57]">{c.bio}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-mist">
        <div className={`${section} flex flex-col gap-10`}>
          <h2 className={h2}>What members get</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INCLUDED.map((i) => (
              <article key={i.title} className="flex flex-col gap-3 rounded-xl bg-white p-6 sm:p-7">
                <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{i.icon}</svg>
                <h3 className="text-lg font-semibold">{i.title}</h3>
                <p className="leading-relaxed text-[#4a4f57]">{i.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-graphite text-white">
        <div className={`${section} flex flex-col gap-10`}>
          <div className="flex flex-col gap-3">
            <span className={`${eyebrow} text-ice`}>From the drivers</span>
            <h2 className={h2}>What students say</h2>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Testimonial t={TESTIMONIALS[0]!} />
            <div className="flex flex-col gap-5">
              <Testimonial t={TESTIMONIALS[1]!} />
              <Testimonial t={TESTIMONIALS[2]!} />
            </div>
          </div>
        </div>
      </section>

      <section id="book" className={`${section} flex scroll-mt-24 flex-col gap-9`}>
        <div className="flex flex-col gap-3">
          <h2 className={h2}>1-on-1 sessions</h2>
          <p className="text-[17px] text-[#4a4f57]">Pay by PayPal or Zelle after booking. Booking opens once your application is approved.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {SESSIONS.map((s) => (
            <article key={s.minutes} className="flex flex-col gap-3 rounded-xl border border-line p-6 sm:p-8">
              <span className="font-mono text-[13px] tracking-[0.12em] text-muted">{s.minutes} MIN</span>
              <span className="font-heading text-4xl font-bold">{s.price}</span>
              <p className="flex-1 leading-relaxed text-[#4a4f57]">{s.bestFor}</p>
            </article>
          ))}
        </div>
        <div className="flex flex-col gap-3 xs:flex-row">
          <Link href="/apply" className={btn.ember}>Apply for coaching</Link>
          <Link href="/schedule" className={btn.outlineLight}>Already a member? Book</Link>
        </div>
      </section>

      <section className="border-t border-line">
        <div className={`${section} flex flex-col gap-10`}>
          <h2 className={h2}>How it works</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-2.5 border-t-2 border-ember pt-5">
                <span className="font-mono text-[13px] text-muted">0{i + 1}</span>
                <span className="text-lg font-semibold">{s.title}</span>
                <span className="leading-relaxed text-[#4a4f57]">{s.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, PageTitle, StatusChip } from '@/components/academy/ui'
import { YouTubeLite } from '@/components/academy/small'
import { LocalTime } from '@/components/site/Countdown'
import { SESSION_TYPES, formatPrice } from '@/lib/academy/constants'
import { getLegacyRecordings, getSessionsFor, getStudentHome, personName, type CoachingSession } from '@/lib/academy/queries'
import { requireAcademyAccess } from '@/lib/auth'

export const metadata: Metadata = { title: 'Sessions' }

function paymentChip(s: CoachingSession) {
  if (s.status === 'cancelled') return <StatusChip tone="mist">Cancelled</StatusChip>
  if (s.payment_status === 'paid') return <StatusChip tone="ice">Paid</StatusChip>
  if (s.payment_status === 'waived') return <StatusChip tone="iris">No charge</StatusChip>
  return <StatusChip tone="ember">Payment due · {formatPrice(s.price_cents)}</StatusChip>
}

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ length?: string }> }) {
  const viewer = await requireAcademyAccess('/sessions')
  const me = viewer.user.id
  const { length } = await searchParams
  const selected = SESSION_TYPES.find((t) => String(t.minutes) === length) ?? SESSION_TYPES[1]

  const [{ coach }, sessions, legacy] = await Promise.all([getStudentHome(me), getSessionsFor(me), getLegacyRecordings(me)])

  const now = new Date().getTime()
  const upcoming = sessions.filter((s) => s.status === 'booked' && Date.parse(s.starts_at) > now - 2 * 3600_000)
  const past = sessions.filter((s) => !upcoming.includes(s))
  const unpaid = sessions.filter((s) => s.payment_status === 'unpaid' && s.status !== 'cancelled')

  const name = viewer.user.user_metadata?.custom_claims?.global_name ?? viewer.user.user_metadata?.full_name ?? ''
  const calUrl = coach?.cal_username
    ? `https://cal.com/${encodeURIComponent(coach.cal_username)}/${selected.slug}?embed=true&theme=light&name=${encodeURIComponent(name)}&email=${encodeURIComponent(viewer.user.email ?? '')}&metadata[userId]=${me}`
    : null

  return (
    <>
      <PageTitle title="Sessions" subtitle="Book 1-on-1 time with your coach, pay, and look back at past sessions." />

      {upcoming.length > 0 && (
        <Card title="Coming up">
          <ul className="flex flex-col">
            {upcoming.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-mist py-3 last:border-0">
                <span className="flex-1 font-semibold"><LocalTime iso={s.starts_at} fallback="" /> · {s.length_minutes} min</span>
                {paymentChip(s)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Book a session">
        <nav aria-label="Session length" className="grid gap-3 sm:grid-cols-3">
          {SESSION_TYPES.map((t) => (
            <Link
              key={t.minutes}
              href={`/sessions?length=${t.minutes}`}
              scroll={false}
              aria-current={t.minutes === selected.minutes ? 'true' : undefined}
              className="flex flex-col gap-1.5 rounded-xl border-2 border-line p-4 aria-[current=true]:border-ink aria-[current=true]:shadow-[inset_0_4px_0_var(--color-ember)]"
            >
              <span className="font-mono text-xs tracking-[0.12em] text-muted">{t.minutes} MIN</span>
              <span className="font-heading text-2xl font-bold">{formatPrice(t.priceCents)}</span>
              <span className="text-sm text-[#4a4f57]">{t.bestFor}</span>
            </Link>
          ))}
        </nav>
        {calUrl ? (
          <iframe
            key={calUrl}
            src={calUrl}
            title={`Book a ${selected.minutes} minute session with ${personName(coach)}`}
            className="h-[720px] w-full rounded-lg border border-line"
            loading="lazy"
          />
        ) : (
          <p className="rounded-lg bg-mist p-4 text-[15px] text-[#4a4f57]">
            {coach ? 'Your coach hasn’t set up online booking yet.' : 'You’ll be able to book once you’re matched with a coach.'} Message them on the{' '}
            <Link href="/messages" className="font-semibold text-iris-deep">Ask my coach</Link> page to arrange a time.
          </p>
        )}
      </Card>

      <Card title="How to pay" className="scroll-mt-24" >
        <div id="pay" className="flex flex-col gap-4">
          <p className="text-[15px] text-[#4a4f57]">
            Pay after booking with PayPal or Zelle. Your coach marks the session paid, and it updates here.
            {unpaid.length > 0 && <> You have <strong>{formatPrice(unpaid.reduce((n, s) => n + (s.price_cents ?? 0), 0))}</strong> due.</>}
          </p>
          {coach && (coach.paypal_me || coach.zelle_handle) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {coach.paypal_me && (
                <div className="flex flex-col gap-2 rounded-lg border border-line p-4">
                  <span className="font-semibold">PayPal</span>
                  <span className="text-sm text-muted">Send as goods &amp; services.</span>
                  <a
                    href={`https://paypal.me/${encodeURIComponent(coach.paypal_me)}${unpaid[0]?.price_cents ? `/${unpaid[0].price_cents / 100}USD` : ''}`}
                    className="tap inline-flex items-center justify-center self-start rounded-md bg-[#0070ba] px-4 text-sm font-semibold text-white"
                    rel="noopener"
                  >
                    Pay with PayPal
                  </a>
                </div>
              )}
              {coach.zelle_handle && (
                <div className="flex flex-col gap-2 rounded-lg border border-line p-4">
                  <span className="font-semibold">Zelle</span>
                  <span className="text-sm text-muted">Send to:</span>
                  <span className="font-mono text-[15px] break-all select-all">{coach.zelle_handle}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Your coach will share payment details with you.</p>
          )}
        </div>
      </Card>

      <Card title="Past sessions">
        {past.length === 0 && legacy.length === 0 ? (
          <p className="text-[15px] text-[#4a4f57]">Notes and recordings from your sessions will appear here.</p>
        ) : (
          <ul className="flex flex-col gap-5">
            {past.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 border-b border-mist pb-5 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex-1 font-semibold"><LocalTime iso={s.starts_at} fallback="" /> · {s.length_minutes} min</span>
                  {paymentChip(s)}
                </div>
                {s.notes && <p className="text-[15px] whitespace-pre-wrap text-[#33373e]">{s.notes}</p>}
                {s.recording_url && <a href={s.recording_url} rel="noopener" className="text-sm font-semibold text-iris-deep">Watch the recording →</a>}
              </li>
            ))}
            {legacy.map((r) => (
              <li key={`legacy-${r.id}`} className="grid gap-3 border-b border-mist pb-5 last:border-0 last:pb-0 sm:grid-cols-[240px_1fr]">
                <YouTubeLite id={r.youtube_id} title={r.title ?? 'Session recording'} />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">{r.title ?? 'Session recording'}</span>
                  {r.session_date && <span className="text-sm text-muted">{new Date(`${r.session_date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>}
                  {r.notes && <p className="text-[15px] whitespace-pre-wrap text-[#33373e]">{r.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

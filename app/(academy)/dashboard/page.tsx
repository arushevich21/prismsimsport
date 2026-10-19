import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Avatar, Card, PageTitle, StatusChip, TierChip, linkBtn } from '@/components/academy/ui'
import { LocalTime } from '@/components/site/Countdown'
import { formatPrice } from '@/lib/academy/constants'
import { getMessages, getSessionsFor, getStudentHome, getTelemetryFor, personName } from '@/lib/academy/queries'
import { requireAcademyAccess } from '@/lib/auth'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const viewer = await requireAcademyAccess('/dashboard')
  if (viewer.role === 'coach' || viewer.role === 'admin') redirect('/coach')

  const me = viewer.user.id
  const [{ student, coach }, sessions, uploads, messages] = await Promise.all([
    getStudentHome(me),
    getSessionsFor(me),
    getTelemetryFor(me),
    getMessages(me, 20),
  ])

  const now = new Date().getTime()
  const upcoming = sessions
    .filter((s) => s.status === 'booked' && Date.parse(s.starts_at) > now - 2 * 3600_000)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const next = upcoming[0]
  const unpaid = sessions.filter((s) => s.payment_status === 'unpaid' && s.status !== 'cancelled')
  const recent = sessions.filter((s) => s.status === 'completed').slice(0, 2)
  const waiting = uploads.filter((u) => !u.reviewed).length
  const latestFeedback = uploads.find((u) => u.reviewed && u.feedback)
  const unread = messages.filter((m) => m.sender_id !== me && !m.read_at).length
  const firstName = (viewer.user.user_metadata?.custom_claims?.global_name ?? viewer.user.user_metadata?.full_name ?? '').split(' ')[0]

  return (
    <>
      <PageTitle title={firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'} subtitle="Here’s where you are this week.">
        {student && <TierChip tier={student.tier} />}
      </PageTitle>

      <div className="grid gap-5 xl:grid-cols-2">
        <section aria-labelledby="next-h" className="flex flex-col gap-4 rounded-xl bg-graphite p-5 text-white sm:p-7">
          <span id="next-h" className="font-mono text-xs tracking-[0.15em] text-ember uppercase">Next session</span>
          {next ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="font-heading text-xl font-bold sm:text-2xl"><LocalTime iso={next.starts_at} fallback="" /></span>
                <span className="text-body-dark">{next.length_minutes} min with {personName(coach)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {next.payment_status === 'unpaid' ? <StatusChip tone="ember">Payment due · {formatPrice(next.price_cents)}</StatusChip> : <StatusChip tone="ice">Paid</StatusChip>}
                <Link href="/sessions" className="font-semibold text-ice hover:text-white">Session details →</Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-body-dark">Nothing booked yet.</p>
              <Link href="/sessions" className={`${linkBtn} self-start bg-ember text-ink`}>Book a session</Link>
            </>
          )}
        </section>

        <Card title="Your coach">
          {coach ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar person={coach} size="h-14 w-14" />
                <div className="flex flex-col">
                  <span className="text-lg font-semibold">{personName(coach)}</span>
                  <span className="text-sm text-muted">{coach.title ?? 'PRISM Academy coach'}</span>
                </div>
              </div>
              <p className="text-[15px] text-[#4a4f57]">Questions between sessions go straight to your coach, here and on Discord.</p>
              <Link href="/messages" className={`${linkBtn} self-start border border-ink`}>
                Ask a question{unread ? ` · ${unread} new` : ''}
              </Link>
            </>
          ) : (
            <p className="text-[15px] text-[#4a4f57]">You’ll be matched with a coach shortly. Until then, messages go to the whole coaching team.</p>
          )}
        </Card>
      </div>

      {unpaid.length > 0 && (
        <Card title="Payment due" action={<Link href="/sessions#pay" className="text-sm font-semibold text-iris-deep">How to pay →</Link>}>
          <p className="text-[15px] text-[#4a4f57]">
            {unpaid.length === 1 ? 'One session is' : `${unpaid.length} sessions are`} waiting for payment
            ({formatPrice(unpaid.reduce((sum, s) => sum + (s.price_cents ?? 0), 0))} total). Pay by PayPal or Zelle; your coach marks it paid.
          </p>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Telemetry review" action={<Link href="/telemetry" className="text-sm font-semibold text-iris-deep">Upload →</Link>}>
          <p className="text-[15px] text-[#4a4f57]">
            {waiting ? `${waiting} upload${waiting === 1 ? '' : 's'} waiting for your coach.` : 'Nothing waiting for review.'}
          </p>
          {latestFeedback && (
            <div className="rounded-lg bg-mist p-4 text-[15px]">
              <span className="font-semibold">Latest feedback · {latestFeedback.filename}</span>
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[#33373e]">{latestFeedback.feedback}</p>
            </div>
          )}
        </Card>

        <Card title="Recent sessions" action={<Link href="/sessions" className="text-sm font-semibold text-iris-deep">All sessions →</Link>}>
          {recent.length === 0 ? (
            <p className="text-[15px] text-[#4a4f57]">Your session notes and recordings will show up here.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recent.map((s) => (
                <li key={s.id} className="flex flex-col gap-1 border-b border-mist pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-muted"><LocalTime iso={s.starts_at} fallback="" /> · {s.length_minutes} min</span>
                  {s.notes && <p className="line-clamp-3 text-[15px] whitespace-pre-wrap">{s.notes}</p>}
                  {s.recording_url && <a href={s.recording_url} className="text-sm font-semibold text-iris-deep" rel="noopener">Watch the recording →</a>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

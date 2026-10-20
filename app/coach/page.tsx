import type { Metadata } from 'next'
import Link from 'next/link'
import { SessionCard } from '@/components/academy/SessionCard'
import { DownloadButton, SubmitButton } from '@/components/academy/small'
import { Card, PageTitle } from '@/components/academy/ui'
import { approveApplication, declineApplication, reviewTelemetry } from '@/lib/academy/actions'
import { PROGRAMS, PROGRAM_SHORT, TIERS, TIER_LABEL } from '@/lib/academy/constants'
import { getCoaches, getQueue, personName } from '@/lib/academy/queries'
import { requireStaff } from '@/lib/auth'

export const metadata: Metadata = { title: 'Coach queue' }

type Tab = 'applications' | 'telemetry' | 'messages' | 'sessions'

const field = 'min-h-11 rounded-md border border-[#cbd1d9] bg-white px-3'
const primary = 'tap rounded-md bg-ink px-4 text-sm font-semibold text-white'
const small = 'tap rounded-md border border-[#cbd1d9] bg-white px-3 text-sm font-semibold'

const ago = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default async function CoachQueuePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requireStaff('/coach')
  const admin = viewer.role === 'admin'
  const q = await getQueue(viewer)
  const { tab: requested } = await searchParams

  const tabs: { key: Tab; label: string; count: number }[] = [
    ...(admin ? [{ key: 'applications' as const, label: 'New applications', count: q.applications.length }] : []),
    { key: 'telemetry', label: 'Telemetry to review', count: q.telemetry.length },
    { key: 'messages', label: 'Unanswered messages', count: q.threads.length },
    { key: 'sessions', label: 'Sessions to action', count: q.needsAction.length },
  ]
  const fallback = tabs.find((t) => t.count > 0)?.key ?? tabs[0]!.key
  const tab: Tab = tabs.some((t) => t.key === requested) ? (requested as Tab) : fallback

  const studentName = new Map(q.students.map((s) => [s.profile_id, personName(s.profile)]))
  const coaches = admin || tab === 'applications' ? await getCoaches() : []
  const coachName = new Map(coaches.map((c) => [c.id, personName(c)]))
  const now = new Date().getTime()

  return (
    <>
      <PageTitle title="Coach queue" subtitle="Everything waiting on a coach." />

      <nav aria-label="Queue" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/coach?tab=${t.key}`}
            aria-current={t.key === tab ? 'page' : undefined}
            className="flex flex-col gap-1 rounded-xl border border-line bg-white p-4 aria-[current=page]:border-graphite aria-[current=page]:bg-graphite aria-[current=page]:text-white"
          >
            <span className="font-mono text-2xl font-semibold sm:text-3xl">{t.count}</span>
            <span className="text-sm">{t.label}</span>
          </Link>
        ))}
      </nav>

      {tab === 'applications' && (
        q.applications.length === 0 ? <Empty text="No new applications." /> : q.applications.map((a) => (
          <Card key={a.id} title={a.discord_handle ?? 'New applicant'} action={<span className="text-sm text-muted">Applied {ago(a.created_at)}</span>}>
            <dl className="grid gap-4 text-[15px] md:grid-cols-2">
              {[
                ['Program', a.program ? PROGRAM_SHORT[a.program] : 'Not asked (applied before programs)'],
                ['Wants to improve', a.improve],
                ['Goals', a.goals],
                ['Experience', a.experience],
                ['Car / series', a.car_series ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <dt className="text-xs tracking-wider text-muted uppercase">{k}</dt>
                  <dd className="whitespace-pre-wrap">{v}</dd>
                </div>
              ))}
            </dl>
            <form action={approveApplication} className="flex flex-wrap items-end gap-3 border-t border-mist pt-4">
              <input type="hidden" name="id" value={String(a.id)} />
              <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">Coach
                <select name="coach_id" className={field} defaultValue={coaches[0]?.id ?? ''}>
                  {coaches.map((c) => <option key={c.id} value={c.id}>{personName(c)}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">Tier
                <select name="tier" className={field} defaultValue="student">
                  {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">Program
                <select name="program" className={field} defaultValue={a.program ?? 'lmu'}>
                  {PROGRAMS.map((p) => <option key={p} value={p}>{PROGRAM_SHORT[p]}</option>)}
                </select>
              </label>
              <SubmitButton className={primary}>Approve</SubmitButton>
              <button formAction={declineApplication} className={small}>Decline</button>
            </form>
          </Card>
        ))
      )}

      {tab === 'telemetry' && (
        q.telemetry.length === 0 ? <Empty text="Nothing waiting for review." /> : q.telemetry.map((u) => (
          <Card key={u.id} title={studentName.get(u.user_id) ?? 'Student'} action={<span className="text-sm text-muted">Uploaded {ago(u.created_at)}</span>}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1 font-mono text-sm break-all">{u.filename}</span>
              <DownloadButton kind="telemetry" id={String(u.id)} className={small}>Download</DownloadButton>
            </div>
            {u.note && <p className="rounded-lg bg-mist p-3 text-[15px]"><span className="font-semibold">Student’s note:</span> {u.note}</p>}
            <form action={reviewTelemetry} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={String(u.id)} />
              <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">Your feedback
                <textarea name="feedback" rows={4} className="rounded-md border border-[#cbd1d9] px-3 py-2 text-[15px] text-ink" />
              </label>
              <SubmitButton className={`${primary} self-start`}>Send feedback and mark reviewed</SubmitButton>
            </form>
          </Card>
        ))
      )}

      {tab === 'messages' && (
        q.threads.length === 0 ? <Empty text="Every student has an answer." /> : (
          <ul className="flex flex-col gap-3">
            {q.threads.map((m) => (
              <li key={m.student_id}>
                <Link href={`/coach/messages/${m.student_id}`} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-5 hover:border-iris-deep">
                  <span className="flex flex-wrap justify-between gap-2 text-sm text-muted">
                    <span className="font-semibold text-ink">{studentName.get(m.student_id) ?? 'Student'}</span>
                    {ago(m.created_at)}
                  </span>
                  <span className="line-clamp-3 text-[15px] whitespace-pre-wrap">{m.body}</span>
                  <span className="text-sm font-semibold text-iris-deep">Reply →</span>
                </Link>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === 'sessions' && (
        q.needsAction.length === 0 ? <Empty text="No sessions need anything right now." /> : q.needsAction.map((s) => (
          <SessionCard key={s.id} session={s} students={q.students} now={now} coachName={admin ? coachName.get(s.coach_id) : undefined} />
        ))
      )}

      {tab === 'sessions' && (
        <Card title="Upcoming sessions">
          {q.sessions.filter((s) => s.status === 'booked' && Date.parse(s.starts_at) >= now).length === 0 ? (
            <p className="text-[15px] text-[#4a4f57]">Nothing booked. Bookings from Cal.com show up here automatically.</p>
          ) : (
            <ul className="flex flex-col">
              {q.sessions.filter((s) => s.status === 'booked' && Date.parse(s.starts_at) >= now).map((s) => (
                <li key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-mist py-3 text-[15px] last:border-0">
                  <span className="font-semibold">{s.student_id ? studentName.get(s.student_id) : s.attendee_name ?? 'Unlinked booking'}</span>
                  <span className="text-muted">{new Date(s.starts_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {s.length_minutes} min</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-line bg-white p-6 text-[15px] text-[#4a4f57]">{text}</p>
}

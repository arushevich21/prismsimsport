import { cancelSession, linkSession, saveSessionWrapUp, setPayment } from '@/lib/academy/actions'
import { formatPrice } from '@/lib/academy/constants'
import { personName, type CoachingSession, type StudentRow } from '@/lib/academy/queries'
import { LocalTime } from '@/components/site/Countdown'
import { SubmitButton } from './small'
import { StatusChip } from './ui'

const field = 'min-h-11 w-full rounded-md border border-[#cbd1d9] bg-white px-3'
const small = 'tap rounded-md border border-[#cbd1d9] bg-white px-3 text-sm font-semibold'
const primary = 'tap rounded-md bg-ink px-4 text-sm font-semibold text-white'

// One coaching session in the coach queue: link it to a student, take
// payment, then add the recording and notes once it's done.
export function SessionCard({ session: s, students, now, coachName }: { session: CoachingSession; students: StudentRow[]; now: number; coachName?: string }) {
  const student = students.find((x) => x.profile_id === s.student_id)
  const past = Date.parse(s.starts_at) < now
  const who = student ? personName(student.profile) : s.attendee_name ?? s.attendee_email ?? 'Unknown student'

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">{who} · {s.length_minutes} min</span>
          <span className="text-sm text-muted">
            <LocalTime iso={s.starts_at} fallback="" />
            {coachName && ` · Coach: ${coachName}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {!s.student_id && <StatusChip tone="ember">Not linked</StatusChip>}
          {s.payment_status === 'paid' ? (
            <StatusChip tone="ice">Paid{s.payment_method ? ` · ${s.payment_method}` : ''}</StatusChip>
          ) : s.payment_status === 'waived' ? (
            <StatusChip tone="iris">No charge</StatusChip>
          ) : (
            <StatusChip tone="ember">Unpaid · {formatPrice(s.price_cents)}</StatusChip>
          )}
          {s.status === 'completed' ? <StatusChip tone="mist">Done</StatusChip> : past ? <StatusChip tone="ember">Needs wrap-up</StatusChip> : <StatusChip tone="ice">Upcoming</StatusChip>}
        </div>
      </div>

      {!s.student_id && (
        <form action={linkSession} className="flex flex-wrap items-end gap-2 rounded-lg bg-mist p-3">
          <input type="hidden" name="id" value={s.id} />
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-[13px] text-[#4a4f57]">
            Booked as {s.attendee_email ?? 'unknown email'}. Which student is this?
            <select name="student_id" required className={field} defaultValue="">
              <option value="" disabled>Choose a student</option>
              {students.map((x) => <option key={x.profile_id} value={x.profile_id}>{personName(x.profile)}</option>)}
            </select>
          </label>
          <SubmitButton className={primary}>Link</SubmitButton>
        </form>
      )}

      {s.payment_status === 'unpaid' ? (
        <form action={setPayment} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={s.id} />
          <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">
            Paid with
            <select name="payment_method" className={field} defaultValue="paypal">
              <option value="paypal">PayPal</option>
              <option value="zelle">Zelle</option>
              <option value="other">Other</option>
            </select>
          </label>
          {/* Each button sends its own payment_status, so there is exactly one value. */}
          <button type="submit" name="payment_status" value="paid" className={primary}>Mark paid</button>
          <button type="submit" name="payment_status" value="waived" className={small}>No charge</button>
        </form>
      ) : (
        <form action={setPayment}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="payment_status" value="unpaid" />
          <button type="submit" className="text-sm font-semibold text-iris-deep underline">Undo payment</button>
        </form>
      )}

      {(past || s.status === 'completed') && (
        <form action={saveSessionWrapUp} className="flex flex-col gap-2 border-t border-mist pt-4">
          <input type="hidden" name="id" value={s.id} />
          <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">
            Recording link
            <input name="recording_url" type="url" defaultValue={s.recording_url ?? ''} placeholder="Unlisted YouTube link" className={field} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">
            Notes for the student
            <textarea name="notes" rows={3} defaultValue={s.notes ?? ''} placeholder="What you worked on, what to practise before next time" className="rounded-md border border-[#cbd1d9] px-3 py-2" />
          </label>
          <SubmitButton className={`${primary} self-start`}>{s.status === 'completed' ? 'Update' : 'Save and mark done'}</SubmitButton>
        </form>
      )}

      {s.status === 'booked' && !past && (
        <form action={cancelSession}>
          <input type="hidden" name="id" value={s.id} />
          <button type="submit" className="text-sm text-[#8a1c1c] underline">Mark cancelled</button>
        </form>
      )}
    </article>
  )
}

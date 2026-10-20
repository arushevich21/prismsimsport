import type { Metadata } from 'next'
import Link from 'next/link'
import { SubmitButton, TeamReadyToggle } from '@/components/academy/small'
import { Avatar, PageTitle, TierChip } from '@/components/academy/ui'
import { removeStudent, updateStudent } from '@/lib/academy/actions'
import { PROGRAMS, PROGRAM_SHORT, TIERS, TIER_LABEL } from '@/lib/academy/constants'
import { getCoaches, getQueue, personName } from '@/lib/academy/queries'
import { requireStaff } from '@/lib/auth'

export const metadata: Metadata = { title: 'Students' }

const field = 'min-h-11 rounded-md border border-[#cbd1d9] bg-white px-3'

export default async function StudentsPage() {
  const viewer = await requireStaff('/coach/students')
  const admin = viewer.role === 'admin'
  const { students } = await getQueue(viewer)
  const coaches = admin ? await getCoaches() : []
  const coachName = new Map(coaches.map((c) => [c.id, personName(c)]))

  return (
    <>
      <PageTitle
        title={admin ? 'All students' : 'My students'}
        subtitle="Flag someone team-ready and the captains will know they’re worth a tryout."
      />
      {students.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-[15px] text-[#4a4f57]">No students yet.</p>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {students.map((s) => (
            <li key={s.profile_id} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
              <div className="flex items-center gap-3">
                <Avatar person={s.profile} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{personName(s.profile)}</span>
                  <span className="text-sm text-muted">
                    Since {new Date(s.approved_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    {` · ${s.program ? PROGRAM_SHORT[s.program] : 'No program set'}`}
                    {admin && ` · ${s.coach_id ? coachName.get(s.coach_id) ?? 'Coach' : 'No coach'}`}
                  </span>
                </div>
                <TierChip tier={s.tier} />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <TeamReadyToggle studentId={s.profile_id} initial={s.team_ready} />
                <Link href={`/coach/messages/${s.profile_id}`} className="tap inline-flex items-center text-sm font-semibold text-iris-deep">Messages →</Link>
              </div>
              {admin && (
                <details className="rounded-lg bg-mist p-3">
                  <summary className="tap flex cursor-pointer items-center text-sm font-semibold">Change coach, tier, program or remove</summary>
                  <form action={updateStudent} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="profile_id" value={s.profile_id} />
                    <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">Coach
                      <select name="coach_id" defaultValue={s.coach_id ?? ''} className={field}>
                        <option value="">No coach</option>
                        {coaches.map((c) => <option key={c.id} value={c.id}>{personName(c)}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">Tier
                      <select name="tier" defaultValue={s.tier} className={field}>
                        {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">Program
                      <select name="program" defaultValue={s.program ?? ''} className={field}>
                        <option value="">Not set</option>
                        {PROGRAMS.map((p) => <option key={p} value={p}>{PROGRAM_SHORT[p]}</option>)}
                      </select>
                    </label>
                    <SubmitButton className="tap rounded-md bg-ink px-4 text-sm font-semibold text-white">Save</SubmitButton>
                    <button formAction={removeStudent} className="tap rounded-md border border-[#e3b4b4] bg-white px-3 text-sm font-semibold text-[#8a1c1c]">
                      Remove from Academy
                    </button>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { Avatar, PageTitle, StatusChip } from '@/components/academy/ui'
import { getQueue, personName } from '@/lib/academy/queries'
import { requireStaff } from '@/lib/auth'

export const metadata: Metadata = { title: 'Messages' }

export default async function CoachMessagesPage() {
  const viewer = await requireStaff('/coach/messages')
  const { students, threads } = await getQueue(viewer)
  const waiting = new Map(threads.map((t) => [t.student_id, t]))
  const ordered = [...students].sort((a, b) => Number(waiting.has(b.profile_id)) - Number(waiting.has(a.profile_id)))

  return (
    <>
      <PageTitle title="Messages" subtitle="One conversation per student. Students waiting on a reply are at the top." />
      {ordered.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-[15px] text-[#4a4f57]">No students yet.</p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
          {ordered.map((s) => {
            const last = waiting.get(s.profile_id)
            return (
              <li key={s.profile_id} className="border-b border-line last:border-0">
                <Link href={`/coach/messages/${s.profile_id}`} className="flex items-center gap-3 p-4 hover:bg-mist">
                  <Avatar person={s.profile} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{personName(s.profile)}</span>
                    {last && <span className="truncate text-sm text-[#4a4f57]">{last.body}</span>}
                  </div>
                  {last && <StatusChip tone="ember">Waiting</StatusChip>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

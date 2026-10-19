import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChatThread } from '@/components/academy/ChatThread'
import { Avatar, PageTitle, TierChip } from '@/components/academy/ui'
import { getMessages, getPeople, getQueue, personName } from '@/lib/academy/queries'
import { requireStaff } from '@/lib/auth'

export const metadata: Metadata = { title: 'Conversation' }

export default async function CoachThreadPage({ params }: { params: Promise<{ studentId: string }> }) {
  const viewer = await requireStaff('/coach/messages')
  const { studentId } = await params
  const { students } = await getQueue(viewer)
  const student = students.find((s) => s.profile_id === studentId)
  if (!student) notFound()

  const messages = await getMessages(studentId)
  const people = await getPeople(messages.map((m) => m.sender_id))
  const names = Object.fromEntries([...people.values()].map((p) => [p.id, personName(p)]))

  return (
    <>
      <Link href="/coach/messages" className="tap inline-flex items-center self-start text-sm font-semibold text-iris-deep">← All conversations</Link>
      <PageTitle title={personName(student.profile)} subtitle="Replies show up for the student here straight away.">
        <div className="flex items-center gap-3">
          <TierChip tier={student.tier} />
          <Avatar person={student.profile} size="h-12 w-12" />
        </div>
      </PageTitle>
      <ChatThread studentId={studentId} meId={viewer.user.id} initial={messages} names={names} placeholder="Write a reply…" footnote="Ctrl + Enter to send." />
    </>
  )
}

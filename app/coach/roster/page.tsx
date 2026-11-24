import { redirect } from 'next/navigation'

// The roster editor moved to the admin panel.
export default function CoachRosterPage() {
  redirect('/manage/roster')
}

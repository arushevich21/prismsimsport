import 'server-only'
import { after } from 'next/server'
import { onApplicationDeclined, onStudentApproved } from '@/lib/discord/notify'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Program, Tier } from './constants'

// Approving or declining an application. Shared by the coach queue on the site
// and the Approve/Decline buttons the bot posts on Discord; callers check that
// the person deciding is an admin.

type Decision = { ok: true } | { ok: false; reason: 'not-found' | 'already-decided'; status?: string }

async function pending(inquiryId: string): Promise<{ user_id: string } | Decision> {
  const { data } = await createAdminClient().from('inquiries').select('user_id, status').eq('id', inquiryId).maybeSingle()
  if (!data) return { ok: false, reason: 'not-found' }
  if (data.status !== 'pending') return { ok: false, reason: 'already-decided', status: data.status as string }
  return { user_id: data.user_id as string }
}

export async function approveInquiry(inquiryId: string, coachId: string | null, tier: Tier, program: Program): Promise<Decision> {
  const inquiry = await pending(inquiryId)
  if ('ok' in inquiry) return inquiry
  const admin = createAdminClient()
  await admin.from('students').upsert({ profile_id: inquiry.user_id, coach_id: coachId, tier, program })
  await admin.from('profiles').update({ role: 'student' }).eq('id', inquiry.user_id).eq('role', 'member')
  await admin.from('inquiries').update({ status: 'approved', decided_at: new Date().toISOString() }).eq('id', inquiryId)
  // Keep the legacy flag in step until the old tables are retired.
  await admin.from('members').update({ active: true, tier }).eq('user_id', inquiry.user_id)
  after(async () => {
    const { data: coach } = coachId
      ? await admin.from('profiles').select('display_name, discord_username').eq('id', coachId).maybeSingle()
      : { data: null }
    await onStudentApproved(inquiry.user_id, coach ? coach.display_name || coach.discord_username : null, program)
  })
  return { ok: true }
}

export async function declineInquiry(inquiryId: string): Promise<Decision> {
  const inquiry = await pending(inquiryId)
  if ('ok' in inquiry) return inquiry
  await createAdminClient().from('inquiries').update({ status: 'declined', decided_at: new Date().toISOString() }).eq('id', inquiryId)
  after(() => onApplicationDeclined(inquiry.user_id))
  return { ok: true }
}

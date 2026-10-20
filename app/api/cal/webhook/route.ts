import { createHmac, timingSafeEqual } from 'node:crypto'
import { after, NextResponse } from 'next/server'
import { priceFor } from '@/lib/academy/constants'
import { notifyBooking } from '@/lib/discord/notify'
import { createAdminClient } from '@/lib/supabase/admin'

// Cal.com → coaching_sessions. Set this up in Cal.com → Settings → Developer →
// Webhooks with the URL https://www.prismsimsport.app/api/cal/webhook, the same
// secret as CAL_WEBHOOK_SECRET, and the Booking created / rescheduled /
// cancelled triggers.

type CalPayload = {
  uid?: string
  rescheduleUid?: string
  fromReschedule?: string
  startTime?: string
  endTime?: string
  length?: number
  organizer?: { email?: string; username?: string; name?: string }
  attendees?: { email?: string; name?: string }[]
  metadata?: Record<string, unknown>
}

function verify(raw: string, signature: string | null, secret: string) {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(raw).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })

  const raw = await request.text()
  if (!verify(raw, request.headers.get('x-cal-signature-256'), secret)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 })
  }

  let body: { triggerEvent?: string; payload?: CalPayload }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const event = body.triggerEvent
  const p = body.payload ?? {}
  if (!p.uid || !p.startTime) return NextResponse.json({ ok: true, ignored: 'no booking data' })

  const admin = createAdminClient()

  if (event === 'BOOKING_CANCELLED') {
    await admin.from('coaching_sessions').update({ status: 'cancelled' }).eq('cal_booking_uid', p.uid)
    return NextResponse.json({ ok: true })
  }

  if (event !== 'BOOKING_CREATED' && event !== 'BOOKING_RESCHEDULED') {
    return NextResponse.json({ ok: true, ignored: event })
  }

  // Which coach: the Cal.com account the booking belongs to.
  const { data: coach } = await admin
    .from('coaches')
    .select('profile_id')
    .eq('cal_username', p.organizer?.username ?? '')
    .maybeSingle()
  if (!coach) return NextResponse.json({ ok: true, ignored: 'unknown organizer' })

  // Which student: the booking link from /sessions carries metadata[userId].
  const metaUser = typeof p.metadata?.userId === 'string' && UUID.test(p.metadata.userId) ? p.metadata.userId : null
  let studentId: string | null = null
  if (metaUser) {
    const { data } = await admin.from('students').select('profile_id').eq('profile_id', metaUser).maybeSingle()
    studentId = data?.profile_id ?? null
  }

  const minutes =
    p.length ??
    (p.endTime ? Math.round((Date.parse(p.endTime) - Date.parse(p.startTime)) / 60000) : 60)
  const lengthMinutes = [30, 60, 90].includes(minutes) ? minutes : 60
  const attendee = p.attendees?.[0]

  const row = {
    coach_id: coach.profile_id,
    student_id: studentId,
    starts_at: new Date(p.startTime).toISOString(),
    length_minutes: lengthMinutes,
    price_cents: priceFor(lengthMinutes),
    attendee_name: attendee?.name ?? null,
    attendee_email: attendee?.email ?? null,
    cal_booking_uid: p.uid,
    status: 'booked' as const,
  }

  // A reschedule creates a new booking uid; carry the old row's payment over.
  const previousUid = p.rescheduleUid ?? p.fromReschedule
  if (event === 'BOOKING_RESCHEDULED' && previousUid) {
    const { data: prev } = await admin
      .from('coaching_sessions')
      .update({ ...row })
      .eq('cal_booking_uid', previousUid)
      .select('id')
    if (prev?.length) return NextResponse.json({ ok: true })
  }

  const { error } = await admin.from('coaching_sessions').upsert(row, { onConflict: 'cal_booking_uid' })
  if (error) {
    console.error('[cal] save failed:', error.message)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }

  if (event === 'BOOKING_CREATED') {
    const who = attendee?.name ?? attendee?.email ?? 'Unknown'
    after(() => notifyBooking(coach.profile_id as string, who, lengthMinutes, row.starts_at, !!studentId))
  }
  return NextResponse.json({ ok: true })
}

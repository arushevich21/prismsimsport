import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { postDiscordEmbed } from '@/lib/discord'

type InquiryBody = {
  improve?: string
  goals?: string
  experience?: string
  car_series?: string
}

const MAX_LENGTH = 2000

export async function POST(request: Request) {
  // Who is applying comes from the login session, never from the request body.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  let body: InquiryBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const improve = body.improve?.trim() ?? ''
  const goals = body.goals?.trim() ?? ''
  const experience = body.experience?.trim() ?? ''
  const carSeries = body.car_series?.trim() || null

  if (!improve || !goals || !experience) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if ([improve, goals, experience, carSeries ?? ''].some((v) => v.length > MAX_LENGTH)) {
    return NextResponse.json({ error: 'One of your answers is too long.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // One application per person; stops the form (and the Discord ping) being spammed.
  const { data: existing } = await admin.from('inquiries').select('id').eq('user_id', user.id).maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: true, alreadyApplied: true })
  }

  const discordHandle =
    (user.user_metadata?.custom_claims?.global_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null

  const { error: dbError } = await admin.from('inquiries').insert({
    user_id: user.id,
    email: user.email ?? null,
    discord_handle: discordHandle,
    improve,
    goals,
    experience,
    car_series: carSeries,
  })

  if (dbError) {
    console.error('[inquiry] db error:', dbError.message)
    return NextResponse.json({ error: 'Failed to save your application. Please try again.' }, { status: 500 })
  }

  const fields = [
    { name: 'Discord', value: discordHandle || 'Unknown', inline: true },
    { name: 'Email', value: user.email || 'Unknown', inline: true },
    { name: 'What to improve', value: improve },
    { name: 'Goals', value: goals },
    { name: 'Experience', value: experience },
    ...(carSeries ? [{ name: 'Car / Series', value: carSeries }] : []),
  ]
  const discordOk = await postDiscordEmbed(process.env.DISCORD_WEBHOOK_URL, {
    title: 'New Coaching Inquiry',
    fields,
  })

  return NextResponse.json({ ok: true, ...(!discordOk && { warning: 'Saved, but Discord notification failed.' }) })
}

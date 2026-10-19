import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { postDiscordEmbed } from '@/lib/discord'

// Legacy "ask a question" endpoint for the old members page. Replaced by the
// on-site chat in Phase 4; kept working, but now tied to the signed-in user.

const MAX_LENGTH = 2000

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  let question: string
  try {
    const body = (await request.json()) as { question?: string }
    question = body.question?.trim() ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!question) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (question.length > MAX_LENGTH) {
    return NextResponse.json({ error: 'Your question is too long.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Only approved members can ask, and the Discord thread comes from their
  // member record rather than from the browser.
  const { data: member } = await admin
    .from('members')
    .select('active, discord_thread_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member?.active) {
    return NextResponse.json({ error: 'Only approved members can ask questions.' }, { status: 403 })
  }

  const { data: inserted, error: dbError } = await admin
    .from('questions')
    .insert({ user_id: user.id, question })
    .select()
    .single()

  if (dbError) {
    console.error('[questions] db error:', dbError.message)
    return NextResponse.json({ error: 'Failed to save your question. Please try again.' }, { status: 500 })
  }

  const threadId = typeof member.discord_thread_id === 'string' && /^\d+$/.test(member.discord_thread_id)
    ? member.discord_thread_id
    : null
  await postDiscordEmbed(
    process.env.DISCORD_QA_WEBHOOK_URL,
    {
      title: 'New Driver Question',
      fields: [
        { name: 'From', value: user.email || user.id, inline: true },
        { name: 'Question', value: question },
      ],
    },
    threadId
  )

  return NextResponse.json({ ok: true, question: inserted })
}

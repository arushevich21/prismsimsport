import { after, NextResponse } from 'next/server'
import { addGuildMember } from '@/lib/discord/api'
import { createClient } from '@/lib/supabase/server'

// Discord sends the user back here with a one-time code. Exchanging it on the
// server sets the session cookies before any gated page is rendered.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Optional: add them to the PRISM server (sign-in asks for guilds.join).
      const token = data.session?.provider_token
      const discordId = data.user?.user_metadata?.provider_id as string | undefined
      if (process.env.NEXT_PUBLIC_DISCORD_AUTO_JOIN === 'true' && token && discordId) {
        after(() => addGuildMember(discordId, token))
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth] code exchange failed:', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=signin`)
}

// Only same-site paths, so the login link can't bounce people to another site.
function safeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/dashboard'
  return next
}

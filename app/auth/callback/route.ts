import { after, NextResponse } from 'next/server'
import { homeFor, type Role } from '@/lib/auth'
import { addGuildMember } from '@/lib/discord/api'
import { syncClassRoles, syncTeamRoles } from '@/lib/discord/roles'
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
      const autoJoin = process.env.NEXT_PUBLIC_DISCORD_AUTO_JOIN === 'true' && token && discordId
      const userId = data.user?.id
      after(async () => {
        if (autoJoin) await addGuildMember(discordId, token)
        // Catch up on roles they couldn't get while they weren't in the server.
        if (userId) await Promise.all([syncTeamRoles([userId]), syncClassRoles(userId)])
      })
      if (next) return NextResponse.redirect(`${origin}${next}`)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user?.id ?? '').maybeSingle()
      return NextResponse.redirect(`${origin}${homeFor((profile?.role as Role | undefined) ?? 'member')}`)
    }
    console.error('[auth] code exchange failed:', error.message)
  } else {
    // Supabase sends ?error_description=… instead of a code when it couldn't sign them in.
    console.error('[auth] sign-in failed:', searchParams.get('error_description') ?? searchParams.get('error') ?? 'no code')
  }

  return NextResponse.redirect(`${origin}/login?error=signin`)
}

// Only same-site paths, so the login link can't bounce people to another site.
// Null means "no page asked for": the viewer's home is used instead.
function safeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}

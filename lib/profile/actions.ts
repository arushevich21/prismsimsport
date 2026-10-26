'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { getViewer } from '@/lib/auth'
import { botEnabled, discordEnv, isGuildMember, setNickname, takeDiscordError } from '@/lib/discord/api'
import { syncClassRoles } from '@/lib/discord/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_MAIN_CLASSES, isMainClass } from '@/lib/types'

type Result = { ok: true } | { ok: false; error: string }
export type NameResult = { ok: true; note?: string } | { ok: false; error: string }

const MAX_NICK = 32 // Discord's limit
const clean = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim().replace(/\s+/g, ' ')

// Their first and last name: shown on the site, and set as their nickname in
// the PRISM Discord. Leaving both blank goes back to their Discord name.
export async function setRealName(_prev: NameResult | null, fd: FormData): Promise<NameResult> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Please sign in again.' }
  const first = clean(fd, 'first_name')
  const last = clean(fd, 'last_name')
  if (!first && last) return { ok: false, error: 'Add your first name too.' }
  const full = [first, last].filter(Boolean).join(' ')
  if (full.length > MAX_NICK) return { ok: false, error: `Discord nicknames can be ${MAX_NICK} characters at most. Try a shorter version.` }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('discord_id').eq('id', viewer.user.id).maybeSingle()
  const m = viewer.user.user_metadata ?? {}
  const discordName = (m.custom_claims?.global_name as string) || (m.full_name as string) || (m.name as string) || null
  const { error } = await admin
    .from('profiles')
    .update({ first_name: first || null, last_name: last || null, display_name: full || discordName })
    .eq('id', viewer.user.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/', 'layout')

  // Done before answering rather than after, so they hear if Discord refused.
  const discordId = profile?.discord_id as string | null | undefined
  if (!botEnabled() || !discordEnv.guildId || !discordId) return { ok: true }
  if (await setNickname(discordId, full || null)) {
    return { ok: true, note: full ? `Saved. You’re now “${full}” in the PRISM Discord.` : 'Saved. Your Discord nickname was cleared.' }
  }
  takeDiscordError()
  return {
    ok: true,
    note: (await isGuildMember(discordId))
      ? 'Saved here, but Discord wouldn’t change your nickname. Bots can’t rename the server owner or anyone with a role above the bot’s.'
      : 'Saved here. Join the PRISM Discord and save again to set your nickname there.',
  }
}

// The signed-in person's main classes; their Discord class roles follow.
export async function setMainClasses(classes: string[]): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Please sign in again.' }
  const picked = [...new Set(classes)]
  if (!picked.every(isMainClass)) return { ok: false, error: 'Unknown class.' }
  if (picked.length > MAX_MAIN_CLASSES) return { ok: false, error: `Pick up to ${MAX_MAIN_CLASSES}.` }
  const { error } = await createAdminClient().from('profiles').update({ main_classes: picked }).eq('id', viewer.user.id)
  if (error) return { ok: false, error: error.message }
  after(() => syncClassRoles(viewer.user.id))
  revalidatePath('/profile')
  revalidatePath('/team', 'layout') // academy drivers are grouped by class there
  return { ok: true }
}

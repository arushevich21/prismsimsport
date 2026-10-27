'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { getViewer } from '@/lib/auth'
import { botEnabled, discordEnv, isGuildMember, setNickname, takeDiscordError } from '@/lib/discord/api'
import { syncClassRoles } from '@/lib/discord/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { DR_TIERS, MAX_MAIN_CLASSES, isMainClass, type DriverRankTier } from '@/lib/types'

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

// ── Driver photo ────────────────────────────────────────────────────────────

const PHOTO_TYPES = ['image/webp', 'image/jpeg', 'image/png']
const PHOTO_MAX_BYTES = 5 * 1024 * 1024 // the driver-photos bucket's limit

// The photo on their driver card on the team page. Only for people with a
// roster entry linked to their account; the browser resizes it first.
export async function setDriverPhoto(fd: FormData): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Please sign in again.' }
  const file = fd.get('photo')
  if (!(file instanceof Blob) || !PHOTO_TYPES.includes(file.type)) return { ok: false, error: 'Please choose a JPEG, PNG or WebP image.' }
  if (file.size > PHOTO_MAX_BYTES) return { ok: false, error: 'That image is too large. Try one under 5 MB.' }

  const admin = createAdminClient()
  const { data: driver } = await admin.from('drivers').select('id, photo_path').eq('profile_id', viewer.user.id).maybeSingle()
  if (!driver) return { ok: false, error: 'You’re not on the team roster yet, so there’s no driver card to add a photo to.' }
  const path = `${driver.id}/${crypto.randomUUID()}.webp`
  const { error: upErr } = await admin.storage.from('driver-photos').upload(path, file, { contentType: file.type })
  if (upErr) return { ok: false, error: upErr.message }
  const { error } = await admin.from('drivers').update({ photo_path: path }).eq('id', driver.id)
  if (error) return { ok: false, error: error.message }
  if (driver.photo_path) await admin.storage.from('driver-photos').remove([driver.photo_path as string])
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function removeDriverPhoto(): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Please sign in again.' }
  const admin = createAdminClient()
  const { data: driver } = await admin.from('drivers').select('id, photo_path').eq('profile_id', viewer.user.id).maybeSingle()
  if (!driver?.photo_path) return { ok: true }
  const { error } = await admin.from('drivers').update({ photo_path: null }).eq('id', driver.id)
  if (error) return { ok: false, error: error.message }
  await admin.storage.from('driver-photos').remove([driver.photo_path as string])
  revalidatePath('/', 'layout')
  return { ok: true }
}

// ── Driver card details ─────────────────────────────────────────────────────

// Their country and LMU Driver Rank, on their linked roster entry. A new rank
// is stamped with today's date so the team page can say how fresh it is.
export async function setDriverDetails(_prev: Result | null, fd: FormData): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Please sign in again.' }
  const country = clean(fd, 'country_code')
  if (country && !/^[A-Z]{2}$/.test(country)) return { ok: false, error: 'Unknown country.' }

  const admin = createAdminClient()
  const { data: driver } = await admin.from('drivers').select('id, lmu_dr_tier, lmu_dr_level').eq('profile_id', viewer.user.id).maybeSingle()
  if (!driver) return { ok: false, error: 'You’re not on the team roster yet.' }
  const values: Record<string, unknown> = { country_code: country || null }
  if (fd.has('lmu_dr_tier')) {
    const tier = clean(fd, 'lmu_dr_tier')
    const level = Number(clean(fd, 'lmu_dr_level'))
    if (tier && !DR_TIERS.includes(tier as DriverRankTier)) return { ok: false, error: 'Unknown rank.' }
    if (tier && ![1, 2, 3].includes(level)) return { ok: false, error: 'Pick a level from 1 to 3.' }
    const next = { lmu_dr_tier: tier || null, lmu_dr_level: tier ? level : null }
    if (next.lmu_dr_tier !== driver.lmu_dr_tier || next.lmu_dr_level !== driver.lmu_dr_level) {
      Object.assign(values, next, { lmu_dr_updated_on: tier ? new Date().toISOString().slice(0, 10) : null })
    }
  }
  const { error } = await admin.from('drivers').update(values).eq('id', driver.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/', 'layout')
  return { ok: true }
}

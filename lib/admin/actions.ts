'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth'
import { botEnabled, discordEnv, listGuildMembers, listTextChannels } from '@/lib/discord/api'
import { removeDuplicateDriver, setClassRoles, syncClassRoles, syncTeamRoles } from '@/lib/discord/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { announceNewResults, removeRace, syncRace, type RaceSyncReport } from '@/lib/discord/team'
import { MAIN_CLASSES, MAX_MAIN_CLASSES, isMainClass, type MainClass, type Sim } from '@/lib/types'

// Called after an admin saves something in edit mode. The writes themselves go
// straight to Supabase (RLS only lets admins write team data); this just makes
// the cached public pages pick up the change immediately.
export async function refreshPublicPages() {
  const viewer = await getViewer()
  if (viewer?.role !== 'admin') return { ok: false as const }
  revalidatePath('/', 'layout')
  return { ok: true as const }
}

// ── Discord sync (no-ops until the bot is configured) ───────────────────────

async function isAdmin() {
  return (await getViewer())?.role === 'admin'
}

export async function syncRaceToDiscord(raceId: string): Promise<RaceSyncReport | null> {
  if (!(await isAdmin())) return null
  return syncRace(raceId)
}

// Text channels in the PRISM server, for picking a car's timeslot channel.
export async function listDiscordChannels(): Promise<{ id: string; name: string }[]> {
  if (!(await isAdmin()) || !botEnabled()) return []
  return listTextChannels()
}

export async function removeRaceFromDiscord(raceId: string) {
  if (!(await isAdmin())) return
  await removeRace(raceId)
}

export async function announceResults(sim: Sim, season: number) {
  if (!(await isAdmin())) return 0
  return announceNewResults(sim, season)
}

// Server members, for linking a roster entry to someone who hasn't signed in
// to the site. Empty without the bot or the Server Members intent.
// With each one's classes, from their class roles.
export async function listDiscordMembers(): Promise<{ id: string; label: string; classes: MainClass[] }[]> {
  if (!(await isAdmin()) || !botEnabled()) return []
  return ((await listGuildMembers()) ?? [])
    .filter((m) => m.user && !m.user.bot)
    .map((m) => ({
      id: m.user!.id,
      label: [m.nick || m.user!.global_name, `@${m.user!.username}`].filter(Boolean).join(' · '),
      classes: MAIN_CLASSES.filter((c) => !!discordEnv.roles.classes[c] && m.roles.includes(discordEnv.roles.classes[c]!)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// A driver's classes, set from the roster editor. They're saved where the
// team page reads them first: a linked account's profile (and its class roles
// follow), else a linked Discord member's class roles. The roster entry keeps
// a copy, which is all an unlinked driver has.
export async function setDriverClasses(driverId: string, classes: string[]) {
  if (!(await isAdmin())) return
  const picked = [...new Set(classes)].filter(isMainClass).slice(0, MAX_MAIN_CLASSES)
  const admin = createAdminClient()
  const { data: d } = await admin.from('drivers').select('profile_id, discord_id').eq('id', driverId).maybeSingle()
  if (!d) return
  await admin.from('drivers').update({ main_classes: picked }).eq('id', driverId)
  if (d.profile_id) {
    await admin.from('profiles').update({ main_classes: picked }).eq('id', d.profile_id)
    await syncClassRoles(d.profile_id as string)
  } else if (d.discord_id) {
    await setClassRoles(d.discord_id as string, picked)
  }
}

// The entry the site added for someone, now that a hand-made one is linked to them.
export async function removeAutoAddedDriver(driverId: string) {
  if (!(await isAdmin())) return
  await removeDuplicateDriver(driverId)
}

// Only the drivers just edited: everyone else's lineup follows their Discord
// role, which may have changed since the editor loaded.
export async function syncRoles(profileIds: string[]) {
  if (!(await isAdmin())) return
  await syncTeamRoles(profileIds)
}

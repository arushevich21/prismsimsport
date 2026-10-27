'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth'
import { botEnabled, discordEnv, listGuildMembers, listTextChannels, takeDiscordError } from '@/lib/discord/api'
import { removeDuplicateDriver, setClassRoles, setLineupRoles, syncClassRoles, syncTeamRoles } from '@/lib/discord/roles'
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

// The LMU / ACC Driver roles of the drivers just edited, matched to their
// main lineup ticks. Call it before refreshing the team page: the lineups
// follow those roles, so a tick the role doesn't match yet would be undone.
// Only these drivers: everyone else's lineup follows their Discord role, which
// may have changed since the editor loaded. Returns why Discord refused, if it did.
export async function syncRoles(driverIds: string[]): Promise<string | null> {
  if (!(await isAdmin()) || !botEnabled() || driverIds.length === 0) return null
  const { data } = await createAdminClient().from('drivers').select('profile_id, discord_id, main_lineup, archived').in('id', driverIds)
  takeDiscordError()
  await syncTeamRoles((data ?? []).flatMap((d) => (d.profile_id as string | null) ?? []))
  for (const d of data ?? []) {
    if (!d.profile_id && d.discord_id) await setLineupRoles(d.discord_id as string, d.archived ? [] : (d.main_lineup as Sim[]))
  }
  return takeDiscordError()
}

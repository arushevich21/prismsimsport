'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth'
import { botEnabled, listTextChannels } from '@/lib/discord/api'
import { announceNewResults, removeRace, syncDriverRoles, syncRace, type RaceSyncReport } from '@/lib/discord/team'
import type { Sim } from '@/lib/types'

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

export async function syncRoles() {
  if (!(await isAdmin())) return
  await syncDriverRoles()
}

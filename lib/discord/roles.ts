import 'server-only'
import type { Program, Tier } from '@/lib/academy/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAIN_CLASSES, type MainClass, type Sim } from '@/lib/types'
import { botEnabled, discordEnv, setMemberRoles } from './api'

// The Discord roles the site manages, worked out from the site's data in one
// place so the academy, the roster and profiles can't undo each other's roles.

// Students on these tiers have moved up from the academy: they get the LMU /
// ACC Driver role for their program instead of LMU / ACC Academy.
const DRIVER_TIERS: Tier[] = ['driver', 'elite']

// LMU / ACC Academy and LMU / ACC Driver, from each person's student
// record (tier and program) and the roster's main lineups.
export async function syncTeamRoles(profileIds: string[]) {
  if (!botEnabled() || profileIds.length === 0) return
  const admin = createAdminClient()
  const [{ data: profiles }, { data: students }, { data: drivers }] = await Promise.all([
    admin.from('profiles').select('id, discord_id').in('id', profileIds).not('discord_id', 'is', null),
    admin.from('students').select('profile_id, tier, program').in('profile_id', profileIds),
    admin.from('drivers').select('profile_id, main_lineup').in('profile_id', profileIds).eq('archived', false),
  ])
  const studentOf = new Map((students ?? []).map((s) => [s.profile_id as string, s as { tier: Tier; program: Program | null }]))

  for (const p of profiles ?? []) {
    const student = studentOf.get(p.id as string)
    const lineup = (drivers ?? []).filter((d) => d.profile_id === p.id).flatMap((d) => d.main_lineup as Sim[])
    const promoted = !!student && DRIVER_TIERS.includes(student.tier)
    const inProgram = (sim: Sim) => student?.program === sim || student?.program === 'both'
    await setMemberRoles(p.discord_id as string, [
      [discordEnv.roles.academyLmu, !promoted && inProgram('lmu')],
      [discordEnv.roles.academyAcc, !promoted && inProgram('acc')],
      [discordEnv.roles.lmu, lineup.includes('lmu') || (promoted && inProgram('lmu'))],
      [discordEnv.roles.acc, lineup.includes('acc') || (promoted && inProgram('acc'))],
    ])
  }
}

// One role per class the person mainly drives (HY, GT3…).
export async function syncClassRoles(profileId: string) {
  if (!botEnabled()) return
  const { data } = await createAdminClient().from('profiles').select('discord_id, main_classes').eq('id', profileId).maybeSingle()
  if (!data?.discord_id) return
  const classes = (data.main_classes ?? []) as MainClass[]
  await setMemberRoles(data.discord_id as string, MAIN_CLASSES.map((c) => [discordEnv.roles.classes[c], classes.includes(c)]))
}

import 'server-only'
import type { Program, Tier } from '@/lib/academy/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAIN_CLASSES, MAX_MAIN_CLASSES, type MainClass, type Sim } from '@/lib/types'
import { botEnabled, discordEnv, getGuildMember, setMemberRoles, type GuildMember } from './api'

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

// The program someone's Academy roles in Discord stand for, if any.
function programOfRoles(roles: string[]): Program | null {
  const lmu = !!discordEnv.roles.academyLmu && roles.includes(discordEnv.roles.academyLmu)
  const acc = !!discordEnv.roles.academyAcc && roles.includes(discordEnv.roles.academyAcc)
  return lmu && acc ? 'both' : lmu ? 'lmu' : acc ? 'acc' : null
}

// People given LMU / ACC Academy by hand in Discord rather than through an
// application. Each one with a site account becomes a student (no coach yet,
// program from their roles), so the role sync keeps their role instead of
// taking it away and the team page lists them. Students with no program set
// get it from their roles too. Returns the members with no site account yet:
// they're adopted when they first sign in.
export async function adoptAcademyMembers(members: GuildMember[]) {
  const wanted = new Map(members.flatMap((m) => {
    const program = m.user ? programOfRoles(m.roles) : null
    return program ? [[m.user!.id, { member: m, program }] as const] : []
  }))
  if (wanted.size === 0) return { adopted: 0, withoutAccount: [] as string[] }
  const admin = createAdminClient()
  const { data: profiles } = await admin.from('profiles').select('id, discord_id').in('discord_id', [...wanted.keys()])
  const profileOf = new Map((profiles ?? []).map((p) => [p.discord_id as string, p.id as string]))
  const { data: students } = await admin.from('students').select('profile_id, program').in('profile_id', [...profileOf.values()])
  const studentOf = new Map((students ?? []).map((s) => [s.profile_id as string, s.program as Program | null]))

  const adopted: string[] = []
  for (const [discordId, { program }] of wanted) {
    const id = profileOf.get(discordId)
    if (!id) continue
    if (!studentOf.has(id)) {
      // Upsert: the LMU and ACC team pages can adopt the same person at once.
      await admin.from('students').upsert({ profile_id: id, tier: 'student', program }, { onConflict: 'profile_id', ignoreDuplicates: true })
      await admin.from('profiles').update({ role: 'student' }).eq('id', id).eq('role', 'member')
      adopted.push(id)
    } else if (studentOf.get(id) === null) {
      await admin.from('students').update({ program }).eq('profile_id', id)
    }
  }
  return {
    adopted: adopted.length,
    withoutAccount: [...wanted].filter(([id]) => !profileOf.has(id)).map(([, { member: m }]) => m.nick || m.user!.global_name || m.user!.username),
  }
}

// Who is on each main lineup is decided in Discord: holding LMU Driver puts
// someone on the LMU lineup and losing it takes them off, so the roster's Main
// lineup tick follows the role. Roster entries are matched by their linked
// account, or by Discord ID for people who've never signed in; role holders
// with no entry get one. Entries not tied to anyone in Discord are left alone,
// as are archived ones. Add ACC here to do the same for its lineup.
const LINEUP_ROLES: [Sim, string | undefined][] = [['lmu', discordEnv.roles.lmu]]

const discordName = (m: GuildMember) => m.nick || m.user!.global_name || m.user!.username

// `members` is the whole server (on a team page rebuild), or with `partial`
// just the people to check (on sign-in), so nobody else is taken off a lineup.
// True if anything changed.
async function syncLineupsFromRoles(members: GuildMember[], partial: boolean) {
  const lineups = LINEUP_ROLES.filter((r): r is [Sim, string] => !!r[1])
  if (lineups.length === 0) return false
  const admin = createAdminClient()
  const byId = new Map(members.flatMap((m) => (m.user ? [[m.user.id, m] as const] : [])))
  const { data: rows } = await admin.from('drivers').select('id, profile_id, discord_id, sims, main_lineup, archived')
  const drivers = (rows ?? []) as { id: string; profile_id: string | null; discord_id: string | null; sims: Sim[]; main_lineup: Sim[]; archived: boolean }[]
  const { data: profiles } = await admin.from('profiles').select('id, discord_id, display_name, discord_username').not('discord_id', 'is', null)
  const discordOf = new Map((profiles ?? []).map((p) => [p.id as string, p.discord_id as string]))
  const profileOf = new Map((profiles ?? []).map((p) => [p.discord_id as string, p]))
  const linked = new Set(drivers.flatMap((d) => d.profile_id ?? []))

  let changed = false
  const matched = new Set<string>()
  for (const d of drivers) {
    const discordId = d.discord_id ?? (d.profile_id ? discordOf.get(d.profile_id) : undefined)
    if (!discordId) continue
    matched.add(discordId)
    if (d.archived || (partial && !byId.has(discordId))) continue
    const roles = byId.get(discordId)?.roles ?? [] // not in the server: no roles
    let { sims, main_lineup } = d
    for (const [sim, role] of lineups) {
      const on = roles.includes(role)
      if (on && !sims.includes(sim)) sims = [...sims, sim]
      main_lineup = on ? [...new Set([...main_lineup, sim])] : main_lineup.filter((s) => s !== sim)
    }
    // Someone who's since signed in gets their entry linked to their account.
    const account = profileOf.get(discordId)?.id as string | undefined
    const profileId = d.profile_id ?? (account && !linked.has(account) ? account : null)
    if (sims.length !== d.sims.length || main_lineup.length !== d.main_lineup.length || profileId !== d.profile_id) {
      await admin.from('drivers').update({ sims, main_lineup, profile_id: profileId }).eq('id', d.id)
      changed = true
    }
  }

  for (const [discordId, m] of byId) {
    const on = lineups.filter(([, role]) => m.roles.includes(role)).map(([sim]) => sim)
    if (on.length === 0 || matched.has(discordId)) continue
    const p = profileOf.get(discordId)
    // Upsert: the LMU and ACC team pages can add the same person at once.
    await admin.from('drivers').upsert(
      { name: (p?.display_name as string) || (p?.discord_username as string) || discordName(m), sims: on, main_lineup: on, profile_id: p?.id ?? null, discord_id: discordId, sort_order: 99 },
      { onConflict: 'discord_id', ignoreDuplicates: true }
    )
    changed = true
  }
  return changed
}

// Profiles with no classes picked take them from the person's class roles in
// Discord, so the class sync keeps those roles instead of taking them away.
async function adoptClassRoles(members: GuildMember[]) {
  const picks = new Map(members.flatMap((m) => {
    const classes = MAIN_CLASSES.filter((c) => !!discordEnv.roles.classes[c] && m.roles.includes(discordEnv.roles.classes[c]!)).slice(0, MAX_MAIN_CLASSES)
    return m.user && classes.length ? [[m.user.id, classes] as const] : []
  }))
  if (picks.size === 0) return false
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('id, discord_id').in('discord_id', [...picks.keys()]).eq('main_classes', '{}')
  for (const p of data ?? []) await admin.from('profiles').update({ main_classes: picks.get(p.discord_id as string) }).eq('id', p.id)
  return (data ?? []).length > 0
}

// Brings the site in line with people's roles in Discord: Academy roles make
// students, Driver roles decide the main lineups, class roles fill in empty
// class picks. Run on every team page rebuild with the whole server, and on
// sign-in for that one person (`partial`). True if anything changed.
export async function syncFromDiscord(members: GuildMember[], partial = false) {
  const adopted = (await adoptAcademyMembers(members)).adopted > 0
  const lineups = await syncLineupsFromRoles(members, partial)
  const classes = await adoptClassRoles(members)
  return adopted || lineups || classes
}

// syncFromDiscord for one person, on sign-in.
export async function syncMemberFromDiscord(profileId: string) {
  if (!botEnabled()) return false
  const { data } = await createAdminClient().from('profiles').select('discord_id').eq('id', profileId).maybeSingle()
  const member = data?.discord_id ? await getGuildMember(data.discord_id as string) : null
  return !!member && (await syncFromDiscord([member], true))
}

// One role per class the person mainly drives (HY, GT3…).
export async function syncClassRoles(profileId: string) {
  if (!botEnabled()) return
  const { data } = await createAdminClient().from('profiles').select('discord_id, main_classes').eq('id', profileId).maybeSingle()
  if (!data?.discord_id) return
  const classes = (data.main_classes ?? []) as MainClass[]
  await setMemberRoles(data.discord_id as string, MAIN_CLASSES.map((c) => [discordEnv.roles.classes[c], classes.includes(c)]))
}

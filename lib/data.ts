import 'server-only'
import { cache } from 'react'
import { botEnabled, discordEnv, listGuildMembers, type GuildMember } from '@/lib/discord/api'
import { syncFromDiscord, syncRoleColors } from '@/lib/discord/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { DISCORD_INVITE_URL } from '@/lib/site'
import { MAIN_CLASSES, MAIN_CLASS_IN_SIM, type Driver, type MainClass, type Race, type RaceCar, type Result, type Sim } from '@/lib/types'

// Public data for the marketing pages. Every function returns an empty value
// on failure, so a database hiccup degrades a section instead of the page.

const DRIVER_COLUMNS = 'id, name, nickname, country_code, role_tag, sims, main_lineup, photo_path, academy, academy_class, main_classes, team_sims, lmu_dr_tier, lmu_dr_level, lmu_dr_updated_on'

// A race stays "next" until a few hours after its last timeslot starts, so
// the card is still up while it's running.
const RACE_GRACE_MS = 4 * 60 * 60 * 1000

type RaceRow = Omit<Race, 'cars'> & {
  race_cars: (Omit<RaceCar, 'drivers'> & {
    race_car_drivers: { sort_order: number; drivers: Driver | null }[]
  })[]
}

function toRace(row: RaceRow): Race {
  const { race_cars, ...race } = row
  return {
    ...race,
    cars: [...race_cars]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ race_car_drivers, ...car }) => ({
        ...car,
        drivers: [...race_car_drivers]
          .sort((a, b) => a.sort_order - b.sort_order)
          .flatMap((d) => (d.drivers ? [d.drivers] : [])),
      })),
  }
}

export async function getNextRace(sim?: Sim): Promise<Race | null> {
  const supabase = createPublicClient()
  let query = supabase
    .from('races')
    .select(`id, sim, event_name, series, track, race_length, starts_at, stream_url,
      race_cars ( id, car_name, class, sort_order, starts_at,
        race_car_drivers ( sort_order, drivers ( ${DRIVER_COLUMNS} ) ) )`)
    .eq('published', true)
    .gte('last_start_at', new Date(Date.now() - RACE_GRACE_MS).toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
  if (sim) query = query.eq('sim', sim)

  const { data, error } = await query
  if (error) {
    console.error('[data] next race:', error.message)
    return null
  }
  return data?.[0] ? toRace(data[0] as unknown as RaceRow) : null
}

// One published race, for the lineup graphic.
export async function getPublishedRace(id: string): Promise<Race | null> {
  const { data, error } = await createPublicClient()
    .from('races')
    .select(`id, sim, event_name, series, track, race_length, starts_at, stream_url,
      race_cars ( id, car_name, class, sort_order, starts_at,
        race_car_drivers ( sort_order, drivers ( ${DRIVER_COLUMNS} ) ) )`)
    .eq('id', id)
    .eq('published', true)
    .maybeSingle()
  if (error) {
    console.error('[data] race:', error.message)
    return null
  }
  return data ? toRace(data as unknown as RaceRow) : null
}

export async function getLatestResults(limit = 3): Promise<Result[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .order('raced_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[data] latest results:', error.message)
    return []
  }
  return (data ?? []) as Result[]
}

// Specific results, in race order, for the results graphic.
export async function getResultsByIds(ids: string[]): Promise<Result[]> {
  const { data, error } = await createPublicClient()
    .from('results')
    .select('*')
    .in('id', ids)
    .order('raced_on', { ascending: true, nullsFirst: true })
  if (error) {
    console.error('[data] results by id:', error.message)
    return []
  }
  return (data ?? []) as Result[]
}

// Everyone in the PRISM server, once per render, after bringing the site in
// line with their roles (syncFromDiscord: students, main lineups, classes)
// and the roles' colors in line with the site (syncRoleColors).
// Null without the bot, the service role key or the Server Members intent:
// the team page then shows what the site already has.
const discordMembers = cache(async (): Promise<GuildMember[] | null> => {
  if (!botEnabled() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  try {
    const members = await listGuildMembers()
    await Promise.all([members && syncFromDiscord(members), syncRoleColors()])
    return members
  } catch (err) {
    console.error('[data] discord sync:', err instanceof Error ? err.message : err)
    return null
  }
})

// Each driver's class in this sim, from the first of their classes found:
// picked on their profile, their class roles in Discord (people who've never
// signed in), or set on their roster entry (drivers linked to no one). The
// roster editor writes to whichever of those the driver has.
function classesIn(sim: Sim, picks: Map<string, MainClass[]>, members: GuildMember[] | null) {
  const roleClasses = new Map((members ?? []).flatMap((m) => {
    const classes = MAIN_CLASSES.filter((c) => !!discordEnv.roles.classes[c] && m.roles.includes(discordEnv.roles.classes[c]!))
    return m.user && classes.length ? [[m.user.id, classes] as const] : []
  }))
  const first = (classes: MainClass[] | undefined) => classes?.map((c) => MAIN_CLASS_IN_SIM[sim][c]).find(Boolean) || null
  return (profileId: string | null, discordId: string | null, own: MainClass[] = []) =>
    (profileId && first(picks.get(profileId))) || (discordId && first(roleClasses.get(discordId))) || first(own)
}

// The main lineup, each driver with their class (null when unknown). Who's on
// it follows the LMU Driver role in Discord; see syncFromDiscord.
export async function getMainLineup(sim: Sim): Promise<(Driver & { lineup_class: string | null })[]> {
  const members = await discordMembers()
  const { data, error } = await createPublicClient()
    .from('drivers')
    .select(`${DRIVER_COLUMNS}, profile_id, discord_id`)
    .contains('main_lineup', [sim])
    .eq('archived', false)
    .order('sort_order')
    .order('name')
  if (error) {
    console.error('[data] lineup:', error.message)
    return []
  }
  const drivers = (data ?? []) as (RosterDriver & { discord_id: string | null })[]
  const picks = await mainClassesOf(drivers.flatMap((d) => d.profile_id ?? []))
  const classOf = classesIn(sim, picks, members)
  return drivers.map(({ discord_id, ...d }) => ({ ...withoutProfile(d), lineup_class: classOf(d.profile_id, discord_id, d.main_classes) }))
}

// Profiles aren't public, so this reads only main_classes with the service
// role. Empty without the key or on any error.
async function mainClassesOf(profileIds: string[]): Promise<Map<string, MainClass[]>> {
  if (profileIds.length === 0 || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Map()
  const { data, error } = await createAdminClient().from('profiles').select('id, main_classes').in('id', profileIds)
  if (error) console.error('[data] main classes:', error.message)
  return new Map((data ?? []).map((p) => [p.id as string, (p.main_classes ?? []) as MainClass[]]))
}

type RosterDriver = Driver & { profile_id: string | null }
const withoutProfile = ({ profile_id: _, ...d }: RosterDriver): Driver => d

// The academy section of the team page: everyone approved into the academy
// for this sim (LMU, ACC or both), everyone holding this sim's Academy role in
// Discord, plus roster drivers ticked Academy. A linked roster entry supplies
// their flag, nickname and photo, and they drop off once they're on this
// sim's main lineup. Each goes under their class (see classesIn).
export async function getAcademyDrivers(sim: Sim): Promise<Driver[]> {
  const { data, error } = await createPublicClient()
    .from('drivers')
    .select(`${DRIVER_COLUMNS}, profile_id, discord_id`)
    .eq('academy', true)
    .contains('sims', [sim])
    .not('main_lineup', 'cs', `{${sim}}`)
    .eq('archived', false)
  if (error) {
    console.error('[data] academy drivers:', error.message)
    return []
  }
  const roster = (data ?? []) as (RosterDriver & { discord_id: string | null })[]
  const accounts = await academyAccounts(sim, roster.flatMap((d) => (d.profile_id ? [d.profile_id] : [])))
  const classOf = classesIn(sim, accounts?.classes ?? new Map(), accounts?.members ?? null)
  const nameOnly = (id: string, name: string, academy_class: string | null): Driver => ({
    id, name, nickname: null, country_code: null, role_tag: null, sims: [sim], main_lineup: [],
    photo_path: null, academy: true, academy_class, main_classes: [], team_sims: [], lmu_dr_tier: null, lmu_dr_level: null, lmu_dr_updated_on: null,
  })

  const list = roster.map(({ discord_id, ...d }) => ({ ...withoutProfile(d), academy_class: classOf(d.profile_id, discord_id, d.main_classes) }))
  // Account and Discord IDs of everyone listed, so nobody appears twice.
  const listed = new Set(roster.flatMap((d) => [d.profile_id, d.discord_id].filter((id): id is string => !!id)))
  for (const s of accounts?.students ?? []) {
    if (listed.has(s.id)) continue
    const d = accounts!.linked.get(s.id)
    if (d?.main_lineup.includes(sim)) continue
    list.push(d ? { ...withoutProfile(d), academy: true, academy_class: classOf(s.id, null, d.main_classes) } : nameOnly(`student-${s.id}`, s.name, classOf(s.id, null)))
  }
  // Role holders who've never signed in to the site: their roster entry if it's
  // linked to their Discord account, else just their Discord name.
  for (const m of accounts?.withoutAccount ?? []) {
    if (listed.has(m.id)) continue
    const d = accounts!.linkedByDiscord.get(m.id)
    if (d?.main_lineup.includes(sim)) continue
    list.push(d ? { ...withoutProfile(d), academy: true, academy_class: classOf(null, m.id, d.main_classes) } : nameOnly(`discord-${m.id}`, m.name, classOf(null, m.id)))
  }
  return list.sort((a, b) => a.name.localeCompare(b.name))
}

// Academy students in this sim's program or holding its Academy role in
// Discord, their roster entries and everyone's picked classes. Profiles and
// students aren't public, so this uses the service role. Role holders with an
// account were just made students by discordMembers' sync. Null without the
// key or on any error: the team page then shows the roster's academy drivers
// alone instead of failing the build.
async function academyAccounts(sim: Sim, rosterProfileIds: string[]) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  try {
    const admin = createAdminClient()
    const members = await discordMembers()
    const { data: students, error } = await admin
      .from('students')
      .select('profile_id, profile:profiles!students_profile_id_fkey ( display_name, discord_username )')
      .in('program', [sim, 'both'])
    if (error) throw new Error(error.message)
    const role = sim === 'lmu' ? discordEnv.roles.academyLmu : discordEnv.roles.academyAcc
    const holders = role ? (members ?? []).filter((m) => m.user && m.roles.includes(role)) : []
    const { data: holderProfiles } = holders.length
      ? await admin.from('profiles').select('id, discord_id, display_name, discord_username').in('discord_id', holders.map((m) => m.user!.id))
      : { data: [] }

    const people = new Map<string, string>()
    for (const s of students ?? []) {
      const p = s.profile as unknown as { display_name: string | null; discord_username: string | null } | null
      people.set(s.profile_id as string, p?.display_name || p?.discord_username || 'Academy driver')
    }
    for (const p of holderProfiles ?? []) people.set(p.id as string, (p.display_name as string) || (p.discord_username as string) || 'Academy driver')
    const withAccount = new Set((holderProfiles ?? []).map((p) => p.discord_id as string))
    const withoutAccount = holders.filter((m) => !withAccount.has(m.user!.id))

    const studentIds = [...people.keys()]
    const ids = [...new Set([...studentIds, ...rosterProfileIds])]
    const [{ data: profiles }, { data: linked }, { data: linkedByDiscord }] = await Promise.all([
      ids.length ? admin.from('profiles').select('id, main_classes').in('id', ids) : { data: [] },
      studentIds.length
        ? admin.from('drivers').select(`${DRIVER_COLUMNS}, profile_id`).in('profile_id', studentIds).eq('archived', false)
        : { data: [] },
      withoutAccount.length
        ? admin.from('drivers').select(`${DRIVER_COLUMNS}, profile_id, discord_id`).in('discord_id', withoutAccount.map((m) => m.user!.id)).eq('archived', false)
        : { data: [] },
    ])
    return {
      members,
      students: [...people].map(([id, name]) => ({ id, name })),
      withoutAccount: withoutAccount.map((m) => ({ id: m.user!.id, name: m.nick || m.user!.global_name || m.user!.username })),
      classes: new Map((profiles ?? []).map((p) => [p.id as string, (p.main_classes ?? []) as MainClass[]])),
      linked: new Map(((linked ?? []) as RosterDriver[]).map((d) => [d.profile_id!, d])),
      linkedByDiscord: new Map(((linkedByDiscord ?? []) as (RosterDriver & { discord_id: string })[]).map(({ discord_id, ...d }) => [discord_id, d])),
    }
  } catch (err) {
    console.error('[data] academy accounts:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function getSeasons(sim: Sim): Promise<number[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.from('results').select('season').eq('sim', sim)
  if (error) {
    console.error('[data] seasons:', error.message)
    return []
  }
  return [...new Set((data ?? []).map((r) => r.season as number))].sort((a, b) => b - a)
}

export type SeasonResults = {
  results: Result[]
  races: number
  wins: number
  podiums: number
  bestChampionship: number | null
}

export async function getSeasonResults(sim: Sim, season: number): Promise<SeasonResults> {
  const supabase = createPublicClient()
  const [results, summary] = await Promise.all([
    supabase
      .from('results')
      .select('*')
      .eq('sim', sim)
      .eq('season', season)
      .order('raced_on', { ascending: false, nullsFirst: false }),
    supabase
      .from('season_summaries')
      .select('best_championship')
      .eq('sim', sim)
      .eq('season', season)
      .maybeSingle(),
  ])
  if (results.error) console.error('[data] season results:', results.error.message)

  const rows = (results.data ?? []) as Result[]
  const finishes = rows.map((r) => r.finish).filter((f): f is number => typeof f === 'number')
  return {
    results: rows,
    races: finishes.length,
    wins: finishes.filter((f) => f === 1).length,
    podiums: finishes.filter((f) => f <= 3).length,
    bestChampionship: summary.data?.best_championship ?? null,
  }
}

// Member and online counts from the public invite endpoint (no bot needed).
export async function getDiscordCounts(): Promise<{ members: number; online: number } | null> {
  const code = DISCORD_INVITE_URL?.match(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([\w-]+)/)?.[1]
  if (!code) return null
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, {
      next: { revalidate: 900 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { approximate_member_count?: number; approximate_presence_count?: number }
    if (typeof json.approximate_member_count !== 'number') return null
    return { members: json.approximate_member_count, online: json.approximate_presence_count ?? 0 }
  } catch {
    return null
  }
}

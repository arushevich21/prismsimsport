import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { DISCORD_INVITE_URL } from '@/lib/site'
import { MAIN_CLASS_IN_SIM, type Driver, type MainClass, type Race, type RaceCar, type Result, type Sim } from '@/lib/types'

// Public data for the marketing pages. Every function returns an empty value
// on failure, so a database hiccup degrades a section instead of the page.

const DRIVER_COLUMNS = 'id, name, nickname, country_code, role_tag, sims, main_lineup, photo_path, academy, academy_class, lmu_dr_tier, lmu_dr_level, lmu_dr_updated_on'

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

export async function getMainLineup(sim: Sim): Promise<Driver[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('drivers')
    .select(DRIVER_COLUMNS)
    .contains('main_lineup', [sim])
    .eq('archived', false)
    .order('sort_order')
  if (error) {
    console.error('[data] lineup:', error.message)
    return []
  }
  return (data ?? []) as Driver[]
}

type RosterDriver = Driver & { profile_id: string | null }
const withoutProfile = ({ profile_id: _, ...d }: RosterDriver): Driver => d

// The academy section of the team page: everyone approved into the academy
// for this sim (LMU, ACC or both), plus roster drivers ticked Academy. A
// linked roster entry supplies their flag, nickname and photo, and they drop
// off once they're on this sim's main lineup. Each goes under the first class
// they picked on their profile, else the roster's academy class.
export async function getAcademyDrivers(sim: Sim): Promise<Driver[]> {
  const { data, error } = await createPublicClient()
    .from('drivers')
    .select(`${DRIVER_COLUMNS}, profile_id`)
    .eq('academy', true)
    .contains('sims', [sim])
    .not('main_lineup', 'cs', `{${sim}}`)
    .eq('archived', false)
  if (error) {
    console.error('[data] academy drivers:', error.message)
    return []
  }
  const roster = (data ?? []) as RosterDriver[]
  const accounts = await academyAccounts(sim, roster.flatMap((d) => (d.profile_id ? [d.profile_id] : [])))
  const classIn = (profileId: string | null) =>
    (profileId && accounts?.classes.get(profileId)?.map((c) => MAIN_CLASS_IN_SIM[sim][c]).find(Boolean)) || null

  const list = roster.map((d) => ({ ...withoutProfile(d), academy_class: classIn(d.profile_id) ?? d.academy_class }))
  const listed = new Set(roster.map((d) => d.profile_id))
  for (const s of accounts?.students ?? []) {
    if (listed.has(s.id)) continue
    const d = accounts!.linked.get(s.id)
    if (d?.main_lineup.includes(sim)) continue
    list.push(
      d
        ? { ...withoutProfile(d), academy: true, academy_class: classIn(s.id) ?? d.academy_class }
        : {
            id: `student-${s.id}`, name: s.name, nickname: null, country_code: null, role_tag: null, sims: [sim], main_lineup: [],
            photo_path: null, academy: true, academy_class: classIn(s.id), lmu_dr_tier: null, lmu_dr_level: null, lmu_dr_updated_on: null,
          }
    )
  }
  return list.sort((a, b) => a.name.localeCompare(b.name))
}

// Academy students in this sim's program, their roster entries and everyone's
// picked classes. Profiles and students aren't public, so this uses the
// service role. Null without the key or on any error: the team page then
// shows the roster's academy drivers alone instead of failing the build.
async function academyAccounts(sim: Sim, rosterProfileIds: string[]) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  try {
    const admin = createAdminClient()
    const { data: students, error } = await admin
      .from('students')
      .select('profile_id, profile:profiles!students_profile_id_fkey ( display_name, discord_username )')
      .in('program', [sim, 'both'])
    if (error) throw new Error(error.message)
    const studentIds = (students ?? []).map((s) => s.profile_id as string)
    const ids = [...new Set([...studentIds, ...rosterProfileIds])]
    const [{ data: profiles }, { data: linked }] = await Promise.all([
      ids.length ? admin.from('profiles').select('id, main_classes').in('id', ids) : { data: [] },
      studentIds.length
        ? admin.from('drivers').select(`${DRIVER_COLUMNS}, profile_id`).in('profile_id', studentIds).eq('archived', false)
        : { data: [] },
    ])
    return {
      students: (students ?? []).map((s) => {
        const p = s.profile as unknown as { display_name: string | null; discord_username: string | null } | null
        return { id: s.profile_id as string, name: p?.display_name || p?.discord_username || 'Academy driver' }
      }),
      classes: new Map((profiles ?? []).map((p) => [p.id as string, (p.main_classes ?? []) as MainClass[]])),
      linked: new Map(((linked ?? []) as RosterDriver[]).map((d) => [d.profile_id!, d])),
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

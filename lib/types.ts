export type Sim = 'lmu' | 'acc'

export const SIMS: Sim[] = ['lmu', 'acc']

export const SIM_LABEL: Record<Sim, string> = {
  lmu: 'Le Mans Ultimate',
  acc: 'Assetto Corsa Competizione',
}

export const SIM_SHORT: Record<Sim, string> = { lmu: 'LMU', acc: 'ACC' }

export const CLASSES: Record<Sim, string[]> = {
  lmu: ['Hypercar', 'LMP2', 'LMP3', 'LMGT3'],
  acc: ['GT3'],
}

// The classes someone can say they mainly drive, on their profile. Each one
// has a Discord role. LMU's LMGT3 and ACC's GT3 share the GT3 role.
export const MAIN_CLASSES = ['hy', 'lmp2', 'lmp3', 'gt3'] as const
export type MainClass = (typeof MAIN_CLASSES)[number]
export const MAIN_CLASS_LABEL: Record<MainClass, string> = { hy: 'Hypercar', lmp2: 'LMP2', lmp3: 'LMP3', gt3: 'GT3' }
export const MAX_MAIN_CLASSES = 2
// The team page's class name for each main class, per sim.
export const MAIN_CLASS_IN_SIM: Record<Sim, Partial<Record<MainClass, string>>> = {
  lmu: { hy: 'Hypercar', lmp2: 'LMP2', lmp3: 'LMP3', gt3: 'LMGT3' },
  acc: { gt3: 'GT3' },
}
export const isMainClass = (v: string): v is MainClass => (MAIN_CLASSES as readonly string[]).includes(v)

export function isSim(value: string): value is Sim {
  return value === 'lmu' || value === 'acc'
}

export type Driver = {
  id: string
  name: string
  nickname: string | null
  country_code: string | null
  role_tag: string | null
  sims: Sim[]
  main_lineup: Sim[]
  photo_path: string | null
  academy: boolean
  academy_class: string | null
  lmu_dr_tier: DriverRankTier | null
  lmu_dr_level: number | null
  lmu_dr_updated_on: string | null
}

export type DriverRankTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export const DR_TIERS: DriverRankTier[] = ['bronze', 'silver', 'gold', 'platinum']

// How a driver in a race lineup is labelled when they're not on that sim's
// main lineup.
export function lineupBadge(driver: Pick<Driver, 'main_lineup' | 'academy'>, sim: Sim): 'ACADEMY' | 'GUEST' | null {
  if (driver.main_lineup.includes(sim)) return null
  return driver.academy ? 'ACADEMY' : 'GUEST'
}

export type RaceCar = {
  id: string
  car_name: string | null
  class: string | null
  sort_order: number
  // This car's timeslot; null means the race's green flag.
  starts_at: string | null
  drivers: Driver[]
}

export type Race = {
  id: string
  sim: Sim
  event_name: string | null
  series: string | null
  track: string | null
  race_length: string | null
  starts_at: string | null
  stream_url: string | null
  cars: RaceCar[]
}

// When a car starts: its own timeslot, or the race's green flag.
export const carStart = (car: { starts_at: string | null }, race: { starts_at: string | null }) => car.starts_at ?? race.starts_at

// Every distinct start time in a race, earliest first.
export function raceSlots(race: { starts_at: string | null; cars: { starts_at: string | null }[] }): string[] {
  const times = race.cars.length ? race.cars.map((c) => carStart(c, race)) : [race.starts_at]
  const byMs = new Map(times.filter((t): t is string => !!t).map((t) => [Date.parse(t), t]))
  return [...byMs.entries()].sort((a, b) => a[0] - b[0]).map(([, t]) => t)
}

export type Result = {
  id: string
  sim: Sim
  season: number
  raced_on: string | null
  championship: string | null
  track: string | null
  car: string | null
  class: string | null
  finish: number | null
}

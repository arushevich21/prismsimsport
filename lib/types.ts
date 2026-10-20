export type Sim = 'lmu' | 'acc'

export const SIMS: Sim[] = ['lmu', 'acc']

export const SIM_LABEL: Record<Sim, string> = {
  lmu: 'Le Mans Ultimate',
  acc: 'Assetto Corsa Competizione',
}

export const SIM_SHORT: Record<Sim, string> = { lmu: 'LMU', acc: 'ACC' }

export const CLASSES: Record<Sim, string[]> = {
  lmu: ['Hypercar', 'LMP2', 'LMP3', 'LMGT3'],
  acc: ['GT3', 'GT4'],
}

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

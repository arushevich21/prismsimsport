export type Sim = 'lmu' | 'acc'

export const SIMS: Sim[] = ['lmu', 'acc']

export const SIM_LABEL: Record<Sim, string> = {
  lmu: 'Le Mans Ultimate',
  acc: 'Assetto Corsa Competizione',
}

export const SIM_SHORT: Record<Sim, string> = { lmu: 'LMU', acc: 'ACC' }

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

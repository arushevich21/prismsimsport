// Coaching session types. Slugs match the Cal.com event types on each coach's account.
export const SESSION_TYPES = [
  { minutes: 30, slug: 'coaching-30', priceCents: 2000, bestFor: 'Quick telemetry review or dialing in a single corner or sector' },
  { minutes: 60, slug: 'coaching-60', priceCents: 3500, bestFor: 'A full session on one track: driving, data, and setup' },
  { minutes: 90, slug: 'coaching-90', priceCents: 5000, bestFor: 'Deep dive across multiple tracks or full race-weekend prep' },
] as const

export type SessionMinutes = (typeof SESSION_TYPES)[number]['minutes']

export function priceFor(minutes: number) {
  return SESSION_TYPES.find((s) => s.minutes === minutes)?.priceCents ?? null
}

export function formatPrice(cents: number | null) {
  if (cents === null) return '—'
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`
}

export const TIERS = ['student', 'driver', 'elite'] as const
export type Tier = (typeof TIERS)[number]

export const TIER_LABEL: Record<Tier, string> = { student: 'Student', driver: 'Driver', elite: 'Elite' }

// Who an academy student races for. Coaching is PRISM's either way.
export const PROGRAMS = ['lmu', 'acc', 'both'] as const
export type Program = (typeof PROGRAMS)[number]
export const PROGRAM_LABEL: Record<Program, string> = {
  lmu: 'LMU: race under the PRISM banner',
  acc: 'ACC: race with Falcon Motorsport',
  both: 'Both',
}
export const PROGRAM_SHORT: Record<Program, string> = { lmu: 'LMU', acc: 'ACC · Falcon', both: 'LMU + ACC' }
export const isProgram = (v: string): v is Program => (PROGRAMS as readonly string[]).includes(v)

// Telemetry and replay files students can send. Sizes are checked in the browser too.
export const TELEMETRY_EXTENSIONS = ['.rpy', '.ld', '.ldx', '.duckdb', '.csv', '.json', '.zip']
export const TELEMETRY_MAX_BYTES = 100 * 1024 * 1024

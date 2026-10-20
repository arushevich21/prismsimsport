import 'server-only'
import { SITE_URL } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'
import { SIM_LABEL, SIM_SHORT, lineupBadge, type Sim } from '@/lib/types'
import {
  COLORS, botEnabled, clip, deleteChannelMessage, deleteScheduledEvent, discordEnv, editChannelMessage, flagEmoji,
  postToChannel, setMemberRole, timestamp, upsertScheduledEvent, type MessagePayload,
} from './api'

// Keeps Discord in step with the team data the admin edits on the site.

type RaceRow = {
  id: string
  sim: Sim
  event_name: string | null
  series: string | null
  track: string | null
  race_length: string | null
  starts_at: string | null
  stream_url: string | null
  published: boolean
  discord_message_id: string | null
  discord_event_id: string | null
  race_cars: {
    car_name: string | null
    class: string | null
    sort_order: number
    race_car_drivers: { sort_order: number; drivers: { name: string; nickname: string | null; country_code: string | null; profile_id: string | null; main_lineup: Sim[]; academy: boolean } | null }[]
  }[]
}

// "6 hours" → 6h, "90 min" → 1.5h; anything else (laps, blank) → 2h.
function durationMs(length: string | null) {
  const h = length?.match(/(\d+(?:\.\d+)?)\s*h/i)
  if (h) return Math.min(Number(h[1]), 24) * 3600_000
  const m = length?.match(/(\d+)\s*m/i)
  if (m) return Math.min(Number(m[1]), 1440) * 60_000
  return 2 * 3600_000
}

async function loadRace(raceId: string): Promise<RaceRow | null> {
  const { data } = await createAdminClient()
    .from('races')
    .select(`id, sim, event_name, series, track, race_length, starts_at, stream_url, published, discord_message_id, discord_event_id,
      race_cars ( car_name, class, sort_order, race_car_drivers ( sort_order, drivers ( name, nickname, country_code, profile_id, main_lineup, academy ) ) )`)
    .eq('id', raceId)
    .maybeSingle()
  return data as unknown as RaceRow | null
}

async function lineupMessage(race: RaceRow): Promise<MessagePayload> {
  const profileIds = race.race_cars.flatMap((c) => c.race_car_drivers.map((d) => d.drivers?.profile_id)).filter((id): id is string => !!id)
  const { data: profiles } = profileIds.length
    ? await createAdminClient().from('profiles').select('id, discord_id').in('id', profileIds)
    : { data: [] }
  const discordOf = new Map((profiles ?? []).map((p) => [p.id as string, p.discord_id as string | null]))
  const mentioned: string[] = []

  const fields = [...race.race_cars]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((car) => {
      const lines = [...car.race_car_drivers]
        .sort((a, b) => a.sort_order - b.sort_order)
        .flatMap((d) => (d.drivers ? [d.drivers] : []))
        .map((d) => {
          const discordId = d.profile_id ? discordOf.get(d.profile_id) : null
          if (discordId) mentioned.push(discordId)
          const badge = lineupBadge(d, race.sim)
          const tag = badge ? ` *(${badge.toLowerCase()})*` : ''
          return `${flagEmoji(d.country_code)} ${discordId ? `<@${discordId}>` : d.name}${tag}`.trim()
        })
      return {
        name: clip([car.car_name ?? 'Car', car.class?.toUpperCase()].filter(Boolean).join(' · '), 256),
        value: clip(lines.join('\n') || 'Drivers to be confirmed'),
        inline: true,
      }
    })

  const when = race.starts_at ? `🟢 Green flag ${timestamp(race.starts_at)} · ${timestamp(race.starts_at, 'R')}` : ''
  return {
    content: `**${SIM_SHORT[race.sim]} race lineup**`,
    embeds: [{
      title: clip(race.event_name ?? race.series ?? 'Next race', 256),
      url: `${SITE_URL}/team/${race.sim}#lineup`,
      description: [[race.track, race.race_length].filter(Boolean).join(' · '), when, race.stream_url ? `📺 ${race.stream_url}` : '']
        .filter(Boolean)
        .join('\n'),
      color: race.sim === 'lmu' ? COLORS.ice : COLORS.ember,
      fields,
      footer: { text: `PRISM · ${SIM_LABEL[race.sim]}` },
    }],
    allowed_mentions: { users: [...new Set(mentioned)] },
  }
}

// Posts or updates the lineup announcement and the Discord event for a race.
export async function syncRace(raceId: string) {
  if (!botEnabled()) return
  const race = await loadRace(raceId)
  if (!race) return
  if (!race.published || !race.starts_at) return removeRaceById(race)

  const admin = createAdminClient()
  const updates: { discord_message_id?: string | null; discord_event_id?: string | null } = {}
  const channel = discordEnv.channels.lineups

  if (channel) {
    const payload = await lineupMessage(race)
    const edited = race.discord_message_id ? await editChannelMessage(channel, race.discord_message_id, payload) : null
    if (!edited) {
      const posted = await postToChannel(channel, payload)
      if (posted) updates.discord_message_id = posted.id
    }
  }

  const start = Date.parse(race.starts_at)
  if (start > Date.now()) {
    const event = await upsertScheduledEvent(race.discord_event_id, {
      name: `${SIM_SHORT[race.sim]} · ${race.event_name ?? race.series ?? race.track ?? 'PRISM race'}`,
      description: [race.track, race.race_length, `Lineup: ${SITE_URL}/team/${race.sim}#lineup`].filter(Boolean).join(' · '),
      start: new Date(start).toISOString(),
      end: new Date(start + durationMs(race.race_length)).toISOString(),
      location: race.stream_url ?? `${SIM_LABEL[race.sim]}${race.track ? ` · ${race.track}` : ''}`,
    })
    if (event && event.id !== race.discord_event_id) updates.discord_event_id = event.id
  }

  if (Object.keys(updates).length) await admin.from('races').update(updates).eq('id', race.id)
}

async function removeRaceById(race: Pick<RaceRow, 'id' | 'discord_message_id' | 'discord_event_id'>) {
  if (race.discord_message_id && discordEnv.channels.lineups) await deleteChannelMessage(discordEnv.channels.lineups, race.discord_message_id)
  if (race.discord_event_id) await deleteScheduledEvent(race.discord_event_id)
  if (race.discord_message_id || race.discord_event_id) {
    await createAdminClient().from('races').update({ discord_message_id: null, discord_event_id: null }).eq('id', race.id)
  }
}

// Call before deleting a race (or unpublishing it).
export async function removeRace(raceId: string) {
  if (!botEnabled()) return
  const { data } = await createAdminClient().from('races').select('id, discord_message_id, discord_event_id').eq('id', raceId).maybeSingle()
  if (data) await removeRaceById(data)
}

// Posts results that haven't been announced yet, then marks them announced.
export async function announceNewResults(sim: Sim, season: number) {
  if (!botEnabled() || !discordEnv.channels.results) return 0
  const admin = createAdminClient()
  const { data } = await admin
    .from('results')
    .select('id, raced_on, championship, track, car, class, finish')
    .eq('sim', sim)
    .eq('season', season)
    .is('announced_at', null)
    .not('finish', 'is', null)
    .order('raced_on', { ascending: true, nullsFirst: true })
  const rows = data ?? []
  if (rows.length === 0) return 0

  const medal = (f: number) => (f === 1 ? '🥇' : f === 2 ? '🥈' : f === 3 ? '🥉' : '🏁')
  const posted = await postToChannel(discordEnv.channels.results, {
    embeds: rows.slice(0, 10).map((r) => ({
      title: clip(`${medal(r.finish)} P${r.finish} · ${[r.championship, r.track].filter(Boolean).join(' · ') || 'Race'}`, 256),
      description: [r.car, r.class?.toUpperCase(), r.raced_on].filter(Boolean).join(' · '),
      color: r.finish <= 3 ? COLORS.ember : COLORS.ice,
      url: `${SITE_URL}/team/${sim}#results`,
    })),
  })
  if (!posted) return 0
  await admin.from('results').update({ announced_at: new Date().toISOString() }).in('id', rows.slice(0, 10).map((r) => r.id))
  return Math.min(rows.length, 10)
}

// Gives linked drivers the LMU / ACC driver role when they're on that main
// lineup, and takes it away when they're not (or archived).
export async function syncDriverRoles() {
  if (!botEnabled()) return
  const admin = createAdminClient()
  const { data: drivers } = await admin.from('drivers').select('profile_id, main_lineup, archived').not('profile_id', 'is', null)
  const ids = (drivers ?? []).map((d) => d.profile_id as string)
  if (ids.length === 0) return
  const { data: profiles } = await admin.from('profiles').select('id, discord_id').in('id', ids)
  const discordOf = new Map((profiles ?? []).map((p) => [p.id as string, p.discord_id as string | null]))

  for (const d of drivers ?? []) {
    const discordId = discordOf.get(d.profile_id as string)
    if (!discordId) continue
    const lineup = (d.archived ? [] : d.main_lineup) as Sim[]
    await setMemberRole(discordId, discordEnv.roles.lmu, lineup.includes('lmu'))
    await setMemberRole(discordId, discordEnv.roles.acc, lineup.includes('acc'))
  }
}

import 'server-only'
import { syncTeamRoles } from './roles'
import { SITE_URL } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'
import { SIM_LABEL, SIM_SHORT, carStart, lineupBadge, raceSlots, type Sim } from '@/lib/types'
import {
  COLORS, botEnabled, clip, deleteChannelMessage, deleteScheduledEvent, discordEnv, editChannelMessage, flagEmoji,
  postToChannel, takeDiscordError, timestamp, upsertScheduledEvent, type MessagePayload,
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
  discord_slot_events: Record<string, string> | null
  discord_channel_posts: Record<string, string> | null
  race_cars: {
    id: string
    car_name: string | null
    class: string | null
    sort_order: number
    starts_at: string | null
    discord_channel_id: string | null
    race_car_drivers: { sort_order: number; drivers: { name: string; nickname: string | null; country_code: string | null; profile_id: string | null; main_lineup: Sim[]; academy: boolean; team_sims: Sim[] } | null }[]
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
    .select(`id, sim, event_name, series, track, race_length, starts_at, stream_url, published, discord_message_id, discord_event_id, discord_slot_events, discord_channel_posts,
      race_cars ( id, car_name, class, sort_order, starts_at, discord_channel_id, race_car_drivers ( sort_order, drivers ( name, nickname, country_code, profile_id, main_lineup, academy, team_sims ) ) )`)
    .eq('id', raceId)
    .maybeSingle()
  return data as unknown as RaceRow | null
}

const slotsOf = (race: RaceRow) => raceSlots({ starts_at: race.starts_at, cars: race.race_cars })

// Names of the cars starting at a given time.
const carsAt = (race: RaceRow, iso: string) =>
  race.race_cars.filter((c) => Date.parse(carStart(c, race) ?? '') === Date.parse(iso)).map((c) => c.car_name).filter((n): n is string => !!n)

// The story-format lineup graphic, for some or all of the race's cars. A fresh
// version on every save, so Discord doesn't keep showing a cached old one.
function lineupGraphic(race: RaceRow, cars?: RaceRow['race_cars']) {
  const params = new URLSearchParams({ v: String(Date.now()) })
  if (cars) params.set('cars', cars.map((c) => c.id).join(','))
  return `${SITE_URL}/api/graphics/lineup/${race.id}?${params}`
}

async function lineupMessage(race: RaceRow, image: string): Promise<MessagePayload> {
  const slots = slotsOf(race)
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
      const start = carStart(car, race)
      if (slots.length > 1 && start) lines.unshift(`🕒 ${timestamp(start)}`)
      return {
        name: clip([car.car_name ?? 'Car', car.class?.toUpperCase()].filter(Boolean).join(' · '), 256),
        value: clip(lines.join('\n') || 'Drivers to be confirmed'),
        inline: true,
      }
    })

  const when = slots.length > 1
    ? slots.map((iso, i) => `🟢 ${carsAt(race, iso).join(' & ') || `Timeslot ${i + 1}`}: ${timestamp(iso)} · ${timestamp(iso, 'R')}`).join('\n')
    : slots[0] ? `🟢 Green flag ${timestamp(slots[0])} · ${timestamp(slots[0], 'R')}` : ''
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
      image: { url: image },
      footer: { text: `PRISM · ${SIM_LABEL[race.sim]}` },
    }],
    allowed_mentions: { users: [...new Set(mentioned)] },
  }
}

// What a race save did on Discord, so the editor can say so honestly.
export type RaceSyncReport =
  | { status: 'off' } // no bot token
  | { status: 'removed'; hadPosts: boolean } // draft or no start time
  | {
      status: 'synced'
      lineup: 'posted' | 'updated' | 'no-channel' | 'failed'
      lineupError?: string // why the lineup post failed, from Discord
      events: { synced: number; failed: number; noServer: boolean }
      channels: { posted: number; failed: number; error?: string } // per-car timeslot channels
    }

// Posts or updates the lineup announcement and the Discord events for a race.
export async function syncRace(raceId: string): Promise<RaceSyncReport> {
  if (!botEnabled()) return { status: 'off' }
  const race = await loadRace(raceId)
  if (!race) return { status: 'removed', hadPosts: false }
  const slots = slotsOf(race)
  if (!race.published || slots.length === 0) return { status: 'removed', hadPosts: await removeRaceById(race) }

  const admin = createAdminClient()
  const updates: {
    discord_message_id?: string | null
    discord_event_id?: null
    discord_slot_events?: Record<string, string>
    discord_channel_posts?: Record<string, string>
  } = {}
  const channel = discordEnv.channels.lineups
  let lineup: 'posted' | 'updated' | 'no-channel' | 'failed' = 'no-channel'
  let lineupError: string | undefined

  if (channel) {
    const payload = await lineupMessage(race, lineupGraphic(race))
    const edited = race.discord_message_id ? await editChannelMessage(channel, race.discord_message_id, payload) : null
    if (edited) lineup = 'updated'
    else {
      const posted = await postToChannel(channel, payload)
      if (posted) updates.discord_message_id = posted.id
      lineup = posted ? 'posted' : 'failed'
      if (!posted) lineupError = takeDiscordError() ?? undefined
    }
  }

  // Cars with their own channel (e.g. #friday-lm24) also get a post there,
  // showing just the cars in that channel. Edited in place on later saves.
  const oldPosts = race.discord_channel_posts ?? {}
  const channelPosts: Record<string, string> = {}
  const channelReport: { posted: number; failed: number; error?: string } = { posted: 0, failed: 0 }
  const byChannel = new Map<string, RaceRow['race_cars']>()
  for (const car of race.race_cars) {
    if (car.discord_channel_id) byChannel.set(car.discord_channel_id, [...(byChannel.get(car.discord_channel_id) ?? []), car])
  }
  for (const [channelId, cars] of byChannel) {
    const payload = await lineupMessage({ ...race, race_cars: cars }, lineupGraphic(race, cars))
    const existing = oldPosts[channelId]
    const message = (existing && (await editChannelMessage(channelId, existing, payload))) || (await postToChannel(channelId, payload))
    if (message) {
      channelPosts[channelId] = message.id
      channelReport.posted++
    } else {
      channelReport.failed++
      channelReport.error ??= takeDiscordError() ?? undefined
    }
  }
  for (const [channelId, messageId] of Object.entries(oldPosts)) {
    if (!byChannel.has(channelId)) await deleteChannelMessage(channelId, messageId)
  }
  if (JSON.stringify(channelPosts) !== JSON.stringify(oldPosts)) updates.discord_channel_posts = channelPosts

  // One Discord event per timeslot. Events are matched to slots by start time;
  // a slot whose time was edited reuses a leftover event instead of a new one.
  const known = new Map(Object.entries(race.discord_slot_events ?? {}).map(([iso, id]) => [Date.parse(iso), id]))
  if (race.discord_event_id && known.size === 0) known.set(Date.parse(slots[0]!), race.discord_event_id) // from before timeslots
  const leftover = [...known.entries()].filter(([ms]) => !slots.some((iso) => Date.parse(iso) === ms)).map(([, id]) => id)
  const base = `${SIM_SHORT[race.sim]} · ${race.event_name ?? race.series ?? race.track ?? 'PRISM race'}`
  const events: Record<string, string> = {}
  const eventReport = { synced: 0, failed: 0, noServer: !discordEnv.guildId }

  for (const iso of slots) {
    const start = Date.parse(iso)
    const existing = known.get(start) ?? null
    if (start <= Date.now()) {
      if (existing) events[iso] = existing // already started: leave it alone
      continue
    }
    const cars = carsAt(race, iso)
    const event = await upsertScheduledEvent(existing ?? leftover.shift() ?? null, {
      name: slots.length > 1 && cars.length ? `${base} · ${cars.join(' & ')}` : base,
      description: [race.track, race.race_length, `Lineup: ${SITE_URL}/team/${race.sim}#lineup`].filter(Boolean).join(' · '),
      start: new Date(start).toISOString(),
      end: new Date(start + durationMs(race.race_length)).toISOString(),
      location: race.stream_url ?? `${SIM_LABEL[race.sim]}${race.track ? ` · ${race.track}` : ''}`,
    })
    if (event) {
      events[iso] = event.id
      eventReport.synced++
    } else eventReport.failed++
  }
  for (const id of leftover) await deleteScheduledEvent(id)

  if (JSON.stringify(events) !== JSON.stringify(race.discord_slot_events ?? {})) updates.discord_slot_events = events
  if (race.discord_event_id) updates.discord_event_id = null
  if (Object.keys(updates).length) await admin.from('races').update(updates).eq('id', race.id)
  return { status: 'synced', lineup, lineupError, events: eventReport, channels: channelReport }
}

// Returns whether there was anything on Discord to remove.
async function removeRaceById(race: Pick<RaceRow, 'id' | 'discord_message_id' | 'discord_event_id' | 'discord_slot_events' | 'discord_channel_posts'>) {
  const eventIds = [...new Set([race.discord_event_id, ...Object.values(race.discord_slot_events ?? {})].filter((id): id is string => !!id))]
  const channelPosts = Object.entries(race.discord_channel_posts ?? {})
  if (race.discord_message_id && discordEnv.channels.lineups) await deleteChannelMessage(discordEnv.channels.lineups, race.discord_message_id)
  for (const [channelId, messageId] of channelPosts) await deleteChannelMessage(channelId, messageId)
  for (const id of eventIds) await deleteScheduledEvent(id)
  const had = !!race.discord_message_id || eventIds.length > 0 || channelPosts.length > 0
  if (had) {
    await createAdminClient()
      .from('races')
      .update({ discord_message_id: null, discord_event_id: null, discord_slot_events: {}, discord_channel_posts: {} })
      .eq('id', race.id)
  }
  return had
}

// Call before deleting a race (or unpublishing it).
export async function removeRace(raceId: string) {
  if (!botEnabled()) return
  const { data } = await createAdminClient().from('races').select('id, discord_message_id, discord_event_id, discord_slot_events, discord_channel_posts').eq('id', raceId).maybeSingle()
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

  // One post per save: the results graphic (up to six rows) plus a text line
  // per result, so they're searchable and readable without opening the image.
  const batch = rows.slice(0, 6)
  const medal = (f: number) => (f === 1 ? '🥇' : f === 2 ? '🥈' : f === 3 ? '🥉' : '🏁')
  const best = Math.min(...batch.map((r) => r.finish as number))
  const posted = await postToChannel(discordEnv.channels.results, {
    content: `**${SIM_SHORT[sim]} results**`,
    embeds: [{
      title: batch.length === 1 ? clip(`P${batch[0]!.finish} · ${batch[0]!.championship ?? batch[0]!.track ?? 'Race'}`, 256) : `${batch.length} new results`,
      url: `${SITE_URL}/team/${sim}#results`,
      description: clip(
        batch.map((r) => `${medal(r.finish)} **P${r.finish}** · ${[r.championship, r.track].filter(Boolean).join(' · ') || 'Race'}${r.car ? ` (${r.car})` : ''}`).join('\n'),
        4000
      ),
      color: best <= 3 ? COLORS.ember : COLORS.ice,
      image: { url: `${SITE_URL}/api/graphics/results?ids=${batch.map((r) => r.id).join(',')}` },
      footer: { text: `PRISM · ${SIM_LABEL[sim]}` },
    }],
  })
  if (!posted) return 0
  await admin.from('results').update({ announced_at: new Date().toISOString() }).in('id', batch.map((r) => r.id))
  return batch.length
}

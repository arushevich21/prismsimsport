import 'server-only'

// Minimal Discord REST client for the PRISM bot. No gateway connection: the
// site calls Discord when something happens, and Discord calls
// /api/discord/interactions when someone clicks a button. Runs on Vercel.

const API = 'https://discord.com/api/v10'

export const discordEnv = {
  token: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  roles: {
    academy: process.env.DISCORD_ROLE_ACADEMY,
    coach: process.env.DISCORD_ROLE_COACH,
    lmu: process.env.DISCORD_ROLE_LMU_DRIVER,
    acc: process.env.DISCORD_ROLE_ACC_DRIVER,
  },
  channels: {
    lineups: process.env.DISCORD_CHANNEL_LINEUPS,
    results: process.env.DISCORD_CHANNEL_RESULTS,
    staff: process.env.DISCORD_CHANNEL_STAFF,
    captains: process.env.DISCORD_CHANNEL_CAPTAINS,
  },
}

export const botEnabled = () => !!discordEnv.token

export type Embed = {
  title?: string
  description?: string
  url?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  timestamp?: string
}

export type Button =
  | { type: 2; style: 1 | 2; label: string; custom_id: string }
  | { type: 2; style: 5; label: string; url: string }

export type MessagePayload = {
  content?: string
  embeds?: Embed[]
  components?: { type: 1; components: Button[] }[]
  allowed_mentions?: { parse?: string[]; users?: string[]; roles?: string[] }
}

export const COLORS = { ice: 0x9cc4f2, iris: 0xa5a8f7, ember: 0xffb678, graphite: 0x15171c }

// Discord limits: 1024 per field value, 4096 per description, 256 per title.
export const clip = (s: string, max = 1024) => (s.length > max ? s.slice(0, max - 1) + '…' : s)

// Calls the Discord API as the bot. Never throws: returns null on failure so a
// Discord outage can't break the site action that triggered it.
export async function discord<T = unknown>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T | null> {
  if (!discordEnv.token) return null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bot ${discordEnv.token}`,
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
      })
      if (res.status === 429 && attempt === 0) {
        const retry = Number((await res.json().catch(() => ({})) as { retry_after?: number }).retry_after ?? 1)
        await new Promise((r) => setTimeout(r, Math.min(retry, 5) * 1000))
        continue
      }
      if (!res.ok) {
        console.error(`[discord] ${method} ${path} → ${res.status}`, await res.text().catch(() => ''))
        return null
      }
      return res.status === 204 ? ({} as T) : ((await res.json()) as T)
    } catch (err) {
      console.error(`[discord] ${method} ${path} failed:`, err instanceof Error ? err.message : err)
      return null
    }
  }
  return null
}

export async function sendDM(discordUserId: string, payload: MessagePayload) {
  const channel = await discord<{ id: string }>('POST', '/users/@me/channels', { recipient_id: discordUserId })
  if (!channel) return null
  return discord<{ id: string }>('POST', `/channels/${channel.id}/messages`, { allowed_mentions: { parse: [] }, ...payload })
}

export function postToChannel(channelId: string | undefined, payload: MessagePayload) {
  if (!channelId) return Promise.resolve(null)
  return discord<{ id: string }>('POST', `/channels/${channelId}/messages`, { allowed_mentions: { parse: [] }, ...payload })
}

export function editChannelMessage(channelId: string, messageId: string, payload: MessagePayload) {
  return discord<{ id: string }>('PATCH', `/channels/${channelId}/messages/${messageId}`, { allowed_mentions: { parse: [] }, ...payload })
}

export function deleteChannelMessage(channelId: string, messageId: string) {
  return discord('DELETE', `/channels/${channelId}/messages/${messageId}`)
}

export function setMemberRole(discordUserId: string, roleId: string | undefined, on: boolean) {
  if (!roleId || !discordEnv.guildId) return Promise.resolve(null)
  return discord(on ? 'PUT' : 'DELETE', `/guilds/${discordEnv.guildId}/members/${discordUserId}/roles/${roleId}`, undefined, {
    'X-Audit-Log-Reason': 'PRISM website sync',
  })
}

// Adds a user to the server using the OAuth token from their Discord sign-in
// (needs the guilds.join scope). Does nothing if they're already a member.
export function addGuildMember(discordUserId: string, accessToken: string) {
  if (!discordEnv.guildId) return Promise.resolve(null)
  return discord('PUT', `/guilds/${discordEnv.guildId}/members/${discordUserId}`, { access_token: accessToken })
}

type ScheduledEvent = { name: string; description?: string; start: string; end: string; location: string }

export async function upsertScheduledEvent(eventId: string | null, e: ScheduledEvent) {
  if (!discordEnv.guildId) return null
  const body = {
    name: clip(e.name, 100),
    description: e.description ? clip(e.description, 1000) : undefined,
    scheduled_start_time: e.start,
    scheduled_end_time: e.end,
    entity_metadata: { location: clip(e.location, 100) },
  }
  if (eventId) {
    const updated = await discord<{ id: string }>('PATCH', `/guilds/${discordEnv.guildId}/scheduled-events/${eventId}`, body)
    if (updated) return updated
  }
  return discord<{ id: string }>('POST', `/guilds/${discordEnv.guildId}/scheduled-events`, {
    ...body,
    entity_type: 3, // external
    privacy_level: 2, // guild only
  })
}

export function deleteScheduledEvent(eventId: string) {
  if (!discordEnv.guildId) return Promise.resolve(null)
  return discord('DELETE', `/guilds/${discordEnv.guildId}/scheduled-events/${eventId}`)
}

// 'US' → 🇺🇸 (Discord renders flag emoji everywhere).
export function flagEmoji(countryCode: string | null) {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return ''
  return String.fromCodePoint(...[...countryCode].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export const timestamp = (iso: string, style: 'F' | 'R' | 'f' = 'F') => `<t:${Math.floor(Date.parse(iso) / 1000)}:${style}>`

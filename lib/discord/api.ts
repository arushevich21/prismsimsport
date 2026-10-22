import 'server-only'

// Minimal Discord REST client for the PRISM bot. No gateway connection: the
// site calls Discord when something happens, and Discord calls
// /api/discord/interactions when someone clicks a button. Runs on Vercel.

const API = 'https://discord.com/api/v10'

export const discordEnv = {
  token: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  roles: {
    academy: process.env.DISCORD_ROLE_ACADEMY, // every academy student
    academyLmu: process.env.DISCORD_ROLE_ACADEMY_LMU, // races for PRISM in LMU
    academyAcc: process.env.DISCORD_ROLE_ACADEMY_ACC, // races with Falcon in ACC
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
  // Category the bot creates a private ticket channel in for each applicant.
  applicationsCategory: process.env.DISCORD_CATEGORY_APPLICATIONS,
}

export const botEnabled = () => !!discordEnv.token

export type Embed = {
  title?: string
  description?: string
  url?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  image?: { url: string }
  timestamp?: string
}

export type Button =
  | { type: 2; style: 1 | 2 | 3 | 4; label: string; custom_id: string } // primary, secondary, success, danger
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

// Why the most recent Discord call failed, in plain words for the admin
// editors (Discord's own error codes: discord.com/developers/docs/topics/opcodes-and-status-codes).
let lastError: string | null = null
export function takeDiscordError() {
  const e = lastError
  lastError = null
  return e
}
function explain(status: number, code: number | undefined) {
  if (status === 401) return 'the bot token is wrong or was reset'
  if (code === 10003) return "that channel ID doesn't match a channel in the server (copy the channel's ID, not the category's)"
  if (code === 50001) return "the bot can't see that channel. It's private: add the PRISM bot role to its permissions"
  if (code === 50013) return 'the bot can see the channel but lacks permission there (it needs Send Messages, Embed Links and Attach Files)'
  if (status === 404) return 'Discord says that channel or server does not exist'
  return `Discord answered ${status}${code ? ` (code ${code})` : ''}`
}

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
        const text = await res.text().catch(() => '')
        console.error(`[discord] ${method} ${path} → ${res.status}`, text)
        let code: number | undefined
        try {
          code = (JSON.parse(text) as { code?: number }).code
        } catch {}
        lastError = explain(res.status, code)
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

// ── Channels ────────────────────────────────────────────────────────────────

export const PERMS = {
  view: 1n << 10n,
  send: 1n << 11n,
  embed: 1n << 14n,
  attach: 1n << 15n,
  history: 1n << 16n,
}
const bits = (...p: bigint[]) => p.reduce((a, b) => a | b, 0n).toString()

// Text and announcement channels, for the race editor's channel picker.
export async function listTextChannels() {
  if (!discordEnv.guildId) return []
  const channels = await discord<{ id: string; name: string; type: number; position: number; parent_id: string | null }[]>('GET', `/guilds/${discordEnv.guildId}/channels`)
  return (channels ?? []).filter((c) => c.type === 0 || c.type === 5).sort((a, b) => a.position - b.position).map((c) => ({ id: c.id, name: c.name }))
}

let botUserId: string | null = null
async function botId() {
  botUserId ??= (await discord<{ id: string }>('GET', '/users/@me'))?.id ?? null
  return botUserId
}

// A private channel: hidden from @everyone, visible to the bot, the given
// members (who can talk) and the given roles (staff).
export async function createPrivateChannel(name: string, opts: { parentId?: string; members: string[]; roles: string[]; topic?: string }) {
  if (!discordEnv.guildId) return null
  const me = await botId()
  const talk = bits(PERMS.view, PERMS.send, PERMS.embed, PERMS.attach, PERMS.history)
  const overwrites = [
    { id: discordEnv.guildId, type: 0, deny: bits(PERMS.view), allow: '0' },
    ...(me ? [{ id: me, type: 1, allow: talk, deny: '0' }] : []),
    ...opts.roles.map((id) => ({ id, type: 0, allow: talk, deny: '0' })),
    ...opts.members.map((id) => ({ id, type: 1, allow: talk, deny: '0' })),
  ]
  const body = { name: clip(name, 100), type: 0, parent_id: opts.parentId, topic: opts.topic ? clip(opts.topic, 1024) : undefined }
  // An overwrite for someone who isn't in the server fails the whole request,
  // so retry without the members (staff can add them once they join).
  return (
    (await discord<{ id: string }>('POST', `/guilds/${discordEnv.guildId}/channels`, { ...body, permission_overwrites: overwrites })) ??
    (opts.members.length
      ? await discord<{ id: string }>('POST', `/guilds/${discordEnv.guildId}/channels`, { ...body, permission_overwrites: overwrites.filter((o) => !opts.members.includes(o.id)) })
      : null)
  )
}

// Lets a member read a channel but no longer post in it.
export function makeReadOnlyFor(channelId: string, memberId: string) {
  return discord('PUT', `/channels/${channelId}/permissions/${memberId}`, {
    type: 1,
    allow: bits(PERMS.view, PERMS.history),
    deny: bits(PERMS.send),
  })
}

// "Jane Doe!" → "jane-doe", for channel names.
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'applicant'

// 'US' → 🇺🇸 (Discord renders flag emoji everywhere).
export function flagEmoji(countryCode: string | null) {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return ''
  return String.fromCodePoint(...[...countryCode].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export const timestamp = (iso: string, style: 'F' | 'R' | 'f' = 'F') => `<t:${Math.floor(Date.parse(iso) / 1000)}:${style}>`

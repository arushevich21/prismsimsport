// Minimal Twitch chat (IRC over WebSocket) parsing for the stream overlays.
// Reading chat needs no account: Twitch accepts anonymous "justinfan" logins.

export const TWITCH_IRC_URL = 'wss://irc-ws.chat.twitch.tv:443'

export type IrcLine = {
  tags: Record<string, string>
  nick: string | null
  command: string
  params: string[]
  trailing: string | null
}

export type ChatPart = { kind: 'text'; text: string } | { kind: 'emote'; id: string; name: string }

export type ChatMessage = {
  id: string
  userId: string
  name: string
  badge: 'MOD' | 'VIP' | 'SUB' | null
  action: boolean
  parts: ChatPart[]
}

const unescapeTag = (v: string) =>
  v.replace(/\\(.)/g, (_, c: string) => ({ s: ' ', ':': ';', '\\': '\\', r: '\r', n: '\n' })[c] ?? c)

// "@tags :nick!nick@host COMMAND #channel :trailing"
export function parseIrcLine(raw: string): IrcLine | null {
  let rest = raw
  const tags: Record<string, string> = {}
  if (rest.startsWith('@')) {
    const end = rest.indexOf(' ')
    if (end < 0) return null
    for (const pair of rest.slice(1, end).split(';')) {
      const eq = pair.indexOf('=')
      if (eq < 0) tags[pair] = ''
      else tags[pair.slice(0, eq)] = unescapeTag(pair.slice(eq + 1))
    }
    rest = rest.slice(end + 1)
  }

  let nick: string | null = null
  if (rest.startsWith(':')) {
    const end = rest.indexOf(' ')
    if (end < 0) return null
    nick = rest.slice(1, end).split('!')[0]
    rest = rest.slice(end + 1)
  }

  let trailing: string | null = null
  const colon = rest.indexOf(' :')
  if (colon >= 0) {
    trailing = rest.slice(colon + 2)
    rest = rest.slice(0, colon)
  }
  const [command, ...params] = rest.split(' ').filter(Boolean)
  if (!command) return null
  return { tags, nick, command, params, trailing }
}

function pickBadge(badges: string | undefined): ChatMessage['badge'] {
  const set = new Set((badges ?? '').split(',').map((b) => b.split('/')[0]))
  if (set.has('moderator')) return 'MOD'
  if (set.has('vip')) return 'VIP'
  if (set.has('subscriber') || set.has('founder')) return 'SUB'
  return null
}

// The emotes tag gives code-point ranges, e.g. "25:0-4,12-16/1902:6-10".
export function splitEmotes(text: string, emotesTag: string | undefined): ChatPart[] {
  const chars = Array.from(text)
  const ranges: { start: number; end: number; id: string }[] = []
  for (const group of (emotesTag ?? '').split('/').filter(Boolean)) {
    const [id, spots] = group.split(':')
    for (const spot of (spots ?? '').split(',')) {
      const [start, end] = spot.split('-').map(Number)
      if (Number.isInteger(start) && Number.isInteger(end)) ranges.push({ start, end, id })
    }
  }
  ranges.sort((a, b) => a.start - b.start)

  const parts: ChatPart[] = []
  let at = 0
  for (const r of ranges) {
    if (r.start < at || r.end >= chars.length) continue
    if (r.start > at) parts.push({ kind: 'text', text: chars.slice(at, r.start).join('') })
    parts.push({ kind: 'emote', id: r.id, name: chars.slice(r.start, r.end + 1).join('') })
    at = r.end + 1
  }
  if (at < chars.length) parts.push({ kind: 'text', text: chars.slice(at).join('') })
  return parts
}

export function toChatMessage(line: IrcLine): ChatMessage | null {
  if (line.command !== 'PRIVMSG' || line.trailing === null) return null
  let text = line.trailing
  // "/me" messages arrive wrapped as \u0001ACTION ...\u0001
  const action = text.startsWith('\u0001ACTION ') && text.endsWith('\u0001')
  if (action) text = text.slice(8, -1)
  return {
    id: line.tags['id'] || crypto.randomUUID(),
    userId: line.tags['user-id'] ?? '',
    name: line.tags['display-name'] || line.nick || 'unknown',
    badge: pickBadge(line.tags['badges']),
    action,
    parts: splitEmotes(text, line.tags['emotes']),
  }
}

export const emoteUrl = (id: string) => `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`

// Twitch logins are 4-25 letters, digits or underscores.
export function normaliseChannel(input: string | undefined): string | null {
  const c = (input ?? '').trim().toLowerCase().replace(/^#/, '')
  return /^[a-z0-9_]{1,25}$/.test(c) ? c : null
}

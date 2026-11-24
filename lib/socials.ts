// Driver social accounts: which platforms, how to read what people paste
// (a full link, an @handle or just the name), and the link to each profile.
// Only the handle is stored; YouTube keeps "@name" or "channel/UC…".

export const SOCIALS = ['instagram', 'twitch', 'youtube', 'tiktok', 'x'] as const
export type Social = (typeof SOCIALS)[number]

export const SOCIAL_LABEL: Record<Social, string> = {
  instagram: 'Instagram',
  twitch: 'Twitch',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
}

// The database column for each platform, on public.drivers.
export const SOCIAL_COLUMN = {
  instagram: 'social_instagram',
  twitch: 'social_twitch',
  youtube: 'social_youtube',
  tiktok: 'social_tiktok',
  x: 'social_x',
} as const satisfies Record<Social, string>

export type SocialHandles = { [K in (typeof SOCIAL_COLUMN)[Social]]: string | null }

const HOSTS: Record<Social, RegExp> = {
  instagram: /^(?:www\.)?instagram\.com$/,
  twitch: /^(?:www\.|m\.)?twitch\.tv$/,
  youtube: /^(?:www\.|m\.)?youtube\.com$/,
  tiktok: /^(?:www\.)?tiktok\.com$/,
  x: /^(?:www\.)?(?:x|twitter)\.com$/,
}

const VALID: Record<Social, RegExp> = {
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  twitch: /^[A-Za-z0-9_]{2,25}$/,
  youtube: /^(?:@[A-Za-z0-9._-]{3,30}|channel\/UC[A-Za-z0-9_-]{22})$/,
  tiktok: /^[A-Za-z0-9._]{2,24}$/,
  x: /^[A-Za-z0-9_]{1,15}$/,
}

// What someone typed, as a stored handle. '' clears it; null means it isn't
// a handle or a link to that platform.
export function parseHandle(platform: Social, input: string): string | null {
  let value = input.trim()
  if (!value) return ''
  if (/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}\//i.test(value) || /^(https?:\/\/)/i.test(value)) {
    let url: URL
    try {
      url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    } catch {
      return null
    }
    if (!HOSTS[platform].test(url.hostname.toLowerCase())) return null
    const parts = url.pathname.split('/').filter(Boolean)
    if (platform === 'youtube') {
      value = parts[0] === 'channel' && parts[1] ? `channel/${parts[1]}` : (parts[0] ?? '')
    } else {
      value = parts[0] ?? ''
    }
  }
  if (platform === 'youtube') {
    if (!value.startsWith('@') && !value.startsWith('channel/')) value = `@${value}`
  } else {
    value = value.replace(/^@/, '')
  }
  return VALID[platform].test(value) ? value : null
}

export function socialUrl(platform: Social, handle: string): string {
  switch (platform) {
    case 'instagram': return `https://www.instagram.com/${handle}/`
    case 'twitch': return `https://www.twitch.tv/${handle}`
    case 'youtube': return `https://www.youtube.com/${handle}`
    case 'tiktok': return `https://www.tiktok.com/@${handle}`
    case 'x': return `https://x.com/${handle}`
  }
}

// A driver's accounts that are set, in display order.
export function driverSocials(d: Partial<SocialHandles>): { platform: Social; url: string }[] {
  return SOCIALS.flatMap((platform) => {
    const handle = d[SOCIAL_COLUMN[platform]]
    return handle ? [{ platform, url: socialUrl(platform, handle) }] : []
  })
}

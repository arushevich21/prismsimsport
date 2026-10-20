// Site-wide links and settings. Values that change per deployment come from
// environment variables so they can be updated in Vercel without a code change.

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://prismsimsport.app'

// Times on generated graphics (which can't know the viewer's timezone).
export const TEAM_TIMEZONE = process.env.TEAM_TIMEZONE || 'America/New_York'

export const DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || null

export const NAV_LINKS = [
  { href: '/team', label: 'Team' },
  { href: '/team#results', label: 'Results' },
  { href: '/community', label: 'Community' },
  { href: '/academy', label: 'Academy' },
] as const

export const PARTNERS = {
  falcon: { name: 'Falcon Motorsport', url: 'https://www.thesimgrid.com/teams/18463-falcon-motorsports' },
  cube: { name: 'Cube Controls', url: 'https://www.cubecontrols.com' },
} as const

export type Sponsor = {
  name: string
  url: string | null
  // White/light logo for dark backgrounds. Null shows the name as text until a logo is added.
  logo: { src: string; width: number; height: number } | null
}

export const TITLE_SPONSOR = {
  name: 'TRACKSIDE Hospitality',
  url: 'https://trackside.vip',
  logo: { src: '/brand/trackside-white.png', width: 1600, height: 281 },
  blurb: 'Curated race-weekend packages bundling travel, hospitality and exclusive motorsport access.',
} as const

export const SUPPORTERS: Sponsor[] = [
  { name: 'Cube Controls', url: PARTNERS.cube.url, logo: { src: '/brand/cube-controls-white.png', width: 1137, height: 290 } },
  { name: 'Sacred Coffee', url: null, logo: { src: '/brand/sacred-coffee.png', width: 512, height: 149 } },
  { name: 'Falcon Motorsport', url: PARTNERS.falcon.url, logo: { src: '/brand/falcon-logo.png', width: 1200, height: 848 } },
  { name: 'Breast cancer awareness', url: null, logo: { src: '/brand/pink-ribbon.svg', width: 100, height: 124 } },
]

// Class colour chips. Light fills with dark text, so they pass contrast.
const CLASS_CHIP: Record<string, string> = {
  hypercar: 'bg-ice',
  lmp2: 'bg-iris',
  lmp3: 'bg-iris',
  lmgt3: 'bg-ember',
  gt3: 'bg-ember',
  gt4: 'bg-iris',
}

export function classChip(cls: string | null | undefined) {
  return CLASS_CHIP[(cls ?? '').toLowerCase().replace(/\s+/g, '')] ?? 'bg-line'
}

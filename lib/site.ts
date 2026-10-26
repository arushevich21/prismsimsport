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
  blurb?: string
}

export const TITLE_SPONSOR = {
  name: 'TRACKSIDE Hospitality',
  url: 'https://trackside.vip',
  logo: { src: '/brand/trackside-white.png', width: 1600, height: 281 },
  blurb: 'Curated race-weekend packages bundling travel, hospitality and exclusive motorsport access.',
} as const

// Car sponsors (Sacred Coffee, Falcon Motorsport, the pink ribbon) appear on
// the liveries, not here.
export const SUPPORTERS: Sponsor[] = [
  {
    name: 'Cube Controls',
    url: PARTNERS.cube.url,
    logo: { src: '/brand/cube-controls-white.png', width: 1137, height: 290 },
    blurb: 'Redefining the sim racing experience, offering high-quality products for the most demanding virtual drivers.',
  },
]

// Class colours: Hypercar red, LMP2 orange, LMP3 purple, GT3 green. Light
// fills with dark text, so they pass contrast. The graphics use CLASS_HEX;
// keep the two in step (Tailwind needs the literal class names).
export const CLASS_HEX: Record<string, string> = {
  hypercar: '#ff9e98',
  lmp2: '#ffb678',
  lmp3: '#c9a8f7',
  lmgt3: '#95dba5',
  gt3: '#95dba5',
}
const CLASS_CHIP: Record<string, string> = {
  hypercar: 'bg-[#ff9e98]',
  lmp2: 'bg-[#ffb678]',
  lmp3: 'bg-[#c9a8f7]',
  lmgt3: 'bg-[#95dba5]',
  gt3: 'bg-[#95dba5]',
}

export function classChip(cls: string | null | undefined) {
  return CLASS_CHIP[(cls ?? '').toLowerCase().replace(/\s+/g, '')] ?? 'bg-line'
}

// Site-wide links and settings. Values that change per deployment come from
// environment variables so they can be updated in Vercel without a code change.

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

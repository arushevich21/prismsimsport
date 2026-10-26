import { carMake } from '@/lib/cars'
import { CLASS_HEX, TITLE_SPONSOR } from '@/lib/site'

// Pieces shared by the graphics the bot posts to Discord (lineups, results):
// PRISM colours, fonts and the common header/footer. Rendered with next/og;
// `origin` is the site itself, where fonts and logos are fetched from.

export const C = {
  ground: '#15171c',
  card: '#1e2128',
  line: '#2e333c',
  white: '#ffffff',
  muted: '#a3a9b3',
  ink: '#14161b',
  ice: '#9cc4f2',
  iris: '#a5a8f7',
  ember: '#ffb678',
}

const FONTS = [
  { name: 'Unbounded', file: 'unbounded-latin-700-normal.woff', weight: 700 },
  { name: 'Unbounded', file: 'unbounded-latin-800-normal.woff', weight: 800 },
  { name: 'Archivo', file: 'archivo-latin-600-normal.woff', weight: 600 },
  { name: 'Archivo', file: 'archivo-latin-700-normal.woff', weight: 700 },
  { name: 'JetBrains Mono', file: 'jetbrains-mono-latin-400-normal.woff', weight: 400 },
  { name: 'JetBrains Mono', file: 'jetbrains-mono-latin-600-normal.woff', weight: 600 },
] as const

let fontCache: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 600 | 700 | 800; style: 'normal' }[]> | null = null
export function loadFonts(origin: string) {
  fontCache ??= Promise.all(
    FONTS.map(async (f) => ({
      name: f.name,
      weight: f.weight,
      style: 'normal' as const,
      data: await fetch(`${origin}/og-fonts/${f.file}`).then((r) => {
        if (!r.ok) throw new Error(`font ${f.file}: ${r.status}`)
        return r.arrayBuffer()
      }),
    }))
  ).catch((e) => {
    fontCache = null
    throw e
  })
  return fontCache
}

export const classColor = (cls: string) => CLASS_HEX[cls.toLowerCase().replace(/\s+/g, '')] ?? '#e4e7ec'

export function ClassChip({ cls, size = 20 }: { cls: string; size?: number }) {
  return (
    <span style={{ background: classColor(cls), color: C.ink, borderRadius: 6, padding: '6px 12px', fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: size, letterSpacing: 2 }}>
      {cls.toUpperCase()}
    </span>
  )
}

// A maker's logo at a fixed height, with wide wordmarks capped in width.
export function CarMark({ car, origin, height = 48, maxWidth = 140 }: { car: string | null; origin: string; height?: number; maxWidth?: number }) {
  const logo = carMake(car)?.logo
  if (!logo) return null
  const w = Math.min(maxWidth, Math.round((height * logo.width) / logo.height))
  const h = Math.round((w * logo.height) / logo.width)
  // eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser
  return <img src={`${origin}${logo.src}`} alt="" width={w} height={h} />
}

export function SponsorFooter({ origin }: { origin: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 18, letterSpacing: 4, color: C.muted }}>SPONSORED BY</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
      <img src={`${origin}${TITLE_SPONSOR.logo.src}`} alt="" height={44} width={Math.round((44 * TITLE_SPONSOR.logo.width) / TITLE_SPONSOR.logo.height)} />
    </div>
  )
}

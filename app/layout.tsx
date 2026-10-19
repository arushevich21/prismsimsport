import type { Metadata, Viewport } from 'next'
import { Archivo, Bebas_Neue, DM_Sans, JetBrains_Mono, Unbounded } from 'next/font/google'
import './globals.css'

// PRISM fonts
const unbounded = Unbounded({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-unbounded' })
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-jetbrains' })

// Legacy DTS fonts, still used by pages that haven't been rebuilt yet.
const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-display' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  metadataBase: new URL('https://prismsimsport.app'),
  title: { default: 'PRISM', template: '%s · PRISM' },
  description: 'Sim racing community and eSports team. Le Mans Ultimate, and ACC with Falcon Motorsport.',
  openGraph: { siteName: 'PRISM', type: 'website' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#15171C',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [unbounded, archivo, jetbrains, bebasNeue, dmSans].map((f) => f.variable).join(' ')
  return (
    <html lang="en" className={fonts}>
      <body>{children}</body>
    </html>
  )
}

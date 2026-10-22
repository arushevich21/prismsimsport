import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: false } }

// Stream overlays, loaded as OBS browser sources. The page itself must be
// transparent so the game and webcam show through.
export default function OverlaysLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{'html, body { background: transparent; overflow: hidden; }'}</style>
      {children}
    </>
  )
}

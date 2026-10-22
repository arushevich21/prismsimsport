import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = { title: 'Webcam overlay' }

// OBS browser source: /overlays/webcam?name=<driver>, sized 560 × 430.
// The 16:9 window is see-through: put the camera source underneath it.
export default async function WebcamOverlayPage({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const name = (await searchParams).name?.trim().slice(0, 40) || 'Anton Rushevich'
  return (
    <div className="w-screen text-white">
      <div className="border-[3px] border-white">
        <div className="relative aspect-video">
          <span className="absolute top-3.5 right-4 flex items-center gap-2 font-mono text-base font-semibold tracking-[.12em] [text-shadow:0_1px_3px_rgb(0_0_0/.6)] before:size-2.5 before:rounded-full before:bg-[#ff5a4f] before:content-['']">
            LIVE
          </span>
        </div>
      </div>
      <div className="flex">
        <div className="grid place-items-center bg-white px-3.5 py-2.5">
          <Image src="/brand/prism-mark-light.png" alt="PRISM" width={40} height={40} className="brightness-35 saturate-200" priority />
        </div>
        <div className="flex flex-1 items-center bg-graphite px-5 py-2.5">
          <b className="font-heading text-[26px] font-bold tracking-[.04em] uppercase">{name}</b>
        </div>
      </div>
      <div className="flex items-center justify-center gap-7 border-t border-graphite-3 bg-ink px-5 py-3">
        <Image src="/brand/cube-controls-white.png" alt="Cube Controls" width={1137} height={290} className="h-8 w-auto" priority />
        <i className="h-[30px] w-px bg-graphite-3" />
        <Image src="/brand/trackside-white.png" alt="Trackside" width={1600} height={281} className="h-[26px] w-auto" priority />
      </div>
    </div>
  )
}

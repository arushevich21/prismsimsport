import type { Metadata } from 'next'
import { TwitchChat } from '@/components/overlays/TwitchChat'
import { normaliseChannel } from '@/lib/overlays/twitch'

export const metadata: Metadata = { title: 'Chat overlay' }

const DEFAULT_FADE_SECONDS = 60

// OBS browser source: /overlays/chat?channel=<twitch name>, sized 560 × 400.
// Messages fade out after 60 seconds; ?fade=<seconds> changes that, ?fade=0 keeps them.
export default async function ChatOverlayPage({ searchParams }: { searchParams: Promise<{ channel?: string; fade?: string }> }) {
  const params = await searchParams
  const channel = normaliseChannel(params.channel)
  if (!channel) {
    return (
      <p className="bg-graphite p-6 font-mono text-lg text-white">
        Add your Twitch name to the address: /overlays/chat?channel=yourname
      </p>
    )
  }
  const fade = Number(params.fade)
  const fadeSeconds = params.fade !== undefined && Number.isFinite(fade) && fade >= 0 ? Math.min(fade, 3600) : DEFAULT_FADE_SECONDS
  return <TwitchChat channel={channel} fadeSeconds={fadeSeconds} />
}

import type { Metadata } from 'next'
import { TwitchChat } from '@/components/overlays/TwitchChat'
import { normaliseChannel } from '@/lib/overlays/twitch'

export const metadata: Metadata = { title: 'Chat overlay' }

// OBS browser source: /overlays/chat?channel=<twitch name>, sized 560 × 400.
export default async function ChatOverlayPage({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  const channel = normaliseChannel((await searchParams).channel)
  if (!channel) {
    return (
      <p className="bg-graphite p-6 font-mono text-lg text-white">
        Add your Twitch name to the address: /overlays/chat?channel=yourname
      </p>
    )
  }
  return <TwitchChat channel={channel} />
}

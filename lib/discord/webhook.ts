import 'server-only'

// Ice blue from the PRISM palette (#9CC4F2) as a Discord embed colour.
const EMBED_COLOR = 0x9cc4f2

type EmbedField = { name: string; value: string; inline?: boolean }

// Discord rejects field values over 1024 characters.
const clip = (s: string, max = 1024) => (s.length > max ? s.slice(0, max - 1) + '…' : s)

// Posts an embed to a Discord webhook. Never throws: a failed notification
// should not fail the request that triggered it. Returns whether it was delivered.
export async function postDiscordEmbed(
  webhookUrl: string | undefined,
  embed: { title: string; fields: EmbedField[] },
  threadId?: string | null
): Promise<boolean> {
  if (!webhookUrl) return true

  const url = threadId ? `${webhookUrl}?thread_id=${encodeURIComponent(threadId)}` : webhookUrl
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [{
          title: embed.title,
          color: EMBED_COLOR,
          fields: embed.fields.map((f) => ({ ...f, value: clip(f.value) })),
          timestamp: new Date().toISOString(),
          footer: { text: 'PRISM' },
        }],
      }),
    })
    if (!res.ok) console.error('[discord] webhook failed:', res.status)
    return res.ok
  } catch (err) {
    console.error('[discord] webhook error:', err instanceof Error ? err.message : err)
    return false
  }
}

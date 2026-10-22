'use client'

import { useEffect, useState } from 'react'
import { TWITCH_IRC_URL, emoteUrl, parseIrcLine, toChatMessage, type ChatMessage } from '@/lib/overlays/twitch'

const MAX_MESSAGES = 40
const FADE_OUT_MS = 1000
const NAME_COLORS = ['text-ice', 'text-iris', 'text-ember']

// Same viewer, same colour, every time.
function nameColor(name: string) {
  let h = 0
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) | 0
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length]
}

type ShownMessage = ChatMessage & { at: number }

// Live chat for an OBS browser source. Connects anonymously, reconnects on
// its own, and drops messages that mods delete or users who get timed out.
// With fadeSeconds > 0, each message fades out that long after it arrives.
export function TwitchChat({ channel, fadeSeconds }: { channel: string; fadeSeconds: number }) {
  const [messages, setMessages] = useState<ShownMessage[]>([])
  const [now, setNow] = useState(0)
  const fadeMs = fadeSeconds * 1000

  useEffect(() => {
    if (fadeMs <= 0) return
    const tick = setInterval(() => {
      const t = Date.now()
      setNow(t)
      setMessages((ms) => {
        const kept = ms.filter((m) => t - m.at < fadeMs)
        return kept.length === ms.length ? ms : kept
      })
    }, 500)
    return () => clearInterval(tick)
  }, [fadeMs])

  useEffect(() => {
    let ws: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let delay = 1000
    let stopped = false

    function connect() {
      const socket = new WebSocket(TWITCH_IRC_URL)
      ws = socket
      socket.onopen = () => {
        delay = 1000
        socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands')
        socket.send(`NICK justinfan${Math.floor(10000 + Math.random() * 80000)}`)
        socket.send(`JOIN #${channel}`)
      }
      socket.onmessage = (event) => {
        for (const raw of String(event.data).split('\r\n')) {
          const line = raw && parseIrcLine(raw)
          if (!line) continue
          switch (line.command) {
            case 'PING':
              socket.send(`PONG :${line.trailing ?? 'tmi.twitch.tv'}`)
              break
            case 'PRIVMSG': {
              const m = toChatMessage(line)
              if (m) setMessages((ms) => [...ms, { ...m, at: Date.now() }].slice(-MAX_MESSAGES))
              break
            }
            case 'CLEARMSG':
              setMessages((ms) => ms.filter((m) => m.id !== line.tags['target-msg-id']))
              break
            case 'CLEARCHAT': {
              const target = line.tags['target-user-id']
              setMessages((ms) => (target ? ms.filter((m) => m.userId !== target) : []))
              break
            }
            case 'RECONNECT':
              socket.close()
              break
          }
        }
      }
      socket.onclose = () => {
        if (stopped) return
        retry = setTimeout(connect, delay)
        delay = Math.min(delay * 2, 30000)
      }
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(retry)
      ws?.close()
    }
  }, [channel])

  return (
    <div className="flex h-dvh w-screen flex-col bg-graphite text-white">
      <header className="border-b border-graphite-3 px-[22px] py-3.5">
        <b className="font-heading text-2xl tracking-[.04em]">CHAT</b>
      </header>
      {/* min-h-0 keeps the list inside the box, so the newest messages stay in view at the bottom. */}
      <ol className="flex min-h-0 flex-1 flex-col justify-end gap-3.5 overflow-hidden px-[22px] pt-3.5 pb-[18px]">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`shrink-0 text-[26px] leading-[1.3] break-words text-[#e9ecf1] transition-[opacity,translate] duration-400 ease-out starting:translate-y-3.5 starting:opacity-0 motion-reduce:transition-none ${
              fadeMs > 0 && now - m.at > fadeMs - FADE_OUT_MS ? 'opacity-0' : ''
            }`}
          >
            {m.badge && (
              <span className="mr-2 inline-block bg-iris px-[7px] py-0.5 align-[4px] font-mono text-base font-semibold tracking-widest text-graphite">
                {m.badge}
              </span>
            )}
            <b className={`mr-2 font-bold ${nameColor(m.name)}`}>{m.name}</b>
            <span className={m.action ? 'italic' : undefined}>
              {m.parts.map((p, i) =>
                p.kind === 'text' ? (
                  p.text
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- Twitch emote from Twitch's CDN
                  <img key={i} src={emoteUrl(p.id)} alt={p.name} className="mx-0.5 inline-block h-[1.4em] w-auto align-middle" />
                )
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { TWITCH_IRC_URL, emoteUrl, parseIrcLine, toChatMessage, type ChatMessage } from '@/lib/overlays/twitch'

const MAX_MESSAGES = 40
const NAME_COLORS = ['text-ice', 'text-iris', 'text-ember']

// Same viewer, same colour, every time.
function nameColor(name: string) {
  let h = 0
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) | 0
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length]
}

// Live chat for an OBS browser source. Connects anonymously, reconnects on
// its own, and drops messages that mods delete or users who get timed out.
export function TwitchChat({ channel }: { channel: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])

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
              if (m) setMessages((ms) => [...ms, m].slice(-MAX_MESSAGES))
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
        <b className="font-heading text-xl tracking-[.04em]">CHAT</b>
      </header>
      <ol className="flex flex-1 flex-col justify-end gap-3 overflow-hidden px-[22px] pt-3.5 pb-[18px]">
        {messages.map((m) => (
          <li
            key={m.id}
            className="text-[20px] leading-[1.35] break-words text-[#e9ecf1] transition-[opacity,translate] duration-400 ease-out starting:translate-y-3.5 starting:opacity-0 motion-reduce:transition-none"
          >
            {m.badge && (
              <span className="mr-2 inline-block bg-iris px-[7px] py-0.5 align-[3px] font-mono text-[13px] font-semibold tracking-widest text-graphite">
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

'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { markThreadRead, sendMessage } from '@/lib/academy/actions'
import type { Message } from '@/lib/academy/queries'
import { createClient } from '@/lib/supabase/client'

type Props = {
  studentId: string
  meId: string
  initial: Message[]
  names: Record<string, string>
  placeholder?: string
  footnote?: string
  heightClass?: string
}

// Live chat between a student and their coach. New messages arrive over
// Supabase Realtime (which applies the same RLS as everything else).
export function ChatThread({ studentId, meId, initial, names, placeholder, footnote, heightClass = 'h-[60dvh] max-h-[640px] min-h-[320px]' }: Props) {
  const [messages, setMessages] = useState<Message[]>(initial)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    void markThreadRead(studentId)
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${studentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `student_id=eq.${studentId}` },
        (payload) => {
          const m = payload.new as Message
          setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]))
          if (m.sender_id !== meId) void markThreadRead(studentId)
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [studentId, meId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  function send() {
    const text = draft.trim()
    if (!text) return
    setError(null)
    startTransition(async () => {
      const res = await sendMessage(studentId, text)
      if (!res.ok) return setError(res.error)
      setDraft('')
      setMessages((ms) =>
        ms.some((x) => x.id === res.id)
          ? ms
          : [...ms, { id: res.id, student_id: studentId, sender_id: meId, body: text, source: 'site', read_at: null, created_at: new Date().toISOString() }]
      )
    })
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
      <ol aria-label="Messages" ref={listRef} className={`flex flex-col gap-3 overflow-y-auto bg-[#fafbfc] p-4 sm:p-6 ${heightClass}`}>
        {messages.length === 0 && <li className="m-auto text-sm text-muted">No messages yet. Say hi.</li>}
        {messages.map((m) => {
          const mine = m.sender_id === meId
          return (
            <li key={m.id} className={`flex max-w-[85%] flex-col gap-1 ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
              <div className={`rounded-2xl px-3.5 py-2.5 text-[15px] leading-normal break-words whitespace-pre-wrap ${mine ? 'rounded-br-sm bg-ink text-white' : 'rounded-bl-sm border border-line bg-white'}`}>
                {m.body}
              </div>
              <span className="text-xs text-muted">
                {mine ? 'You' : names[m.sender_id] ?? 'Coach'} ·{' '}
                {new Date(m.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {m.source === 'discord' && ' · via Discord'}
                {mine && m.read_at && ' · seen'}
              </span>
            </li>
          )
        })}
      </ol>
      <form
        className="flex flex-col gap-2 border-t border-line p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <label htmlFor={`msg-${studentId}`} className="sr-only">Message</label>
        <textarea
          id={`msg-${studentId}`}
          rows={2}
          value={draft}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
          placeholder={placeholder ?? 'Write a message…'}
          className="w-full resize-y rounded-lg border border-[#cbd1d9] px-3 py-2.5 focus:border-iris-deep focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-3">
          <span className="min-w-0 flex-1 text-[13px] text-muted">{error ? <span className="text-[#8a1c1c]">{error}</span> : footnote}</span>
          <button type="submit" disabled={pending || !draft.trim()} className="tap rounded-md bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

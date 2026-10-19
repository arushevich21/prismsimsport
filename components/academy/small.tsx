'use client'

import { useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { setTeamReady, setupDownloadUrl, telemetryDownloadUrl } from '@/lib/academy/actions'

// Small interactive pieces used across the Academy and coach pages.

export function SubmitButton({ children, className, pendingText = 'Saving…' }: { children: React.ReactNode; className: string; pendingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingText : children}
    </button>
  )
}

// Asks the server for a short-lived signed link, then starts the download.
export function DownloadButton({ kind, id, className, children }: { kind: 'telemetry' | 'setup'; id: string; className: string; children: React.ReactNode }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        className={`${className} disabled:opacity-60`}
        onClick={() =>
          start(async () => {
            setError(null)
            const res = kind === 'telemetry' ? await telemetryDownloadUrl(id) : await setupDownloadUrl(id)
            if ('error' in res) setError(res.error)
            else window.location.href = res.url
          })
        }
      >
        {pending ? 'Preparing…' : children}
      </button>
      {error && <span className="text-xs text-[#8a1c1c]">{error}</span>}
    </span>
  )
}

export function TeamReadyToggle({ studentId, initial }: { studentId: string; initial: boolean }) {
  const [on, setOn] = useState(initial)
  const [pending, start] = useTransition()
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-5 w-5"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked
          setOn(next)
          start(async () => {
            const res = await setTeamReady(studentId, next)
            if (!res.ok) setOn(!next)
          })
        }}
      />
      Team-ready
    </label>
  )
}

// YouTube thumbnail that only loads the player when clicked: fast pages and
// no YouTube tracking until someone actually watches.
export function YouTubeLite({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false)
  if (playing) {
    return (
      <iframe
        className="aspect-video w-full rounded-lg"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }
  return (
    <button type="button" onClick={() => setPlaying(true)} aria-label={`Play ${title}`} className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-graphite">
      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail */}
      <img src={`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
      <span className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="#14161B"><path d="M8 5v14l11-7z" /></svg>
      </span>
    </button>
  )
}

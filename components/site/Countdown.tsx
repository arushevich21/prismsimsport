'use client'

import { useSyncExternalStore } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

// A one-second clock shared by every countdown on the page. On the server
// (and during hydration) it reads null, so cached HTML never shows a stale time.
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function subscribeClock(onTick: () => void) {
  listeners.add(onTick)
  timer ??= setInterval(() => listeners.forEach((l) => l()), 1000)
  return () => {
    listeners.delete(onTick)
    if (listeners.size === 0) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

const nowInSeconds = () => Math.floor(Date.now() / 1000)
const serverNow = () => null

function parts(secondsLeft: number) {
  const s = Math.max(0, secondsLeft)
  return [
    { label: 'Days', value: pad(Math.floor(s / 86400)) },
    { label: 'Hrs', value: pad(Math.floor(s / 3600) % 24) },
    { label: 'Min', value: pad(Math.floor(s / 60) % 60) },
    { label: 'Sec', value: pad(s % 60) },
  ]
}

// With several timeslots, counts down to the next one that hasn't started.
export function Countdown({ startsAt }: { startsAt: string | string[] }) {
  const now = useSyncExternalStore(subscribeClock, nowInSeconds, serverNow)
  const targets = (Array.isArray(startsAt) ? startsAt : [startsAt]).map((t) => Math.floor(Date.parse(t) / 1000)).sort((a, b) => a - b)
  const target = now === null ? targets[0]! : targets.find((t) => t > now)

  if (now !== null && target === undefined) {
    return <p className="rounded-lg bg-graphite py-4 text-center font-mono text-lg font-semibold text-ember">Racing now</p>
  }

  const cells = now === null ? parts(0).map((p) => ({ ...p, value: '--' })) : parts(target! - now)
  const grid = (
    <div className="grid grid-cols-4 gap-2 sm:gap-2.5" role="timer" aria-label={targets.length > 1 ? 'Time until the next timeslot' : 'Time until green flag'}>
      {cells.map((c) => (
        <div key={c.label} className="rounded-lg bg-graphite px-1 py-3 text-center sm:py-3.5">
          <div className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{c.value}</div>
          <div className="text-[11px] tracking-wider text-muted-dark uppercase sm:text-xs">{c.label}</div>
        </div>
      ))}
    </div>
  )
  // An earlier timeslot is already running.
  if (now === null || targets[0]! > now) return grid
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center font-mono text-sm font-semibold text-ember">Racing now · next timeslot in</p>
      {grid}
    </div>
  )
}

const noSubscribe = () => () => {}

// Shows a time in the visitor's own timezone. The server can't know it, so it
// renders the fallback and the browser fills in the local time.
export function LocalTime({ iso, fallback }: { iso: string; fallback: string }) {
  const text = useSyncExternalStore(
    noSubscribe,
    () =>
      new Date(iso).toLocaleString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      }),
    () => fallback
  )
  return <time dateTime={iso}>{text}</time>
}

'use client'

import { useState, useTransition } from 'react'
import { setMainClasses } from '@/lib/profile/actions'
import { MAIN_CLASSES, MAIN_CLASS_LABEL, MAX_MAIN_CLASSES, type MainClass } from '@/lib/types'

// Saves on every tap. Once two are picked the rest are locked until one is unticked.
export function ClassPicker({ initial }: { initial: MainClass[] }) {
  const [picked, setPicked] = useState(initial)
  const [status, setStatus] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const full = picked.length >= MAX_MAIN_CLASSES

  const toggle = (c: MainClass, on: boolean) => {
    const before = picked
    const next = on ? [...picked, c] : picked.filter((p) => p !== c)
    setPicked(next)
    setStatus(null)
    start(async () => {
      const res = await setMainClasses(next)
      if (res.ok) setStatus('Saved. Your Discord roles will update in a moment.')
      else {
        setPicked(before)
        setStatus(res.error)
      }
    })
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Classes you mainly drive</legend>
      <div className="flex flex-wrap gap-2">
        {MAIN_CLASSES.map((c) => {
          const on = picked.includes(c)
          return (
            <label
              key={c}
              className={`tap flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-[15px] font-medium has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-iris-deep ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}
            >
              <input type="checkbox" className="sr-only" checked={on} disabled={pending || (!on && full)} onChange={(e) => toggle(c, e.target.checked)} />
              {MAIN_CLASS_LABEL[c]}
            </label>
          )
        })}
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {status ?? (full ? `That’s ${MAX_MAIN_CLASSES}. Untick one to swap it.` : `Pick up to ${MAX_MAIN_CLASSES}.`)}
      </p>
    </fieldset>
  )
}

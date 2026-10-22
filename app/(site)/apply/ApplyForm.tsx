'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/academy/small'
import { applyForCoaching } from '@/lib/academy/actions'
import { PROGRAMS, PROGRAM_LABEL } from '@/lib/academy/constants'
import { btn } from '@/lib/ui'

const QUESTIONS = [
  { name: 'improve', label: 'What do you want to improve?', hint: 'Consistency, racecraft, a particular track or corner type…', required: true },
  { name: 'goals', label: 'What are your goals?', hint: 'A championship, a lap time, making a team…', required: true },
  { name: 'experience', label: 'How much sim racing experience do you have?', hint: 'Sims, leagues and how long you’ve been racing.', required: true },
  { name: 'car_series', label: 'Main car or series (optional)', hint: 'e.g. LMU LMGT3, ACC GT3', required: false },
]

export function ApplyForm() {
  const [state, action] = useActionState(applyForCoaching, null)
  return (
    <form action={action} className="flex flex-col gap-6 rounded-xl border border-line p-5 sm:p-8">
      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">Which program?</legend>
        <span className="text-sm text-muted">PRISM coaches you either way. LMU drivers race under the PRISM banner; ACC drivers race with our partner Falcon Motorsport.</span>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {PROGRAMS.map((p) => (
            <label key={p} className="tap flex cursor-pointer items-center gap-3 rounded-lg border border-[#cbd1d9] px-4 py-2.5 has-[:checked]:border-iris-deep has-[:checked]:bg-[#f4f4fe]">
              <input type="radio" name="program" value={p} required className="h-5 w-5" />
              <span className="text-[15px]">{PROGRAM_LABEL[p]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {QUESTIONS.map((q) => (
        <label key={q.name} className="flex flex-col gap-2">
          <span className="font-semibold">{q.label}</span>
          <span className="text-sm text-muted">{q.hint}</span>
          {q.required ? (
            <textarea name={q.name} required rows={3} maxLength={2000} className="rounded-lg border border-[#cbd1d9] px-3 py-2.5 focus:border-iris-deep focus:outline-none" />
          ) : (
            <input name={q.name} maxLength={200} className="min-h-11 rounded-lg border border-[#cbd1d9] px-3 focus:border-iris-deep focus:outline-none" />
          )}
        </label>
      ))}
      {state && !state.ok && <p role="alert" className="rounded-md bg-[#fdecec] px-4 py-3 text-sm text-[#8a1c1c]">{state.error}</p>}
      <SubmitButton className={`${btn.ember} self-stretch sm:self-start`} pendingText="Sending…">Send application</SubmitButton>
    </form>
  )
}

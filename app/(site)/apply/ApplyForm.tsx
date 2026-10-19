'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/academy/small'
import { applyForCoaching } from '@/lib/academy/actions'
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

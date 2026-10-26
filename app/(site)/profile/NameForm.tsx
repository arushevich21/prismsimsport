'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/academy/small'
import { setRealName, type NameResult } from '@/lib/profile/actions'
import { btn } from '@/lib/ui'

const field = 'min-h-11 w-full rounded-md border border-[#cbd1d9] bg-white px-3 text-[15px]'

export function NameForm({ first, last }: { first: string; last: string }) {
  const [state, action] = useActionState<NameResult | null, FormData>(setRealName, null)
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">First name
          <input name="first_name" defaultValue={first} autoComplete="given-name" maxLength={32} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">Last name
          <input name="last_name" defaultValue={last} autoComplete="family-name" maxLength={32} className={field} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className={btn.dark}>Save name</SubmitButton>
        <p className={`text-sm ${state && !state.ok ? 'text-[#8a1c1c]' : 'text-muted'}`} aria-live="polite">
          {state ? (state.ok ? state.note ?? 'Saved.' : state.error) : 'Leave both blank to use your Discord name.'}
        </p>
      </div>
    </form>
  )
}

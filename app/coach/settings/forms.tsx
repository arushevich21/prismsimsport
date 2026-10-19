'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/academy/small'
import { addCoach, saveCoachSettings } from '@/lib/academy/actions'
import type { Coach } from '@/lib/academy/queries'

const field = 'min-h-11 w-full rounded-md border border-[#cbd1d9] bg-white px-3'
const labelCls = 'flex flex-col gap-1 text-[13px] text-[#4a4f57]'
const primary = 'tap rounded-md bg-ink px-4 text-sm font-semibold text-white'

export function CoachSettingsForm({ coach }: { coach: Coach }) {
  const [state, action] = useActionState(saveCoachSettings, null)
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className={labelCls}>Title on your profile<input name="title" defaultValue={coach.title ?? ''} placeholder="e.g. Coach" className={field} /></label>
      <label className={labelCls}>Cal.com username
        <input name="cal_username" defaultValue={coach.cal_username ?? ''} placeholder="e.g. dts-anton" className={field} />
        <span>Needs event types named coaching-30, coaching-60 and coaching-90.</span>
      </label>
      <label className={labelCls}>PayPal.me name
        <input name="paypal_me" defaultValue={coach.paypal_me ?? ''} placeholder="paypal.me/yourname → yourname" className={field} />
      </label>
      <label className={labelCls}>Zelle email or phone<input name="zelle_handle" defaultValue={coach.zelle_handle ?? ''} className={field} /></label>
      <label className={`${labelCls} sm:col-span-2`}>Short bio<textarea name="bio" rows={3} defaultValue={coach.bio ?? ''} className="rounded-md border border-[#cbd1d9] px-3 py-2" /></label>
      <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="accepting_students" defaultChecked={coach.accepting_students} className="h-5 w-5" />
        Taking new students
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton className={primary}>Save settings</SubmitButton>
        {state && <span role="status" className={`text-sm ${state.ok ? 'text-ice-deep' : 'text-[#8a1c1c]'}`}>{state.ok ? 'Saved.' : state.error}</span>}
      </div>
    </form>
  )
}

export function AddCoachForm() {
  const [state, action] = useActionState(addCoach, null)
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className={labelCls}>Their Discord username or display name
        <input name="handle" required placeholder="e.g. adamk" className={field} />
      </label>
      <p className="text-sm text-muted">They need to have signed in to the site once.</p>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className={primary}>Make coach</SubmitButton>
        {state && <span role="status" className={`text-sm ${state.ok ? 'text-ice-deep' : 'text-[#8a1c1c]'}`}>{state.ok ? 'Done. They now have the coach view.' : state.error}</span>}
      </div>
    </form>
  )
}

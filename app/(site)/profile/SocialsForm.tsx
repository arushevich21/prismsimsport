'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/academy/small'
import { setDriverSocials } from '@/lib/profile/actions'
import { SOCIALS, SOCIAL_COLUMN, SOCIAL_LABEL, type SocialHandles } from '@/lib/socials'
import { btn } from '@/lib/ui'

const field = 'min-h-11 w-full rounded-md border border-[#cbd1d9] bg-white px-3 text-[15px]'

const PLACEHOLDER = {
  instagram: 'instagram.com/yourname',
  twitch: 'twitch.tv/yourname',
  youtube: 'youtube.com/@yourname',
  tiktok: 'tiktok.com/@yourname',
  x: 'x.com/yourname',
} as const

// Their social accounts, shown as icons on their driver card.
export function SocialsForm({ handles }: { handles: Partial<SocialHandles> }) {
  const [state, action] = useActionState(setDriverSocials, null)
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIALS.map((p) => (
          <label key={p} className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">{SOCIAL_LABEL[p]}
            <input name={p} defaultValue={handles[SOCIAL_COLUMN[p]] ?? ''} placeholder={PLACEHOLDER[p]} className={field} autoComplete="off" />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className={btn.dark}>Save accounts</SubmitButton>
        <p className={`text-sm ${state && !state.ok ? 'text-[#8a1c1c]' : 'text-muted'}`} aria-live="polite">
          {state ? (state.ok ? 'Saved. Your icons show on the team page within a few minutes.' : state.error) : 'Paste a link or your handle. Leave a field blank to hide it.'}
        </p>
      </div>
    </form>
  )
}

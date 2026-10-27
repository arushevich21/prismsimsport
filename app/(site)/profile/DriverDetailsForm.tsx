'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/academy/small'
import { getCountryOptions } from '@/lib/admin/shared'
import { setDriverDetails } from '@/lib/profile/actions'
import { DR_TIERS, type DriverRankTier } from '@/lib/types'
import { btn } from '@/lib/ui'

const field = 'min-h-11 w-full rounded-md border border-[#cbd1d9] bg-white px-3 text-[15px]'

type Props = { country: string | null; rank?: { tier: DriverRankTier | null; level: number | null } }

// Country, plus LMU Driver Rank for LMU drivers (no `rank` otherwise).
export function DriverDetailsForm({ country, rank }: Props) {
  const [state, action] = useActionState(setDriverDetails, null)
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">Country
        <select name="country_code" defaultValue={country ?? ''} className={field}>
          <option value="">Not set</option>
          {getCountryOptions().map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </label>
      {rank && (
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
          <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">LMU Driver Rank
            <select name="lmu_dr_tier" defaultValue={rank.tier ?? ''} className={field}>
              <option value="">Not set</option>
              {DR_TIERS.map((t) => <option key={t} value={t}>{t[0]!.toUpperCase() + t.slice(1)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-[#4a4f57]">Level
            <select name="lmu_dr_level" defaultValue={rank.level ?? 1} className={field}>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className={btn.dark}>Save</SubmitButton>
        <p className={`text-sm ${state && !state.ok ? 'text-[#8a1c1c]' : 'text-muted'}`} aria-live="polite">
          {state ? (state.ok ? 'Saved. It shows on the team page within a few minutes.' : state.error) : rank ? 'Your rank as shown on your LMU in-game profile.' : ''}
        </p>
      </div>
    </form>
  )
}

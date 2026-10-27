import type { Metadata } from 'next'
import { requireSignedIn } from '@/lib/auth'
import { driverPhotoUrl } from '@/lib/photos'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isMainClass, type DriverRankTier, type Sim } from '@/lib/types'
import { eyebrow } from '@/lib/ui'
import { ClassPicker } from './ClassPicker'
import { DriverDetailsForm } from './DriverDetailsForm'
import { NameForm } from './NameForm'
import { PhotoForm } from './PhotoForm'

export const metadata: Metadata = { title: 'Your profile', robots: { index: false } }

export default async function ProfilePage() {
  const viewer = await requireSignedIn('/profile')
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('first_name, last_name, main_classes').eq('id', viewer.user.id).maybeSingle()
  const classes = ((data?.main_classes ?? []) as string[]).filter(isMainClass)
  // Their roster entry, if any: it holds what's on their driver card.
  const { data: driver } = await createAdminClient()
    .from('drivers')
    .select('photo_path, country_code, sims, lmu_dr_tier, lmu_dr_level')
    .eq('profile_id', viewer.user.id)
    .maybeSingle()

  return (
    <section className="page-x flex justify-center py-16 sm:py-24">
      <div className="flex w-full max-w-xl flex-col gap-8 rounded-xl border border-line p-6 sm:p-10">
        <div className="flex flex-col gap-5">
          <span className={`${eyebrow} text-iris-deep`}>Your profile</span>
          <h1 className="font-heading text-3xl leading-tight font-bold">Your name</h1>
          <p className="text-[17px] leading-relaxed text-[#4a4f57]">
            How you show up on PRISM, and your nickname in the PRISM Discord.
          </p>
          <NameForm first={data?.first_name ?? ''} last={data?.last_name ?? ''} />
        </div>
        <div className="flex flex-col gap-5 border-t border-line pt-8">
          <h2 className="font-heading text-2xl leading-tight font-bold">What do you mainly drive?</h2>
          <p className="text-[17px] leading-relaxed text-[#4a4f57]">
            Pick the one or two classes you race most. You’ll get a matching role in the PRISM Discord, so people know who to ask.
          </p>
          <ClassPicker initial={classes} />
        </div>
        <div className="flex flex-col gap-5 border-t border-line pt-8">
          <h2 className="font-heading text-2xl leading-tight font-bold">Your driver card</h2>
          {driver ? (
            <>
              <p className="text-[17px] leading-relaxed text-[#4a4f57]">Your photo, flag and rank on the team page.</p>
              <PhotoForm photoUrl={driverPhotoUrl(driver.photo_path as string | null)} />
              <DriverDetailsForm
                country={driver.country_code as string | null}
                rank={(driver.sims as Sim[]).includes('lmu') ? { tier: driver.lmu_dr_tier as DriverRankTier | null, level: driver.lmu_dr_level as number | null } : undefined}
              />
            </>
          ) : (
            <p className="text-[17px] leading-relaxed text-[#4a4f57]">
              Once you’re on the team roster, you can set your photo, country and rank for your driver card here.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

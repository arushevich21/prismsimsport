import type { Metadata } from 'next'
import { requireSignedIn } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { isMainClass } from '@/lib/types'
import { eyebrow } from '@/lib/ui'
import { ClassPicker } from './ClassPicker'
import { NameForm } from './NameForm'

export const metadata: Metadata = { title: 'Your profile', robots: { index: false } }

export default async function ProfilePage() {
  const viewer = await requireSignedIn('/profile')
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('first_name, last_name, main_classes').eq('id', viewer.user.id).maybeSingle()
  const classes = ((data?.main_classes ?? []) as string[]).filter(isMainClass)

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
      </div>
    </section>
  )
}

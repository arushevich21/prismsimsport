import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireSignedIn } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { eyebrow } from '@/lib/ui'
import { ApplyForm } from './ApplyForm'

export const metadata: Metadata = { title: 'Apply for coaching', robots: { index: false } }

export default async function ApplyPage() {
  const viewer = await requireSignedIn('/apply')
  if (viewer.role !== 'member') redirect('/dashboard')

  const supabase = await createClient()
  const { data: inquiry } = await supabase.from('inquiries').select('status').eq('user_id', viewer.user.id).maybeSingle()
  // Anyone without a pending application can apply (again).
  if (inquiry?.status === 'pending') redirect('/pending')
  const again = !!inquiry

  return (
    <section className="page-x flex justify-center py-12 sm:py-20">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className={`${eyebrow} text-ember-deep`}>PRISM Academy</span>
          <h1 className="font-heading text-3xl leading-tight font-bold sm:text-4xl">{again ? 'Welcome back.' : 'Tell us where you are.'}</h1>
          <p className="text-[17px] leading-relaxed text-[#4a4f57]">
            {again
              ? 'Tell us where you are now. Your new answers replace your last application.'
              : 'A few questions so we can match you with the right coach. It takes about two minutes.'}
          </p>
        </div>
        <ApplyForm />
      </div>
    </section>
  )
}

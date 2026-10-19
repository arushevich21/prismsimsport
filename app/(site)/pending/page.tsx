import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireSignedIn } from '@/lib/auth'
import { DISCORD_INVITE_URL } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'
import { btn, eyebrow } from '@/lib/ui'

export const metadata: Metadata = { title: 'Application received' }

export default async function PendingPage() {
  const viewer = await requireSignedIn('/pending')
  if (viewer.role !== 'member') redirect('/dashboard')

  const supabase = await createClient()
  const { data: inquiry } = await supabase.from('inquiries').select('status').eq('user_id', viewer.user.id).maybeSingle()
  if (!inquiry) redirect('/apply')
  const declined = inquiry.status === 'declined'

  return (
    <section className="page-x flex justify-center py-16 sm:py-24">
      <div className="flex w-full max-w-xl flex-col gap-5 rounded-xl border border-line p-6 sm:p-10">
        <span className={`${eyebrow} text-ember-deep`}>PRISM Academy</span>
        <h1 className="font-heading text-3xl leading-tight font-bold">{declined ? 'Not this time.' : 'Application received.'}</h1>
        <p className="text-[17px] leading-relaxed text-[#4a4f57]">
          {declined
            ? 'We can’t take you on as a coaching student right now. You’re still very welcome in the community, and you can ask about future spots in the Discord.'
            : 'Thanks for applying. A coach will look at your answers and get back to you, usually within a few days. You’ll get access to the Academy as soon as you’re approved.'}
        </p>
        <div className="flex flex-col gap-3 xs:flex-row">
          {DISCORD_INVITE_URL && <a href={DISCORD_INVITE_URL} className={btn.dark}>Join the Discord</a>}
          <Link href="/" className={btn.outlineLight}>Back to PRISM</Link>
        </div>
      </div>
    </section>
  )
}

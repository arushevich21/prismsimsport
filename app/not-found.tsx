import Link from 'next/link'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { btn } from '@/lib/ui'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-ink">
      <SiteHeader />
      <main id="main" className="page-x flex flex-1 flex-col items-start justify-center gap-5 py-20">
        <span className="font-mono text-xs tracking-[0.15em] text-ember-deep uppercase">404</span>
        <h1 className="font-heading text-3xl font-bold sm:text-5xl">Off track.</h1>
        <p className="max-w-lg text-[17px] text-[#4a4f57]">That page doesn’t exist, or it moved in the switch to the new PRISM site.</p>
        <Link href="/" className={btn.dark}>Back to PRISM</Link>
      </main>
      <SiteFooter />
    </div>
  )
}

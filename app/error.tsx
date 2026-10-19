'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { btn } from '@/lib/ui'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id="main" className="page-x flex min-h-dvh flex-col items-start justify-center gap-5 bg-white py-20 font-sans text-ink">
      <span className="font-mono text-xs tracking-[0.15em] text-ember-deep uppercase">Something went wrong</span>
      <h1 className="font-heading text-3xl font-bold sm:text-5xl">Red flag.</h1>
      <p className="max-w-lg text-[17px] text-[#4a4f57]">
        This page hit a problem. Try again, and if it keeps happening, let us know in the Discord.
        {error.digest && <span className="mt-2 block font-mono text-xs text-muted">Reference: {error.digest}</span>}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={btn.dark}>Try again</button>
        <Link href="/" className={btn.outlineLight}>Back to PRISM</Link>
      </div>
    </main>
  )
}

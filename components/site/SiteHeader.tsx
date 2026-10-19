'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DISCORD_INVITE_URL, NAV_LINKS } from '@/lib/site'
import { btn } from '@/lib/ui'
import { SpectrumRule } from './SpectrumRule'

export function SiteHeader() {
  const pathname = usePathname()
  // The phone menu remembers which page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = (value: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((typeof value === 'function' ? value(open) : value) ? pathname : null)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Pages are cached for everyone, so "Sign in" vs "Dashboard" is decided here.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session))
    return () => sub.subscription.unsubscribe()
  }, [])

  const isActive = (href: string) => !href.includes('#') && (pathname === href || pathname.startsWith(href + '/'))
  const account = signedIn ? { href: '/dashboard', label: 'Dashboard' } : { href: '/login', label: 'Sign in' }
  const discordHref = DISCORD_INVITE_URL ?? '/community'

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="page-x flex h-16 items-center gap-6 border-b border-line md:h-[4.5rem]">
        <Link href="/" aria-label="PRISM home" className="tap flex shrink-0 items-center">
          <Image src="/brand/prism-logo.png" alt="PRISM" width={435} height={164} priority className="h-8 w-auto md:h-10" />
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center gap-7 text-[15px] font-medium md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? 'page' : undefined}
              className="tap inline-flex items-center text-ink hover:text-iris-deep aria-[current=page]:shadow-[inset_0_-2px_0_var(--color-ink)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link href={account.href} className="tap inline-flex items-center px-2 text-[15px] font-medium text-ink hover:text-iris-deep">
            {account.label}
          </Link>
          <a href={discordHref} className={`${btn.dark} !py-2.5 text-sm`}>Join the Discord</a>
        </div>

        <button
          type="button"
          className="tap -mr-2 ml-auto inline-flex items-center justify-center rounded-md text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-b border-line bg-white md:hidden">
          <nav aria-label="Primary" className="page-x flex flex-col py-2">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? 'page' : undefined}
                className="flex min-h-12 items-center border-b border-line text-lg font-medium text-ink last:border-0 aria-[current=page]:text-iris-deep"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="page-x flex flex-col gap-3 pb-5">
            <a href={discordHref} className={btn.dark}>Join the Discord</a>
            <Link href={account.href} className={btn.outlineLight}>{account.label}</Link>
          </div>
        </div>
      )}

      <SpectrumRule />
    </header>
  )
}

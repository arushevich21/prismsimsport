'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type NavItem = { href: string; label: string; badge?: number }

// Sidebar on desktop; a horizontally scrolling tab strip on phones.
export function SideNav({ title, items, accent }: { title: string; items: NavItem[]; accent: string }) {
  const pathname = usePathname()
  const active = (href: string) => pathname === href || (href !== '/coach' && pathname.startsWith(href + '/'))

  return (
    <nav aria-label={title} className="lg:sticky lg:top-24 lg:w-60 lg:shrink-0 lg:self-start">
      <span className={`hidden px-3 pb-2 font-mono text-[11px] tracking-[0.15em] uppercase lg:block ${accent}`}>{title}</span>
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:rounded-xl lg:border lg:border-line lg:bg-white lg:p-2">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active(item.href) ? 'page' : undefined}
              className="tap flex items-center gap-2 rounded-lg px-3.5 text-[15px] whitespace-nowrap text-[#33373e] hover:bg-mist aria-[current=page]:bg-ink aria-[current=page]:font-semibold aria-[current=page]:text-white lg:aria-[current=page]:bg-[#fff1e5] lg:aria-[current=page]:text-ink"
            >
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className="rounded-full bg-ember px-2 py-0.5 text-xs font-semibold text-ink">{item.badge}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

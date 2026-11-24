import Link from 'next/link'
import { SideNav } from '@/components/academy/SideNav'
import { SiteHeader } from '@/components/site/SiteHeader'
import { requireRole } from '@/lib/auth'

export const metadata = { title: { default: 'Admin', template: '%s · Admin' }, robots: { index: false, follow: false } }

// Everything an admin edits on the public site, one page per kind of thing.
// The editors are the same ones edit mode opens on the pages themselves.
const ITEMS = [
  { href: '/manage', label: 'Overview' },
  { href: '/manage/races', label: 'Races and lineups' },
  { href: '/manage/results', label: 'Results' },
  { href: '/manage/roster', label: 'Driver roster' },
  { href: '/coach', label: 'Coaching' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['admin'], '/manage')

  return (
    <div className="flex min-h-dvh flex-col bg-mist font-sans font-normal text-ink">
      <SiteHeader />
      <div className="page-x flex flex-1 flex-col gap-6 py-6 sm:py-8 lg:flex-row lg:gap-8">
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <SideNav title="Admin" items={ITEMS} accent="text-iris-deep" />
          <Link href="/" className="hidden px-3.5 text-sm font-semibold text-iris-deep hover:text-ink lg:block">View the site</Link>
        </div>
        <main id="main" className="flex min-w-0 flex-1 flex-col gap-6">{children}</main>
      </div>
    </div>
  )
}

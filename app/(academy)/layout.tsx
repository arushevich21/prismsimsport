import { SideNav } from '@/components/academy/SideNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { requireAcademyAccess } from '@/lib/auth'

export const metadata = { robots: { index: false, follow: false } }

// Server-side gate for the student side of the Academy. The folder name in
// brackets keeps URLs short (/dashboard, /sessions, …).
export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireAcademyAccess('/dashboard')
  const staff = viewer.role === 'coach' || viewer.role === 'admin'

  const items = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/sessions', label: 'Sessions' },
    { href: '/messages', label: 'Ask my coach' },
    { href: '/telemetry', label: 'Telemetry' },
    { href: '/library', label: 'Video library' },
    { href: '/setups', label: 'Setups' },
    { href: '/profile', label: 'My profile' },
    ...(staff ? [{ href: '/coach', label: 'Coach queue →' }] : []),
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-mist font-sans font-normal text-ink">
      <SiteHeader />
      <div className="page-x flex flex-1 flex-col gap-6 py-6 sm:py-8 lg:flex-row lg:gap-8">
        <SideNav title="PRISM Academy" items={items} accent="text-ember-deep" />
        <main id="main" className="flex min-w-0 flex-1 flex-col gap-6">{children}</main>
      </div>
      <SiteFooter />
    </div>
  )
}

import { SideNav } from '@/components/academy/SideNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getQueue } from '@/lib/academy/queries'
import { requireStaff } from '@/lib/auth'

export const metadata = { robots: { index: false, follow: false } }

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff('/coach')
  const q = await getQueue(viewer)
  const admin = viewer.role === 'admin'

  const items = [
    { href: '/coach', label: 'Queue', badge: q.applications.length + q.telemetry.length + q.threads.length + q.needsAction.length },
    { href: '/coach/messages', label: 'Messages', badge: q.threads.length },
    { href: '/coach/students', label: admin ? 'All students' : 'My students' },
    ...(admin ? [{ href: '/coach/library', label: 'Library & setups' }] : []),
    { href: '/coach/settings', label: 'Settings' },
    { href: '/profile', label: 'My profile' },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-mist font-sans font-normal text-ink">
      <SiteHeader />
      <div className="bg-iris">
        <div className="page-x flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
          <span className="font-mono text-xs font-semibold tracking-[0.15em]">COACH VIEW</span>
          <span>{admin ? 'Admin: every coach’s students, plus new applications.' : 'Your students only.'}</span>
        </div>
      </div>
      <div className="page-x flex flex-1 flex-col gap-6 py-6 sm:py-8 lg:flex-row lg:gap-8">
        <SideNav title="Coaching" items={items} accent="text-iris-deep" />
        <main id="main" className="flex min-w-0 flex-1 flex-col gap-6">{children}</main>
      </div>
      <SiteFooter />
    </div>
  )
}

import { AdminBar, AdminProvider } from '@/components/admin/AdminProvider'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <div className="flex min-h-dvh flex-col bg-white font-sans font-normal text-ink">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <AdminBar />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </AdminProvider>
  )
}

import { requireRole } from '@/lib/auth'

// Server-side gate: the old page only checked a hardcoded user id in the browser.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['admin'], '/admin')
  return children
}

import { requireAcademyAccess } from '@/lib/auth'

// Server-side gate for every Academy page (dashboard, library, setups,
// schedule, telemetry, members). The folder name in brackets keeps URLs unchanged.
export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  await requireAcademyAccess('/dashboard')
  return children
}

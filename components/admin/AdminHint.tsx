'use client'

import { useAdmin } from './AdminProvider'

// A short note shown only in edit mode, e.g. to point at where something is edited.
export function AdminHint({ children }: { children: React.ReactNode }) {
  const { editing } = useAdmin()
  if (!editing) return null
  return <p className="rounded-lg border border-dashed border-iris-deep bg-[#f4f4fe] px-4 py-3 text-sm text-ink">{children}</p>
}

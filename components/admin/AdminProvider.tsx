'use client'

import Link from 'next/link'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AdminState = { isAdmin: boolean; editing: boolean; setEditing: (on: boolean) => void }

const AdminContext = createContext<AdminState>({ isAdmin: false, editing: false, setEditing: () => {} })

export const useAdmin = () => useContext(AdminContext)

// Public pages are cached for everyone, so whether to show admin tools is
// decided in the browser. This only reveals UI: every write is still checked
// by the database rules, and page refreshes by a server action.
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    async function check(userId: string | undefined) {
      if (!userId) {
        if (!cancelled) setIsAdmin(false)
        return
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      if (!cancelled) setIsAdmin(data?.role === 'admin')
    }
    // Fires once straight away with the current session, then on every change.
    // The lookup is deferred: calling Supabase inside this callback deadlocks.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => check(session?.user.id), 0)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AdminContext.Provider value={{ isAdmin, editing: isAdmin && editing, setEditing }}>
      {children}
    </AdminContext.Provider>
  )
}

// Rendered under the site header; shows nothing for visitors. A slim strip:
// the admin panel is the main way to edit, editing on the page is a toggle.
export function AdminBar() {
  const { isAdmin, editing, setEditing } = useAdmin()
  if (!isAdmin) return null
  return (
    <div className="border-b border-graphite-3 bg-graphite-2 text-white">
      <div className="page-x flex min-h-11 flex-wrap items-center gap-x-5 gap-y-1 py-1 text-sm">
        <Link href="/manage" className="tap inline-flex items-center font-semibold text-ice hover:text-white">Admin panel</Link>
        {editing && <span className="text-muted-dark">Outlined blocks can be edited here; each saves on its own.</span>}
        <button
          type="button"
          aria-pressed={editing}
          onClick={() => setEditing(!editing)}
          className="tap ml-auto inline-flex items-center rounded-md px-3 font-semibold text-body-dark hover:text-white aria-pressed:bg-iris aria-pressed:text-ink"
        >
          {editing ? 'Done editing' : 'Edit on page'}
        </button>
      </div>
    </div>
  )
}

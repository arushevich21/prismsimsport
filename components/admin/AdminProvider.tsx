'use client'

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
    supabase.auth.getSession().then(({ data }) => check(data.session?.user.id))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => check(session?.user.id))
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

// Rendered under the site header; shows nothing for visitors.
export function AdminBar() {
  const { isAdmin, editing, setEditing } = useAdmin()
  if (!isAdmin) return null
  const seg = 'tap inline-flex items-center rounded-md px-4 text-sm font-semibold'
  return (
    <div className="bg-iris text-ink">
      <div className="page-x flex flex-wrap items-center gap-x-5 gap-y-2 py-2">
        <span className="font-mono text-xs font-semibold tracking-[0.15em]">ADMIN</span>
        <span className="min-w-0 flex-1 text-sm">
          {editing ? 'Editing. Outlined blocks can be changed; each block saves on its own.' : 'Previewing what visitors see.'}
        </span>
        <div role="group" aria-label="Page mode" className="flex gap-1 rounded-lg bg-white p-1">
          <button type="button" aria-pressed={editing} onClick={() => setEditing(true)} className={`${seg} ${editing ? 'bg-ink text-white' : ''}`}>Edit</button>
          <button type="button" aria-pressed={!editing} onClick={() => setEditing(false)} className={`${seg} ${!editing ? 'bg-ink text-white' : ''}`}>Preview</button>
        </div>
      </div>
    </div>
  )
}

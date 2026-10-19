import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type Role = 'member' | 'student' | 'coach' | 'admin'

export type Viewer = {
  user: User
  role: Role
}

// The signed-in user and their role, once per request. getUser() checks the
// token with Supabase, so this is safe to base access decisions on.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return { user, role: (profile?.role as Role | undefined) ?? 'member' }
})

function loginUrl(next: string) {
  return `/login?next=${encodeURIComponent(next)}`
}

export async function requireRole(roles: Role[], next: string): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginUrl(next))
  if (!roles.includes(viewer.role)) redirect('/')
  return viewer
}

// Academy pages: approved students, coaches and admins.
// Until the new Academy admin ships, approvals still happen in the old admin
// page (members.active), so that flag is honoured as well.
export async function requireAcademyAccess(next: string): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginUrl(next))
  if (viewer.role === 'student' || viewer.role === 'coach' || viewer.role === 'admin') return viewer

  const supabase = await createClient()
  const { data: member } = await supabase
    .from('members')
    .select('active')
    .eq('user_id', viewer.user.id)
    .maybeSingle()
  if (member?.active) return viewer

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('id')
    .eq('user_id', viewer.user.id)
    .maybeSingle()
  redirect(inquiry ? '/pending' : '/apply')
}

import 'server-only'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Viewer } from '@/lib/auth'
import type { Program, Tier } from './constants'

// Reads for the Academy pages. They run as the signed-in user, so RLS limits
// each query to what that person may see; the service role is only used where
// a page is already admin-only (applications).

export type Person = { id: string; display_name: string | null; discord_username: string | null; avatar_url: string | null }

export const personName = (p: Person | null | undefined) => p?.display_name || p?.discord_username || 'Unknown'

const PERSON = 'id, display_name, discord_username, avatar_url'

export type Coach = Person & {
  title: string | null
  bio: string | null
  cal_username: string | null
  paypal_me: string | null
  zelle_handle: string | null
  accepting_students: boolean
}

export type CoachingSession = {
  id: string
  student_id: string | null
  coach_id: string
  starts_at: string
  length_minutes: number
  price_cents: number | null
  payment_status: 'unpaid' | 'paid' | 'waived'
  payment_method: 'paypal' | 'zelle' | 'other' | null
  paid_at: string | null
  status: 'booked' | 'completed' | 'cancelled'
  recording_url: string | null
  notes: string | null
  attendee_name: string | null
  attendee_email: string | null
}

export type TelemetryUpload = {
  id: number | string
  user_id: string
  filename: string
  storage_path: string
  note: string | null
  reviewed: boolean
  feedback: string | null
  created_at: string
}

export type Message = { id: string; student_id: string; sender_id: string; body: string; source: string; read_at: string | null; created_at: string }

export type StudentRow = { profile_id: string; coach_id: string | null; tier: Tier; program: Program | null; team_ready: boolean; approved_at: string; profile: Person | null }

async function getCoach(coachId: string): Promise<Coach | null> {
  const supabase = await createClient()
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select(PERSON).eq('id', coachId).maybeSingle(),
    supabase.from('coaches').select('title, bio, cal_username, paypal_me, zelle_handle, accepting_students').eq('profile_id', coachId).maybeSingle(),
  ])
  if (!profile) return null
  return {
    ...(profile as Person),
    title: settings?.title ?? null,
    bio: settings?.bio ?? null,
    cal_username: settings?.cal_username ?? null,
    paypal_me: settings?.paypal_me ?? null,
    zelle_handle: settings?.zelle_handle ?? null,
    accepting_students: settings?.accepting_students ?? true,
  }
}

// Everything the student dashboard needs about the signed-in student.
export async function getStudentHome(userId: string) {
  const supabase = await createClient()
  const { data: student } = await supabase
    .from('students')
    .select('tier, coach_id, team_ready')
    .eq('profile_id', userId)
    .maybeSingle()
  const coach = student?.coach_id ? await getCoach(student.coach_id) : null
  return { student: student as { tier: Tier; coach_id: string | null; team_ready: boolean } | null, coach }
}

export async function getSessionsFor(studentId: string): Promise<CoachingSession[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('coaching_sessions').select('*').eq('student_id', studentId).order('starts_at', { ascending: false })
  return (data ?? []) as CoachingSession[]
}

// Recordings added through the old DTS admin page.
export async function getLegacyRecordings(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('session_videos')
    .select('id, youtube_id, title, session_date, notes')
    .eq('user_id', userId)
    .order('session_date', { ascending: false, nullsFirst: false })
  return (data ?? []) as { id: string; youtube_id: string; title: string | null; session_date: string | null; notes: string | null }[]
}

export async function getTelemetryFor(userId: string): Promise<TelemetryUpload[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('telemetry_uploads').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  return (data ?? []) as TelemetryUpload[]
}

export async function getMessages(studentId: string, limit = 300): Promise<Message[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return ((data ?? []) as Message[]).reverse()
}

export async function getPeople(ids: string[]): Promise<Map<string, Person>> {
  if (ids.length === 0) return new Map()
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select(PERSON).in('id', [...new Set(ids)])
  return new Map(((data ?? []) as Person[]).map((p) => [p.id, p]))
}

// ── Coach side ──────────────────────────────────────────────────────────────

// Coaches see their own students; admins see everyone.
export async function getStudentsFor(viewer: Viewer): Promise<StudentRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('students')
    .select(`profile_id, coach_id, tier, program, team_ready, approved_at, profile:profiles!students_profile_id_fkey ( ${PERSON} )`)
    .order('approved_at', { ascending: false })
  if (viewer.role !== 'admin') query = query.eq('coach_id', viewer.user.id)
  const { data } = await query
  return (data ?? []) as unknown as StudentRow[]
}

export type Application = {
  id: string | number
  user_id: string
  discord_handle: string | null
  email: string | null
  improve: string
  goals: string
  experience: string
  car_series: string | null
  program: Program | null
  status: string
  created_at: string
}

export async function getPendingApplications(): Promise<Application[]> {
  const { data } = await createAdminClient()
    .from('inquiries')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  return (data ?? []) as Application[]
}

export async function getCoaches(): Promise<Coach[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('coaches').select('profile_id').order('sort_order')
  const coaches = await Promise.all((data ?? []).map((c) => getCoach(c.profile_id as string)))
  return coaches.filter((c): c is Coach => c !== null)
}

export async function getTelemetryQueue(studentIds: string[]): Promise<TelemetryUpload[]> {
  if (studentIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('telemetry_uploads')
    .select('*')
    .in('user_id', studentIds)
    .eq('reviewed', false)
    .order('created_at', { ascending: true })
  return (data ?? []) as TelemetryUpload[]
}

// Threads whose latest message is from the student, i.e. waiting on a coach.
export async function getUnansweredThreads(studentIds: string[]) {
  if (studentIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('messages')
    .select('student_id, sender_id, body, created_at')
    .in('student_id', studentIds)
    .order('created_at', { ascending: false })
    .limit(1000)
  const latest = new Map<string, { student_id: string; sender_id: string; body: string; created_at: string }>()
  for (const m of data ?? []) if (!latest.has(m.student_id)) latest.set(m.student_id, m)
  return [...latest.values()].filter((m) => m.sender_id === m.student_id)
}

export async function getCoachSessions(viewer: Viewer): Promise<CoachingSession[]> {
  const supabase = await createClient()
  let query = supabase.from('coaching_sessions').select('*').neq('status', 'cancelled').order('starts_at', { ascending: true })
  if (viewer.role !== 'admin') query = query.eq('coach_id', viewer.user.id)
  const { data } = await query
  return (data ?? []) as CoachingSession[]
}

// Everything the coach queue shows, fetched once per request (the layout's
// badges and the page share it).
export const getQueue = cache(async (viewer: Viewer) => {
  const students = await getStudentsFor(viewer)
  const ids = students.map((s) => s.profile_id)
  const [applications, telemetry, threads, sessions] = await Promise.all([
    viewer.role === 'admin' ? getPendingApplications() : Promise.resolve([] as Application[]),
    getTelemetryQueue(ids),
    getUnansweredThreads(ids),
    getCoachSessions(viewer),
  ])
  const now = Date.now()
  const needsAction = sessions.filter(
    (s) => !s.student_id || s.payment_status === 'unpaid' || (s.status === 'booked' && Date.parse(s.starts_at) < now)
  )
  return { students, applications, telemetry, threads, sessions, needsAction }
})

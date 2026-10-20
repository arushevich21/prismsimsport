'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { getViewer, type Viewer } from '@/lib/auth'
import {
  notifyCoachesOfMessage, notifyNewApplication, notifyStudentOfReply, notifyTeamReady, notifyTelemetry,
  onCoachAdded, onStudentProgramChanged, onStudentRemoved,
} from '@/lib/discord/notify'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { PROGRAM_LABEL, TELEMETRY_EXTENSIONS, TIERS, isProgram, type Tier } from './constants'
import { approveInquiry, declineInquiry } from './decisions'

// Every action re-checks who is calling. RLS is the backstop for the ones that
// run as the user; the few that need the service role check permissions here.

type Result = { ok: true } | { ok: false; error: string }
const fail = (error: string): Result => ({ ok: false, error })
const isStaff = (v: Viewer | null): v is Viewer => v?.role === 'coach' || v?.role === 'admin'
const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()

async function isCoachOf(viewer: Viewer, studentId: string) {
  if (viewer.role === 'admin') return true
  const { data } = await createAdminClient().from('students').select('coach_id').eq('profile_id', studentId).maybeSingle()
  return data?.coach_id === viewer.user.id
}

function displayName(viewer: Viewer) {
  const m = viewer.user.user_metadata ?? {}
  return (m.custom_claims?.global_name as string) || (m.full_name as string) || (m.name as string) || viewer.user.email || 'A student'
}

// ── Applications ────────────────────────────────────────────────────────────

const MAX_ANSWER = 2000

export async function applyForCoaching(_prev: Result | null, fd: FormData): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return fail('Please sign in first.')
  const improve = str(fd, 'improve')
  const goals = str(fd, 'goals')
  const experience = str(fd, 'experience')
  const carSeries = str(fd, 'car_series') || null
  const program = str(fd, 'program')
  if (!isProgram(program)) return fail('Please choose a program: LMU, ACC or both.')
  if (!improve || !goals || !experience) return fail('Please answer the first three questions.')
  if ([improve, goals, experience, carSeries ?? ''].some((v) => v.length > MAX_ANSWER)) return fail('One of your answers is too long.')

  const admin = createAdminClient()
  const { data: existing } = await admin.from('inquiries').select('id').eq('user_id', viewer.user.id).maybeSingle()
  if (!existing) {
    const discordHandle = displayName(viewer)
    const { data: inserted, error } = await admin.from('inquiries').insert({
      user_id: viewer.user.id,
      email: viewer.user.email ?? null,
      discord_handle: discordHandle,
      improve,
      goals,
      experience,
      car_series: carSeries,
      program,
    }).select('id').single()
    if (error) return fail('Could not save your application. Please try again.')
    after(() =>
      notifyNewApplication({ inquiryId: inserted.id as string, applicantId: viewer.user.id, name: discordHandle }, [
        { name: 'Program', value: PROGRAM_LABEL[program] },
        { name: 'What to improve', value: improve },
        { name: 'Goals', value: goals },
        { name: 'Experience', value: experience },
        ...(carSeries ? [{ name: 'Car / Series', value: carSeries }] : []),
      ])
    )
  }
  redirect('/pending')
}

export async function approveApplication(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (viewer?.role !== 'admin') return
  const tier = str(fd, 'tier') as Tier
  const program = str(fd, 'program')
  if (!TIERS.includes(tier) || !isProgram(program)) return
  await approveInquiry(str(fd, 'id'), str(fd, 'coach_id') || null, tier, program)
  revalidatePath('/coach', 'layout')
}

export async function declineApplication(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (viewer?.role !== 'admin') return
  await declineInquiry(str(fd, 'id'))
  revalidatePath('/coach', 'layout')
}

// ── Students ────────────────────────────────────────────────────────────────

export async function updateStudent(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (viewer?.role !== 'admin') return
  const tier = str(fd, 'tier') as Tier
  const programValue = str(fd, 'program')
  const program = isProgram(programValue) ? programValue : null
  if (!TIERS.includes(tier)) return
  const profileId = str(fd, 'profile_id')
  const admin = createAdminClient()
  const { data: before } = await admin.from('students').select('program').eq('profile_id', profileId).maybeSingle()
  await admin.from('students').update({ tier, coach_id: str(fd, 'coach_id') || null, program }).eq('profile_id', profileId)
  // A new program means different Discord roles (LMU Academy / ACC Academy).
  if (before && before.program !== program) after(() => onStudentProgramChanged(profileId, program))
  revalidatePath('/coach', 'layout')
}

export async function setTeamReady(studentId: string, ready: boolean): Promise<Result> {
  const viewer = await getViewer()
  if (!isStaff(viewer)) return fail('Not allowed.')
  const supabase = await createClient()
  const { error } = await supabase.from('students').update({ team_ready: ready }).eq('profile_id', studentId)
  if (error) return fail(error.message)
  if (ready) {
    after(async () => {
      const { data } = await createAdminClient().from('profiles').select('display_name, discord_username').eq('id', studentId).maybeSingle()
      await notifyTeamReady(data?.display_name || data?.discord_username || 'A student', displayName(viewer))
    })
  }
  revalidatePath('/coach', 'layout')
  return { ok: true }
}

export async function removeStudent(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (viewer?.role !== 'admin') return
  const id = str(fd, 'profile_id')
  const admin = createAdminClient()
  await admin.from('students').delete().eq('profile_id', id)
  await admin.from('profiles').update({ role: 'member' }).eq('id', id).eq('role', 'student')
  await admin.from('members').update({ active: false }).eq('user_id', id)
  after(() => onStudentRemoved(id))
  revalidatePath('/coach', 'layout')
}

// ── Chat ────────────────────────────────────────────────────────────────────

export async function sendMessage(studentId: string, body: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Please sign in again.' }
  const text = body.trim()
  if (!text) return { ok: false, error: 'Write a message first.' }
  if (text.length > 4000) return { ok: false, error: 'That message is too long.' }

  // Runs as the user: RLS only allows the student, their coach or an admin.
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .insert({ student_id: studentId, sender_id: viewer.user.id, body: text })
    .select('id')
    .single()
  if (error) return { ok: false, error: 'Could not send. Please try again.' }

  const name = displayName(viewer)
  after(() => (viewer.user.id === studentId ? notifyCoachesOfMessage(studentId, name, text) : notifyStudentOfReply(studentId, name, text)))
  return { ok: true, id: data.id as string }
}

export async function markThreadRead(studentId: string): Promise<void> {
  const viewer = await getViewer()
  if (!viewer) return
  const supabase = await createClient()
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .neq('sender_id', viewer.user.id)
    .is('read_at', null)
}

// ── Telemetry ───────────────────────────────────────────────────────────────

export async function recordTelemetry(input: { path: string; filename: string; note: string }): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer || (viewer.role !== 'student' && !isStaff(viewer))) return fail('Only Academy members can upload.')
  if (!input.path.startsWith(`${viewer.user.id}/`)) return fail('Invalid upload.')
  const lower = input.filename.toLowerCase()
  if (!TELEMETRY_EXTENSIONS.some((ext) => lower.endsWith(ext))) return fail('That file type is not supported.')

  const { error } = await createAdminClient().from('telemetry_uploads').insert({
    user_id: viewer.user.id,
    email: viewer.user.email ?? null,
    filename: input.filename.slice(0, 200),
    storage_path: input.path,
    note: input.note.trim().slice(0, 2000) || null,
  })
  if (error) return fail('Uploaded, but could not save the details. Please tell your coach.')

  const name = displayName(viewer)
  after(() => notifyTelemetry(viewer.user.id, name, input.filename, input.note.trim()))
  revalidatePath('/telemetry')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function telemetryDownloadUrl(id: string): Promise<{ url: string } | { error: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'Please sign in again.' }
  const admin = createAdminClient()
  const { data: upload } = await admin.from('telemetry_uploads').select('user_id, storage_path, filename').eq('id', id).maybeSingle()
  if (!upload) return { error: 'File not found.' }
  const allowed = upload.user_id === viewer.user.id || (isStaff(viewer) && (await isCoachOf(viewer, upload.user_id)))
  if (!allowed) return { error: 'Not allowed.' }
  const { data, error } = await admin.storage.from('telemetry').createSignedUrl(upload.storage_path, 120, { download: upload.filename })
  if (error || !data) return { error: 'Could not create a download link.' }
  return { url: data.signedUrl }
}

export async function reviewTelemetry(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (!isStaff(viewer)) return
  const admin = createAdminClient()
  const id = str(fd, 'id')
  const { data: upload } = await admin.from('telemetry_uploads').select('user_id').eq('id', id).maybeSingle()
  if (!upload || !(await isCoachOf(viewer, upload.user_id))) return
  await admin.from('telemetry_uploads').update({ reviewed: true, feedback: str(fd, 'feedback') || null }).eq('id', id)
  revalidatePath('/coach', 'layout')
}

// ── Sessions & payments ─────────────────────────────────────────────────────

export async function setPayment(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (!isStaff(viewer)) return
  const status = str(fd, 'payment_status')
  const method = str(fd, 'payment_method') || null
  if (!['unpaid', 'paid', 'waived'].includes(status)) return
  if (method && !['paypal', 'zelle', 'other'].includes(method)) return
  const supabase = await createClient()
  await supabase
    .from('coaching_sessions')
    .update({
      payment_status: status,
      payment_method: status === 'paid' ? method : null,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', str(fd, 'id'))
  revalidatePath('/coach', 'layout')
  revalidatePath('/sessions')
}

export async function saveSessionWrapUp(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (!isStaff(viewer)) return
  const recording = str(fd, 'recording_url')
  if (recording && !/^https?:\/\//.test(recording)) return
  const supabase = await createClient()
  await supabase
    .from('coaching_sessions')
    .update({ recording_url: recording || null, notes: str(fd, 'notes') || null, status: 'completed' })
    .eq('id', str(fd, 'id'))
  revalidatePath('/coach', 'layout')
  revalidatePath('/sessions')
  revalidatePath('/dashboard')
}

export async function cancelSession(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (!isStaff(viewer)) return
  const supabase = await createClient()
  await supabase.from('coaching_sessions').update({ status: 'cancelled' }).eq('id', str(fd, 'id'))
  revalidatePath('/coach', 'layout')
  revalidatePath('/sessions')
}

// A booking made with an email we couldn't match gets linked to a student by hand.
export async function linkSession(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (!isStaff(viewer)) return
  const admin = createAdminClient()
  const id = str(fd, 'id')
  const studentId = str(fd, 'student_id')
  const { data: session } = await admin.from('coaching_sessions').select('coach_id').eq('id', id).maybeSingle()
  if (!session || (viewer.role !== 'admin' && session.coach_id !== viewer.user.id)) return
  if (!(await isCoachOf(viewer, studentId))) return
  await admin.from('coaching_sessions').update({ student_id: studentId }).eq('id', id)
  revalidatePath('/coach', 'layout')
}

// ── Coach settings ──────────────────────────────────────────────────────────

export async function saveCoachSettings(_prev: Result | null, fd: FormData): Promise<Result> {
  const viewer = await getViewer()
  if (!isStaff(viewer)) return fail('Not allowed.')
  const paypal = str(fd, 'paypal_me').replace(/^https?:\/\/(www\.)?paypal\.me\//i, '').replace(/\/.*$/, '')
  const cal = str(fd, 'cal_username').replace(/^https?:\/\/(www\.)?cal\.com\//i, '').replace(/\/.*$/, '')
  const supabase = await createClient()
  const { error } = await supabase
    .from('coaches')
    .update({
      title: str(fd, 'title') || null,
      bio: str(fd, 'bio') || null,
      cal_username: cal || null,
      paypal_me: paypal || null,
      zelle_handle: str(fd, 'zelle_handle') || null,
      accepting_students: fd.get('accepting_students') === 'on',
    })
    .eq('profile_id', viewer.user.id)
  if (error) return fail(error.message)
  revalidatePath('/coach', 'layout')
  return { ok: true }
}

// Admin: give someone who has signed in at least once the coach role.
export async function addCoach(_prev: Result | null, fd: FormData): Promise<Result> {
  const viewer = await getViewer()
  if (viewer?.role !== 'admin') return fail('Admins only.')
  const handle = str(fd, 'handle').replace(/^@/, '')
  if (!handle) return fail('Enter their Discord username or display name.')
  // Goes into a PostgREST filter, so only plain name characters are allowed.
  if (!/^[\w .#-]{2,40}$/.test(handle)) return fail('Use letters, numbers, spaces, dots, dashes or underscores only.')
  const admin = createAdminClient()
  const { data: matches } = await admin
    .from('profiles')
    .select('id, role')
    .or(`discord_username.ilike.${handle},display_name.ilike.${handle}`)
    .limit(2)
  if (!matches?.length) return fail('No one with that name has signed in yet. Ask them to sign in once, then try again.')
  if (matches.length > 1) return fail('More than one person matches. Use their exact Discord username.')
  const person = matches[0]!
  if (person.role !== 'admin') await admin.from('profiles').update({ role: 'coach' }).eq('id', person.id)
  await admin.from('coaches').upsert({ profile_id: person.id, title: 'Coach' }, { onConflict: 'profile_id', ignoreDuplicates: true })
  after(() => onCoachAdded(person.id))
  revalidatePath('/coach', 'layout')
  revalidatePath('/academy')
  return { ok: true }
}

// ── Library (admin) ─────────────────────────────────────────────────────────

function parseYoutubeId(url: string) {
  for (const p of [/[?&]v=([^&#]+)/, /youtu\.be\/([^?&#/]+)/, /\/(?:embed|shorts|live)\/([^?&#/]+)/]) {
    const m = url.match(p)
    if (m) return m[1]!.trim()
  }
  return /^[\w-]{11}$/.test(url) ? url : null
}

export async function saveVideo(_prev: Result | null, fd: FormData): Promise<Result> {
  const viewer = await getViewer()
  if (viewer?.role !== 'admin') return fail('Admins only.')
  const youtubeId = parseYoutubeId(str(fd, 'youtube_url'))
  if (!youtubeId) return fail('Could not find a YouTube video in that link.')
  const title = str(fd, 'title')
  if (!title) return fail('Give the video a title.')
  const values = {
    youtube_id: youtubeId,
    title,
    track: str(fd, 'track') || null,
    car: str(fd, 'car') || null,
    category: str(fd, 'category') || null,
    description: str(fd, 'description') || null,
    sort_order: Number(str(fd, 'sort_order')) || null,
  }
  const id = str(fd, 'id')
  const admin = createAdminClient()
  const { error } = id ? await admin.from('videos').update(values).eq('id', id) : await admin.from('videos').insert(values)
  if (error) return fail(error.message)
  revalidatePath('/library')
  revalidatePath('/coach/library')
  return { ok: true }
}

export async function deleteVideo(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (viewer?.role !== 'admin') return
  await createAdminClient().from('videos').delete().eq('id', str(fd, 'id'))
  revalidatePath('/library')
  revalidatePath('/coach/library')
}

export async function saveSetup(_prev: Result | null, fd: FormData): Promise<Result> {
  const viewer = await getViewer()
  if (viewer?.role !== 'admin') return fail('Admins only.')
  const title = str(fd, 'title')
  if (!title) return fail('Give the setup a title.')
  const id = str(fd, 'id')
  const file = fd.get('file')
  const hasFile = file instanceof File && file.size > 0
  if (!id && !hasFile) return fail('Choose a setup file.')
  if (hasFile && file.size > 900 * 1024) return fail('Setup files must be under 900 KB.')

  const admin = createAdminClient()
  const values: Record<string, unknown> = {
    title,
    track: str(fd, 'track') || null,
    car: str(fd, 'car') || null,
    setup_type: str(fd, 'setup_type') || null,
    description: str(fd, 'description') || null,
    sort_order: Number(str(fd, 'sort_order')) || 0,
  }
  let oldPath: string | null = null
  if (hasFile) {
    const path = `${crypto.randomUUID()}_${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error } = await admin.storage.from('setups').upload(path, file, { contentType: file.type || 'application/octet-stream' })
    if (error) return fail(error.message)
    values.storage_path = path
    values.filename = file.name
    if (id) {
      const { data } = await admin.from('setups').select('storage_path').eq('id', id).maybeSingle()
      oldPath = data?.storage_path ?? null
    }
  }
  const { error } = id ? await admin.from('setups').update(values).eq('id', id) : await admin.from('setups').insert(values)
  if (error) {
    if (values.storage_path) await admin.storage.from('setups').remove([values.storage_path as string])
    return fail(error.message)
  }
  if (oldPath) await admin.storage.from('setups').remove([oldPath])
  revalidatePath('/setups')
  revalidatePath('/coach/library')
  return { ok: true }
}

export async function deleteSetup(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (viewer?.role !== 'admin') return
  const admin = createAdminClient()
  const id = str(fd, 'id')
  const { data } = await admin.from('setups').select('storage_path').eq('id', id).maybeSingle()
  await admin.from('setups').delete().eq('id', id)
  if (data?.storage_path) await admin.storage.from('setups').remove([data.storage_path])
  revalidatePath('/setups')
  revalidatePath('/coach/library')
}

export async function setupDownloadUrl(id: string): Promise<{ url: string } | { error: string }> {
  const viewer = await getViewer()
  if (!viewer || (viewer.role !== 'student' && !isStaff(viewer))) return { error: 'Academy members only.' }
  const admin = createAdminClient()
  const { data: setup } = await admin.from('setups').select('storage_path, filename').eq('id', id).maybeSingle()
  if (!setup?.storage_path) return { error: 'Setup not found.' }
  const { data, error } = await admin.storage.from('setups').createSignedUrl(setup.storage_path, 120, { download: setup.filename ?? true })
  if (error || !data) return { error: 'Could not create a download link.' }
  return { url: data.signedUrl }
}

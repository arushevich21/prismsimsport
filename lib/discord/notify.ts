import 'server-only'
import { SITE_URL } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'
import { COLORS, botEnabled, clip, discordEnv, postToChannel, sendDM, setMemberRole, timestamp, type MessagePayload } from './api'
import { postDiscordEmbed } from './webhook'

// What the site tells Discord. With a bot token configured these become DMs,
// channel posts and role changes; without one they fall back to the existing
// webhooks, so nothing breaks before the bot is set up.

async function discordIds(profileIds: string[]): Promise<string[]> {
  if (profileIds.length === 0) return []
  const { data } = await createAdminClient().from('profiles').select('discord_id').in('id', profileIds)
  return (data ?? []).map((p) => p.discord_id as string | null).filter((id): id is string => !!id)
}

// A student's coach, or every admin if they don't have one yet.
async function coachesOf(studentId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data: student } = await admin.from('students').select('coach_id').eq('profile_id', studentId).maybeSingle()
  if (student?.coach_id) return [student.coach_id as string]
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
  return (admins ?? []).map((a) => a.id as string)
}

const replyRow = (studentId: string, siteUrl: string): MessagePayload['components'] => [
  {
    type: 1,
    components: [
      { type: 2, style: 1, label: 'Reply', custom_id: `reply:${studentId}` },
      { type: 2, style: 5, label: 'Open on PRISM', url: siteUrl },
    ],
  },
]

async function dmAll(profileIds: string[], payload: MessagePayload) {
  const ids = await discordIds(profileIds)
  await Promise.all(ids.map((id) => sendDM(id, payload)))
  return ids.length > 0
}

export async function notifyCoachesOfMessage(studentId: string, studentName: string, text: string) {
  if (botEnabled()) {
    const sent = await dmAll(await coachesOf(studentId), {
      embeds: [{ title: `Message from ${clip(studentName, 200)}`, description: clip(text, 4000), color: COLORS.iris }],
      components: replyRow(studentId, `${SITE_URL}/coach/messages/${studentId}`),
    })
    if (sent) return
  }
  await postDiscordEmbed(process.env.DISCORD_QA_WEBHOOK_URL, {
    title: 'New message for a coach',
    fields: [
      { name: 'From', value: studentName, inline: true },
      { name: 'Message', value: text },
      { name: 'Reply', value: `${SITE_URL}/coach/messages/${studentId}` },
    ],
  })
}

export async function notifyStudentOfReply(studentId: string, coachName: string, text: string) {
  if (!botEnabled()) return
  await dmAll([studentId], {
    embeds: [{ title: `${clip(coachName, 200)} replied`, description: clip(text, 4000), color: COLORS.ice }],
    components: replyRow(studentId, `${SITE_URL}/messages`),
  })
}

export async function notifyNewApplication(name: string, fields: { name: string; value: string }[]) {
  const review = `${SITE_URL}/coach?tab=applications`
  if (botEnabled() && discordEnv.channels.staff) {
    const posted = await postToChannel(discordEnv.channels.staff, {
      embeds: [{ title: `New coaching application: ${clip(name, 200)}`, color: COLORS.ember, fields: fields.map((f) => ({ ...f, value: clip(f.value) })) }],
      components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Review on PRISM', url: review }] }],
    })
    if (posted) return
  }
  await postDiscordEmbed(process.env.DISCORD_WEBHOOK_URL, {
    title: 'New coaching application',
    fields: [{ name: 'Discord', value: name, inline: true }, ...fields, { name: 'Review', value: review }],
  })
}

export async function notifyTelemetry(studentId: string, studentName: string, filename: string, note: string) {
  const review = `${SITE_URL}/coach?tab=telemetry`
  if (botEnabled()) {
    const sent = await dmAll(await coachesOf(studentId), {
      embeds: [{
        title: `${clip(studentName, 200)} uploaded telemetry`,
        color: COLORS.ice,
        fields: [{ name: 'File', value: clip(filename) }, ...(note ? [{ name: 'Note', value: clip(note) }] : [])],
      }],
      components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Review on PRISM', url: review }] }],
    })
    if (sent) return
  }
  await postDiscordEmbed(process.env.DISCORD_QA_WEBHOOK_URL, {
    title: 'New telemetry upload',
    fields: [
      { name: 'From', value: studentName, inline: true },
      { name: 'File', value: filename, inline: true },
      ...(note ? [{ name: 'Note', value: note }] : []),
      { name: 'Review', value: review },
    ],
  })
}

export async function notifyBooking(coachId: string, who: string, minutes: number, startsAt: string, linked: boolean) {
  const queue = `${SITE_URL}/coach?tab=sessions`
  const fields = [
    { name: 'Student', value: clip(who), inline: true },
    { name: 'Length', value: `${minutes} min`, inline: true },
    { name: 'When', value: `${timestamp(startsAt)} (${timestamp(startsAt, 'R')})` },
    ...(linked ? [] : [{ name: 'Needs linking', value: 'Booked without a matching PRISM account. Link it in the coach queue.' }]),
  ]
  if (botEnabled()) {
    const sent = await dmAll([coachId], {
      embeds: [{ title: 'New coaching session booked', color: COLORS.ember, fields }],
      components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Open coach queue', url: queue }] }],
    })
    if (sent) return
  }
  await postDiscordEmbed(process.env.DISCORD_QA_WEBHOOK_URL, { title: 'New coaching session booked', fields: [...fields, { name: 'Queue', value: queue }] })
}

export async function onStudentApproved(studentId: string, coachName: string | null) {
  if (!botEnabled()) return
  const [id] = await discordIds([studentId])
  if (!id) return
  await setMemberRole(id, discordEnv.roles.academy, true)
  await sendDM(id, {
    embeds: [{
      title: 'Welcome to PRISM Academy',
      description: `You’re in${coachName ? `, and your coach is **${clip(coachName, 100)}**` : ''}. Book your first session, upload telemetry and message your coach from your dashboard.`,
      color: COLORS.ember,
    }],
    components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Open my dashboard', url: `${SITE_URL}/dashboard` }] }],
  })
}

export async function onStudentRemoved(studentId: string) {
  if (!botEnabled()) return
  const [id] = await discordIds([studentId])
  if (id) await setMemberRole(id, discordEnv.roles.academy, false)
}

export async function onCoachAdded(profileId: string) {
  if (!botEnabled()) return
  const [id] = await discordIds([profileId])
  if (id) await setMemberRole(id, discordEnv.roles.coach, true)
}

export async function notifyTeamReady(studentName: string, coachName: string) {
  if (!botEnabled() || !discordEnv.channels.captains) return
  await postToChannel(discordEnv.channels.captains, {
    embeds: [{
      title: `${clip(studentName, 200)} is team-ready`,
      description: `Flagged by ${clip(coachName, 100)} in PRISM Academy. Worth a tryout.`,
      color: COLORS.ember,
    }],
  })
}

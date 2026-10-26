import 'server-only'
import { PROGRAM_SHORT, type Program } from '@/lib/academy/constants'
import { SITE_URL } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  COLORS, botEnabled, clip, createPrivateChannel, discordEnv, makeReadOnlyFor, postToChannel, sendDM, setMemberRole, slugify, timestamp,
  type MessagePayload,
} from './api'
import { syncTeamRoles } from './roles'
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

// Approve (for a program) / Decline buttons for an application, handled by
// /api/discord/interactions (admins only), plus a link to the site's queue.
export const applicationButtons = (inquiryId: string): MessagePayload['components'] => [
  {
    type: 1,
    components: [
      { type: 2, style: 3, label: 'Approve for LMU', custom_id: `app:approve-lmu:${inquiryId}` },
      { type: 2, style: 3, label: 'Approve for ACC', custom_id: `app:approve-acc:${inquiryId}` },
      { type: 2, style: 1, label: 'Approve for both', custom_id: `app:approve-both:${inquiryId}` },
      { type: 2, style: 4, label: 'Decline', custom_id: `app:decline:${inquiryId}` },
      { type: 2, style: 5, label: 'Review on PRISM', url: `${SITE_URL}/coach?tab=applications` },
    ],
  },
]

const PROGRAM_ACCESS: Record<Program, string> = {
  lmu: 'the LMU Academy role and access to the team chat',
  acc: 'the ACC Academy role and access to the ACC / Falcon channel',
  both: 'the LMU and ACC Academy roles, with access to the team chat and the ACC / Falcon channel',
}

// Opens a private ticket channel for the applicant and coaches, posts their
// answers there, and remembers it on the application. Returns the channel ID.
async function openApplicationTicket(inquiryId: string, applicantId: string, name: string, fields: { name: string; value: string }[]) {
  if (!discordEnv.applicationsCategory) return null
  const [discordId] = await discordIds([applicantId])
  const channel = await createPrivateChannel(`application-${slugify(name)}`, {
    parentId: discordEnv.applicationsCategory,
    members: discordId ? [discordId] : [],
    roles: [discordEnv.roles.coach].filter((id): id is string => !!id),
    topic: `PRISM Academy application from ${name}`,
  })
  if (!channel) return null
  await postToChannel(channel.id, {
    content: discordId ? `<@${discordId}>, thanks for applying to PRISM Academy! A coach will review your application and reply here.` : `Application from **${clip(name, 200)}** (not in the server yet, so they can't see this channel).`,
    embeds: [{ title: 'Your application', color: COLORS.ember, fields: fields.map((f) => ({ ...f, value: clip(f.value) })) }],
    allowed_mentions: { users: discordId ? [discordId] : [] },
  })
  await postToChannel(channel.id, { content: '**For PRISM admins:**', components: applicationButtons(inquiryId) })
  await createAdminClient().from('inquiries').update({ discord_channel_id: channel.id }).eq('id', inquiryId)
  return channel.id
}

export async function notifyNewApplication(application: { inquiryId: string; applicantId: string; name: string }, fields: { name: string; value: string }[]) {
  const { name } = application
  const review = `${SITE_URL}/coach?tab=applications`
  if (botEnabled()) {
    const ticket = await openApplicationTicket(application.inquiryId, application.applicantId, name, fields)
    const posted = discordEnv.channels.staff && await postToChannel(discordEnv.channels.staff, {
      embeds: [{
        title: `New coaching application: ${clip(name, 200)}`,
        color: COLORS.ember,
        fields: [...fields.map((f) => ({ ...f, value: clip(f.value) })), ...(ticket ? [{ name: 'Ticket', value: `<#${ticket}>` }] : [])],
      }],
      components: applicationButtons(application.inquiryId),
    })
    if (posted || ticket) return
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

// Posts the decision in the applicant's ticket and leaves it read-only for
// them, so the history stays but the conversation moves on.
async function closeApplicationTicket(applicantId: string, discordId: string | undefined, message: string) {
  const { data } = await createAdminClient().from('inquiries').select('discord_channel_id').eq('user_id', applicantId).maybeSingle()
  const channel = data?.discord_channel_id as string | null | undefined
  if (!channel) return
  await postToChannel(channel, { content: discordId ? `<@${discordId}> ${message}` : message, allowed_mentions: { users: discordId ? [discordId] : [] } })
  if (discordId) await makeReadOnlyFor(channel, discordId)
}

export async function onApplicationDeclined(applicantId: string) {
  if (!botEnabled()) return
  const [id] = await discordIds([applicantId])
  await closeApplicationTicket(applicantId, id, 'Thanks for applying. We can’t offer you a spot in the academy right now, but you’re welcome to keep racing with the community and apply again later.')
}

export async function onStudentApproved(studentId: string, coachName: string | null, program: Program) {
  if (!botEnabled()) return
  const [id] = await discordIds([studentId])
  await closeApplicationTicket(
    studentId,
    id,
    `You’re in! Welcome to PRISM Academy (${PROGRAM_SHORT[program]})${coachName ? `. Your coach is **${clip(coachName, 100)}**` : ''}. You now have ${PROGRAM_ACCESS[program]}.`
  )
  if (!id) return
  await syncTeamRoles([studentId])
  await sendDM(id, {
    embeds: [{
      title: 'Welcome to PRISM Academy',
      description: `You’re in${coachName ? `, and your coach is **${clip(coachName, 100)}**` : ''}. Book your first session, upload telemetry and message your coach from your dashboard.`,
      color: COLORS.ember,
    }],
    components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Open my dashboard', url: `${SITE_URL}/dashboard` }] }],
  })
}

// An admin removed a student, or changed their program or tier (moving up to
// Driver swaps LMU / ACC Academy for LMU / ACC Driver).
export async function onStudentChanged(studentId: string) {
  await syncTeamRoles([studentId])
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

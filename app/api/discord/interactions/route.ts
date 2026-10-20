import { createPublicKey, verify } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { after, NextResponse } from 'next/server'
import { approveInquiry, declineInquiry } from '@/lib/academy/decisions'
import { personName } from '@/lib/academy/queries'
import { notifyCoachesOfMessage, notifyStudentOfReply } from '@/lib/discord/notify'
import { createAdminClient } from '@/lib/supabase/admin'

// Discord → PRISM. Set as the "Interactions Endpoint URL" of the Discord app:
// https://www.prismsimsport.app/api/discord/interactions
// Handles the Reply button on coaching DMs (the button opens a text box, and
// what's typed there is saved to the on-site chat) and the Approve / Decline
// buttons on academy applications.

const PING = 1
const MESSAGE_COMPONENT = 3
const MODAL_SUBMIT = 5
const EPHEMERAL = 64
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Interaction = {
  type: number
  data?: { custom_id?: string; components?: { components?: { custom_id?: string; value?: string }[] }[] }
  user?: { id: string }
  member?: { user?: { id: string } }
}

function verifySignature(raw: string, signature: string | null, ts: string | null) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY
  if (!publicKey || !signature || !ts || !/^[0-9a-f]{64}$/i.test(publicKey)) return false
  try {
    // Wrap the raw 32-byte Ed25519 key in an SPKI header so Node can read it.
    const key = createPublicKey({
      key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKey, 'hex')]),
      format: 'der',
      type: 'spki',
    })
    return verify(null, Buffer.from(ts + raw), key, Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

const reply = (content: string) => NextResponse.json({ type: 4, data: { content, flags: EPHEMERAL } })

// The PRISM account behind a Discord user, if they've signed in to the site.
async function accountFor(interaction: Interaction) {
  const discordUserId = interaction.member?.user?.id ?? interaction.user?.id
  if (!discordUserId) return null
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id, role, display_name, discord_username, avatar_url')
    .eq('discord_id', discordUserId)
    .maybeSingle()
  return data
}

// Approve / Decline on an application. Admins only, like the coach queue.
// Approving makes the admin who clicked the student's coach (if they coach),
// on the default tier; both can be changed on the site.
async function decideApplication(interaction: Interaction, action: string, inquiryId: string) {
  const sender = await accountFor(interaction)
  if (!sender) return reply('Sign in to prismsimsport.app with this Discord account first.')
  if (sender.role !== 'admin') return reply('Only PRISM admins can approve or decline applications.')

  let result
  if (action === 'approve') {
    const { data: coach } = await createAdminClient().from('coaches').select('profile_id').eq('profile_id', sender.id).maybeSingle()
    result = await approveInquiry(inquiryId, coach ? sender.id : null, 'student')
  } else {
    result = await declineInquiry(inquiryId)
  }
  if (!result.ok) {
    return reply(result.reason === 'already-decided' ? `This application was already ${result.status}.` : 'That application no longer exists.')
  }
  revalidatePath('/coach', 'layout')

  // Swap the buttons for who decided, so nobody clicks twice.
  const who = personName(sender)
  return NextResponse.json({
    type: 7, // update the message the button was on
    data: {
      content: action === 'approve'
        ? `✅ Approved by ${who}. They get the Academy role and access to the team chat. Change their coach or tier on PRISM.`
        : `❌ Declined by ${who}.`,
      components: [],
    },
  })
}

export async function POST(request: Request) {
  const raw = await request.text()
  if (!verifySignature(raw, request.headers.get('x-signature-ed25519'), request.headers.get('x-signature-timestamp'))) {
    return new NextResponse('Bad signature', { status: 401 })
  }
  const interaction = JSON.parse(raw) as Interaction

  if (interaction.type === PING) return NextResponse.json({ type: 1 })

  const customId = interaction.data?.custom_id ?? ''
  const decision = /^app:(approve|decline):([\w-]{1,64})$/.exec(customId)
  if (decision && interaction.type === MESSAGE_COMPONENT) return decideApplication(interaction, decision[1]!, decision[2]!)

  const studentId = customId.startsWith('reply:') ? customId.slice(6) : ''
  if (!UUID.test(studentId)) return reply('That button has expired.')

  // Button click → open a text box.
  if (interaction.type === MESSAGE_COMPONENT) {
    return NextResponse.json({
      type: 9,
      data: {
        custom_id: `reply:${studentId}`,
        title: 'Reply on PRISM',
        components: [{
          type: 1,
          components: [{ type: 4, custom_id: 'body', label: 'Message', style: 2, min_length: 1, max_length: 2000, required: true }],
        }],
      },
    })
  }

  if (interaction.type !== MODAL_SUBMIT) return reply('Not supported.')

  const body = interaction.data?.components?.[0]?.components?.find((c) => c.custom_id === 'body')?.value?.trim() ?? ''
  if (!body) return reply('Your message was empty.')

  // Who clicked, as a PRISM account.
  const admin = createAdminClient()
  const sender = await accountFor(interaction)
  if (!sender) return reply('Sign in to prismsimsport.app with this Discord account first.')

  let allowed = sender.id === studentId || sender.role === 'admin'
  if (!allowed) {
    const { data: student } = await admin.from('students').select('coach_id').eq('profile_id', studentId).maybeSingle()
    allowed = student?.coach_id === sender.id
  }
  if (!allowed) return reply('You can’t reply to this conversation.')

  const { error } = await admin.from('messages').insert({ student_id: studentId, sender_id: sender.id, body, source: 'discord' })
  if (error) return reply('Couldn’t send that. Please try again on the site.')

  // Tell the other side after responding (Discord wants an answer within 3s).
  const senderName = personName(sender)
  after(async () => {
    if (sender.id === studentId) await notifyCoachesOfMessage(studentId, senderName, body)
    else await notifyStudentOfReply(studentId, senderName, body)
  })

  return reply('Sent ✓ It’s in the chat on PRISM too.')
}

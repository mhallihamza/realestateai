import { prisma } from '@/lib/prisma'
import type { Lead, MessageResult, WhatsAppInboundPayload, WhatsAppStatusPayload, WhatsAppButton, WhatsAppListSection } from '@/types'

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER

function getTwilioClient() {
  if (!twilioAccountSid || !twilioAuthToken) {
    throw new Error('Twilio credentials not configured')
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require('twilio')
  return twilio(twilioAccountSid, twilioAuthToken)
}

export async function sendWhatsAppText(lead: Lead, body: string): Promise<MessageResult> {
  try {
    const client = getTwilioClient()
    const to = `whatsapp:${lead.phone}`
    const from = `whatsapp:${twilioWhatsAppNumber}`

    const message = await client.messages.create({ from, to, body })

    // Log to WhatsAppMessage model
    await prisma.whatsAppMessage.create({
      data: {
        workspaceId: lead.workspaceId,
        leadId: lead.id,
        direction: 'outbound',
        body,
        status: 'sent',
        twilioSid: message.sid,
      },
    })

    return {
      success: true,
      externalId: message.sid,
      status: 'sent',
      channel: 'whatsapp',
    }
  } catch (error: any) {
    console.error('[WHATSAPP_SEND_ERROR]', error)
    return {
      success: false,
      status: 'failed',
      error: error.message || 'WhatsApp send failed',
      channel: 'whatsapp',
    }
  }
}

export async function sendWhatsAppTemplate(
  lead: Lead,
  templateName: string,
  variables: Record<string, string>
): Promise<MessageResult> {
  try {
    const client = getTwilioClient()
    const to = `whatsapp:${lead.phone}`
    const from = `whatsapp:${twilioWhatsAppNumber}`

    const contentVariables: Record<string, string> = {}
    Object.entries(variables).forEach(([key, value], index) => {
      contentVariables[`${index + 1}`] = value
    })

    const message = await client.messages.create({
      from,
      to,
      contentSid: templateName,
      contentVariables: JSON.stringify(contentVariables),
    })

    await prisma.whatsAppMessage.create({
      data: {
        workspaceId: lead.workspaceId,
        leadId: lead.id,
        direction: 'outbound',
        body: `Template: ${templateName}`,
        status: 'sent',
        twilioSid: message.sid,
      },
    })

    return {
      success: true,
      externalId: message.sid,
      status: 'sent',
      channel: 'whatsapp',
    }
  } catch (error: any) {
    console.error('[WHATSAPP_TEMPLATE_ERROR]', error)
    return {
      success: false,
      status: 'failed',
      error: error.message,
      channel: 'whatsapp',
    }
  }
}

export async function handleWhatsAppInbound(payload: WhatsAppInboundPayload): Promise<{ leadId: string; message: string; workspaceId: string } | null> {
  try {
    const phone = payload.from.replace('whatsapp:', '').trim()
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`

    // Find lead by phone number
    let lead = await prisma.lead.findFirst({
      where: { phone: normalizedPhone },
      include: { workspace: true },
    })

    // Auto-create lead if not found
    if (!lead) {
      console.log(`[WHATSAPP_INBOUND] No lead found for phone: ${normalizedPhone}, creating new lead...`)

      const workspace = await prisma.workspace.findFirst()

      if (!workspace) {
        console.error('[WHATSAPP_INBOUND] No workspace found — complete onboarding first')
        return null
      }

      // Get any user in the workspace to satisfy required userId
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: workspace.id },
      })

      if (!member) {
        console.error('[WHATSAPP_INBOUND] No workspace member found')
        return null
      }

      const createdLead = await prisma.lead.create({
        data: {
          workspaceId: workspace.id,
          userId: member.userId,
          name: payload.profileName || `WhatsApp ${normalizedPhone}`,
          phone: normalizedPhone,
          email: `${normalizedPhone.replace('+', '')}@whatsapp.placeholder`,
          status: 'New',
          aiAgentActive: true,
        },
      })

      // Re-fetch with workspace included to match type
      lead = await prisma.lead.findUnique({
        where: { id: createdLead.id },
        include: { workspace: true },
      })

      if (!lead) {
        console.error('[WHATSAPP_INBOUND] Failed to fetch created lead')
        return null
      }

      console.log(`[WHATSAPP_INBOUND] New lead created: ${lead.id} (${lead.name})`)
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        leadId: lead.id,
        channel: 'whatsapp',
        status: { in: ['active', 'paused'] },
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId: lead.workspaceId,
          leadId: lead.id,
          channel: 'whatsapp',
          status: 'active',
        },
      })
    }

    // Log inbound message to conversation
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: payload.body,
        channel: 'whatsapp',
        externalId: payload.messageId,
      },
    })

    // Log to WhatsAppMessage table
    await prisma.whatsAppMessage.create({
      data: {
        workspaceId: lead.workspaceId,
        leadId: lead.id,
        conversationId: conversation.id,
        direction: 'inbound',
        body: payload.body,
        twilioSid: payload.messageId,
        status: 'received',
      },
    })

    // Record engagement event
    await prisma.engagementEvent.create({
      data: {
        leadId: lead.id,
        type: 'whatsapp_replied',
        channel: 'whatsapp',
        value: 40,
      },
    })

    return {
      leadId: lead.id,
      message: payload.body,
      workspaceId: lead.workspaceId,
    }
  } catch (error) {
    console.error('[WHATSAPP_INBOUND_ERROR]', error)
    return null
  }
}
export async function handleWhatsAppStatus(payload: WhatsAppStatusPayload): Promise<void> {
  try {
    const message = await prisma.whatsAppMessage.findUnique({
      where: { twilioSid: payload.messageId },
    })

    if (!message) return

    const updates: any = { status: payload.status }
    if (payload.status === 'delivered') updates.deliveredAt = new Date()
    if (payload.status === 'read') updates.readAt = new Date()

    await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: updates,
    })
  } catch (error) {
    console.error('[WHATSAPP_STATUS_ERROR]', error)
  }
}

export function verifyWhatsAppWebhook(req: Request): boolean {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return true
  }
  return false
}
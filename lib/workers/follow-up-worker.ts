import { prisma } from '@/lib/prisma'
import { getMemoryContext } from '@/lib/memory/extractor'
import { dispatchMessage } from '@/lib/channels/dispatcher'
import type { Lead, Channel } from '@/types'

export async function processFollowUpJob(payload: Record<string, unknown>): Promise<void> {
  const { leadId, workspaceId, sequenceType, channel } = payload as any

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead || lead.humanTookOver || !lead.aiAgentActive) return

  const config = await prisma.agentConfig.findUnique({ where: { workspaceId } })
  if (!config) return

  const memoryContext = await getMemoryContext(leadId)

  // Generate follow-up message based on context
  const followUpMessage = generateFollowUpMessage(sequenceType, lead, memoryContext)

  const result = await dispatchMessage(
    lead as unknown as Lead,
    (channel as Channel) || 'email',
    followUpMessage.body,
    { subject: followUpMessage.subject }
  )

  // Log the follow-up
  await prisma.followUp.create({
    data: {
      workspaceId,
      leadId: lead.id,
      sequenceNumber: 0,
      subject: followUpMessage.subject,
      body: followUpMessage.body,
      channel: channel || 'email',
      status: 'sent',
      sentAt: new Date(),
      aiGenerated: true,
      approved: true,
    },
  })
}

function generateFollowUpMessage(sequenceType: string, lead: any, memoryContext: string): { subject: string; body: string } {
  const name = lead.name?.split(' ')[0] || 'there'

  switch (sequenceType) {
    case '24h_nudge':
      return {
        subject: `Following up, ${name}`,
        body: `Hi ${name},\n\nI wanted to follow up on my previous message. I'd love to help you find the perfect property. Do you have any questions I can answer?\n\nBest regards,\nYour AI Agent`,
      }

    case '72h_followup':
      return {
        subject: `Still thinking, ${name}?`,
        body: `Hi ${name},\n\nJust checking in! I know finding the right property takes time. If you'd like, I can share some new listings that match your preferences.\n\nLet me know if you're still looking!\n\nBest regards,\nYour AI Agent`,
      }

    default:
      return {
        subject: `Thinking of you, ${name}`,
        body: `Hi ${name},\n\nI hope you're doing well! Just wanted to touch base and see if you're still in the market for a property.\n\nHappy to help whenever you're ready.\n\nBest regards,\nYour AI Agent`,
      }
  }
}
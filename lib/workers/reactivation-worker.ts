import { prisma } from '@/lib/prisma'
import { getMemoryContext } from '@/lib/memory/extractor'
import { dispatchMessage } from '@/lib/channels/dispatcher'
import type { Lead, Channel } from '@/types'

export async function processReactivationJob(payload: Record<string, unknown>): Promise<void> {
  const { leadId, workspaceId } = payload as any

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead || lead.humanTookOver || !lead.aiAgentActive) return

  const memoryContext = await getMemoryContext(leadId)

  const name = lead.name?.split(' ')[0] || 'there'
  const channel = lead.phone ? 'whatsapp' : 'email'

  const body = `Hi ${name},\n\nIt's been a while! I wanted to check in and see if you're still looking for a property. We've got some new listings that might interest you.\n\nWould you like me to send you some options?\n\nBest regards,\nYour AI Agent`

  const result = await dispatchMessage(lead as unknown as Lead, channel as Channel, body, {
    subject: `Still looking, ${name}?`,
  })

  // Log reactivation attempt
  await prisma.followUp.create({
    data: {
      workspaceId,
      leadId: lead.id,
      sequenceNumber: 0,
      subject: `Reactivation: ${name}`,
      body,
      channel,
      status: 'sent',
      sentAt: new Date(),
      aiGenerated: true,
      approved: true,
    },
  })

  // Track ROI event
  await prisma.rOIEvent.create({
    data: {
      workspaceId,
      leadId: lead.id,
      type: 'lead_reactivated',
      aiInfluenced: true,
      metadata: JSON.stringify({ reactivationAttempt: true }),
    },
  })
}
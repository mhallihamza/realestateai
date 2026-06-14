import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { generateHandoffPackage } from '@/lib/agent'
import type { Lead, HandoffPackage } from '@/types'

export async function processHandoffNotifyJob(payload: Record<string, unknown>): Promise<void> {
  const { workspaceId, leadId, message, urgency } = payload as any

  // Get lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      conversations: {
        include: { messages: { orderBy: { sentAt: 'asc' }, take: 50 } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!lead) throw new Error(`Lead not found: ${leadId}`)

  // Get workspace members to notify
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: { in: ['owner', 'admin', 'agent'] } },
    include: { user: true },
  })

  // Generate handoff package
  const conversationMessages = lead.conversations[0]?.messages || []
  const handoffPackage = await generateHandoffPackage(
    lead as unknown as Lead,
    conversationMessages as any,
    lead.score
  )

  // Create handoff record if not exists
  const existingHandoff = await prisma.humanHandoff.findFirst({
    where: { leadId, status: { in: ['pending', 'notified'] } },
  })

  if (!existingHandoff) {
    await prisma.humanHandoff.create({
      data: {
        workspaceId,
        leadId: lead.id,
        reason: message || 'Score threshold triggered',
        aiSummary: handoffPackage.agentSummary,
        intent: handoffPackage.intent,
        budget: handoffPackage.budget,
        objections: Array.isArray(handoffPackage.objections) ? handoffPackage.objections.join(', ') : handoffPackage.objections,
        recommended: handoffPackage.recommendedReply,
        status: 'pending',
      },
    })
  }

  // Notify each member
  for (const member of members) {
    await createNotification({
      workspaceId,
      userId: member.userId,
      leadId: lead.id,
      type: 'handoff',
      title: `🤝 Handoff: ${lead.name} needs human agent`,
      message: `${lead.name} - Score: ${lead.score} | Intent: ${handoffPackage.intent} | Budget: ${handoffPackage.budget} | ${handoffPackage.agentSummary}`,
      channel: urgency === 'high' ? 'email' : 'in_app',
      metadata: {
        leadId: lead.id,
        handoffPackage,
        urgency,
      },
    })
  }

  // Update lead status
  await prisma.lead.update({
    where: { id: lead.id },
    data: { humanTookOver: false, aiAgentActive: true },
  })
}
import { prisma } from '@/lib/prisma'
import { runAgentTurn, getOrCreateConversation, appendMessage } from '@/lib/agent'
import { getMemoryContext } from '@/lib/memory/extractor'
import { dispatchMessage } from '@/lib/channels/dispatcher'
import { createNotification } from '@/lib/notifications'
import { evaluateAfterScoreUpdate } from '@/lib/decision-engine'
import { enqueueJob } from '@/lib/queue'
import type { Lead, Conversation, AgentConfig, Channel, WritingTone } from '@/types'

export async function processAIReplyJob(payload: Record<string, unknown>): Promise<void> {
  const { leadId, workspaceId, channel, inboundMessage, isFirstContact } = payload as any

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new Error(`Lead not found: ${leadId}`)

  if (lead.humanTookOver || !lead.aiAgentActive) return

  const config = await prisma.agentConfig.findUnique({ where: { workspaceId } })
  if (!config) throw new Error(`Agent config not found: ${workspaceId}`)

  const conversation = await getOrCreateConversation(leadId, workspaceId, channel as Channel)

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { sentAt: 'asc' },
  })

  // Inject memory context
  const memoryContext = await getMemoryContext(leadId)

  const typedLead = lead as unknown as Lead
  const typedConversation = conversation as unknown as Conversation
  const typedConfig = config as unknown as AgentConfig

  const decision = await runAgentTurn(
    {
      lead: typedLead,
      conversation: typedConversation,
      messages: messages as any,
      config: typedConfig,
      workspaceId,
      memoryContext,
    },
    inboundMessage || ''
  )

  const startTime = Date.now()

  // Log AI decision
  await prisma.aIDecisionLog.create({
    data: {
      workspaceId,
      leadId: lead.id,
      action: decision.action,
      trigger: isFirstContact ? 'lead_created' : 'lead_replied',
      decisionType: 'ai_generated',
      inputContext: JSON.stringify({ messageCount: messages.length, hasMemory: !!memoryContext }),
      outputDecision: JSON.stringify(decision),
      latencyMs: Date.now() - startTime,
    },
  })

  if (decision.action === 'reply' && decision.reply) {
    // Save AI reply to conversation
    await appendMessage(conversation.id, 'assistant', decision.reply, channel as Channel)

    // Send via appropriate channel
    const result = await dispatchMessage(typedLead, decision.channel as Channel || channel as Channel, decision.reply, {
      subject: `Re: ${lead.name}'s inquiry`,
    })

    // Update lead fields
    const updates: any = {
      lastContactedAt: new Date(),
      lastActivityAt: new Date(),
    }
    if (decision.updatedFields) {
      if (decision.updatedFields.intent) updates.intent = decision.updatedFields.intent
      if (decision.updatedFields.urgency) updates.urgency = decision.updatedFields.urgency
      if (decision.updatedFields.qualificationStage) updates.qualificationStage = decision.updatedFields.qualificationStage
      if (decision.updatedFields.budget) updates.budget = decision.updatedFields.budget
      if (decision.updatedFields.propertyType) updates.propertyType = decision.updatedFields.propertyType
      if (decision.updatedFields.locationPreference) updates.locationPreference = decision.updatedFields.locationPreference
      if (decision.updatedFields.timeline) updates.timeline = decision.updatedFields.timeline
    }
    if (decision.scoreAdjustment) {
      updates.score = { increment: decision.scoreAdjustment }
    }

    await prisma.lead.update({ where: { id: lead.id }, data: updates })

    // Enqueue memory extraction
    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { sentAt: 'asc' },
      take: 20,
    })

    await enqueueJob({
      workspaceId,
      type: 'memory_extraction',
      payload: {
        workspaceId,
        leadId: lead.id,
        conversationId: conversation.id,
        messages: recentMessages.map(m => ({ role: m.role, content: m.content })),
      },
      priority: 3,
    })

    // Sync to CRM
    if (lead.crmId || lead.crmSource) {
      await enqueueJob({
        workspaceId,
        type: 'crm_sync',
        payload: { leadId: lead.id, workspaceId, syncType: 'update' },
        priority: 4,
      })
    }
  }

  if (decision.action === 'handoff') {
    await prisma.humanHandoff.create({
      data: {
        workspaceId,
        leadId: lead.id,
        reason: decision.handoffReason || 'AI-initiated handoff',
        aiSummary: decision.reasoning || 'AI determined handoff needed',
        intent: decision.updatedFields?.intent || lead.intent,
        budget: decision.updatedFields?.budget || lead.budget,
        status: 'pending',
      },
    })

    await createNotification({
      workspaceId,
      leadId: lead.id,
      type: 'handoff',
      title: `Handoff Needed: ${lead.name}`,
      message: decision.handoffReason || `AI recommends human agent take over for ${lead.name}`,
      metadata: { leadId: lead.id, handoffReason: decision.handoffReason },
    })
  }

  if (decision.action === 'mark_hot') {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'Hot', score: { increment: decision.scoreAdjustment || 10 } },
    })

    await createNotification({
      workspaceId,
      leadId: lead.id,
      type: 'hot_lead',
      title: `🔥 Hot Lead: ${lead.name}`,
      message: `${lead.name} scored HOT. Intent: ${decision.updatedFields?.intent || lead.intent}. Take action now.`,
      metadata: { leadId: lead.id, score: lead.score + (decision.scoreAdjustment || 10) },
    })
  }
}
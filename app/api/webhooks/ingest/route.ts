import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAgentTurn, getOrCreateConversation, appendMessage } from '@/lib/agent'
import { LeadSource, Channel, LeadStatus, QualificationStage, WritingTone, Lead, Conversation, AgentConfig } from '@/types'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { searchParams } = new URL(req.url)
    
    const workspaceId = searchParams.get('workspaceId')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing required workspaceId identification parameter.' }, { status: 400 })
    }

    const name = body.name || 'Unknown Lead'
    const email = body.email
    const phone = body.phone || null
    const messageContent = body.message || ''
    
    const source = (body.source || 'Website') as LeadSource
    const channel = (body.channel || 'email') as Channel

    if (!email) {
      return NextResponse.json({ error: 'Email indicator field missing from incoming structural payload.' }, { status: 400 })
    }

    const config = await prisma.agentConfig.findFirst({
      where: { workspaceId }
    })

    if (!config) {
      return NextResponse.json({ error: 'Workspace agent configuration profile not established yet.' }, { status: 404 })
    }

    let lead = await prisma.lead.findFirst({
      where: { workspaceId, email }
    })

    if (!lead) {
      // Find a member belonging to this specific workspace
      const defaultMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId }
      })

      let assignedUserId: string

      if (defaultMember) {
        assignedUserId = defaultMember.userId
      } else {
        // Fallback: If no workspace member exists yet, grab ANY user row in the database to prevent a Prisma crash
        const globalFallbackUser = await prisma.user.findFirst()
        if (!globalFallbackUser) {
          return NextResponse.json({ error: 'No active system users exist in the database yet. Run seed script first.' }, { status: 400 })
        }
        assignedUserId = globalFallbackUser.id
      }

      lead = await prisma.lead.create({
        data: {
          workspaceId,
          userId: assignedUserId, // Guaranteed to be a strict string now
          name,
          email,
          phone,
          source,
          channel,
          status: 'New' as LeadStatus,
          qualificationStage: 'unqualified' as QualificationStage,
          score: 0,
          aiAgentActive: true,
          humanTookOver: false,
        }
      })
    }

    const conversation = await getOrCreateConversation(lead.id, workspaceId, channel)
    
    if (messageContent.trim().length > 0) {
      await appendMessage(conversation.id, 'user', messageContent, channel)
    }

    const freshMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { sentAt: 'asc' }
    })

    const typedLead = {
      ...lead,
      source: lead.source as LeadSource,
      channel: lead.channel as Channel,
      status: lead.status as LeadStatus,
      qualificationStage: lead.qualificationStage as QualificationStage,
    } as unknown as Lead

    const typedConversation = {
      ...conversation,
      channel: conversation.channel as Channel,
    } as unknown as Conversation

    const typedConfig = {
      ...config,
      tone: config.tone as WritingTone,
    } as unknown as AgentConfig

    const agentDecision = await runAgentTurn({
      lead: typedLead,
      conversation: typedConversation,
      messages: freshMessages as any,
      config: typedConfig,
      workspaceId
    }, messageContent)

    const fields = agentDecision.updatedFields || {}
    const prismaUpdateData: any = {}

    if (fields.intent) prismaUpdateData.intent = fields.intent
    if (fields.urgency) prismaUpdateData.urgency = fields.urgency
    if (fields.qualificationStage) prismaUpdateData.qualificationStage = fields.qualificationStage
    if (fields.budget) prismaUpdateData.budget = fields.budget
    if (fields.propertyType) prismaUpdateData.propertyType = fields.propertyType
    if (fields.locationPreference) prismaUpdateData.locationPreference = fields.locationPreference
    if (fields.timeline) prismaUpdateData.timeline = fields.timeline

    if (agentDecision.action === 'reply' && agentDecision.reply) {
      await appendMessage(conversation.id, 'assistant', agentDecision.reply, channel)
      
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          ...prismaUpdateData,
          lastContactedAt: new Date(),
        }
      })

      return NextResponse.json({ 
        status: 'processed', 
        decision: 'reply_sent',
        reply: agentDecision.reply 
      })
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: prismaUpdateData
    })

    return NextResponse.json({ 
      status: 'processed', 
      decision: agentDecision.action, 
      reasoning: agentDecision.reasoning 
    })

  } catch (error) {
    console.error('❌ Inbound Webhook Processing Failure:', error)
    return NextResponse.json({ error: 'Internal system automation pipeline processing failure.' }, { status: 500 })
  }
}
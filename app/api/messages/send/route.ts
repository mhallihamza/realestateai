import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dispatchMessage } from '@/lib/channels/dispatcher'
import { appendMessage, getOrCreateConversation } from '@/lib/agent'
import type { Channel } from '@/types'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = (session.user as any).workspaceId

  try {
    const body = await req.json()
    const { leadId, channel, content, subject } = body

    if (!leadId || !channel || !content) {
      return NextResponse.json({ error: 'Missing required fields: leadId, channel, content' }, { status: 400 })
    }

    // Verify lead belongs to workspace
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, workspaceId },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(leadId, workspaceId, channel as Channel)

    // Save message
    await appendMessage(conversation.id, 'assistant', content, channel as Channel)

    // Send via channel
    const result = await dispatchMessage(
      lead as any,
      channel as Channel,
      content,
      { subject }
    )

    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastContactedAt: new Date(), lastActivityAt: new Date() },
    })

    return NextResponse.json({
      success: result.success,
      messageId: result.externalId,
      status: result.status,
    })
  } catch (error: any) {
    console.error('[MESSAGE_SEND_ERROR]', error)
    return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 })
  }
}
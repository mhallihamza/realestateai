import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, assertLeadAccess } from '@/lib/workspace-auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { ctx, error } = await requireSession()
  if (error) return error

  const { id } = await params
  const lead = await assertLeadAccess(id, ctx!.workspaceId)
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const conversations = await prisma.conversation.findMany({
    where: { leadId: id, workspaceId: ctx!.workspaceId },
    include: {
      messages: { orderBy: { sentAt: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const memory = await prisma.memoryEntry.findMany({
    where: { leadId: id },
    orderBy: { confidence: 'desc' },
    take: 20,
  })

  const handoff = await prisma.humanHandoff.findFirst({
    where: { leadId: id, status: { in: ['pending', 'notified', 'accepted'] } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ conversations, memory, handoff, lead })
}

export async function POST(req: Request, { params }: Params) {
  const { ctx, error } = await requireSession()
  if (error) return error

  const { id } = await params
  const lead = await assertLeadAccess(id, ctx!.workspaceId)
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const body = await req.json()
  const { content, channel = 'email' } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
  }

  let conversation = await prisma.conversation.findFirst({
    where: { leadId: id, channel, status: { in: ['active', 'paused', 'handed_off'] } },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { leadId: id, workspaceId: ctx!.workspaceId, channel, status: 'active' },
    })
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'assistant',
      content: content.trim(),
      channel,
    },
  })

  await prisma.lead.update({
    where: { id },
    data: { lastContactedAt: new Date(), lastActivityAt: new Date() },
  })

  return NextResponse.json({ message }, { status: 201 })
}

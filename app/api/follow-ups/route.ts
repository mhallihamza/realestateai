import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { generateFollowUpPrompt, parseFollowUps } from '@/lib/prompts'
import type { WritingTone } from '@/types'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const workspaceId = (session.user as any).workspaceId

  try {
    const body = await req.json()
    const { leadId, tone = 'professional' } = body

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, workspaceId },
      include: { user: { select: { name: true, writingTone: true } } },
    })

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const prompt = generateFollowUpPrompt({
      leadName: lead.name,
      leadEmail: lead.email,
      source: lead.source,
      propertyType: lead.propertyType,
      budget: lead.budget,
      locationPreference: lead.locationPreference,
      notes: lead.notes,
      agentTone: (tone as WritingTone) || lead.user.writingTone as WritingTone,
      agentName: lead.user.name,
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const raw = completion.choices[0]?.message?.content || '[]'
    const messages = parseFollowUps(raw)

    if (messages.length === 0) {
      return NextResponse.json({ error: 'AI failed to generate follow-ups. Please try again.' }, { status: 500 })
    }

    await prisma.followUp.deleteMany({ where: { leadId } })

    const followUps = await prisma.followUp.createMany({
      data: messages.map((msg) => ({
        workspaceId,
        leadId,
        sequenceNumber: msg.sequenceNumber,
        subject: msg.subject,
        body: msg.body,
        sendAfterDays: msg.sendAfterDays,
        channel: msg.channel || 'email',
        status: 'draft',
        approved: false,
      })),
    })

    const saved = await prisma.followUp.findMany({
      where: { leadId },
      orderBy: { sequenceNumber: 'asc' },
    })

    return NextResponse.json({ followUps: saved, count: followUps.count })
  } catch (error) {
    console.error('[FOLLOW-UPS POST]', error)
    return NextResponse.json({ error: 'Failed to generate follow-ups' }, { status: 500 })
  }
}

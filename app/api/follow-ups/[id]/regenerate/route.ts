import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import type { WritingTone } from '@/types'

const timingLabels: Record<number, string> = {
  0: 'immediately after the lead contacted you',
  2: '2 days after their initial inquiry',
  5: '5 days after their inquiry',
  10: '10 days after their inquiry',
  21: '3 weeks after their inquiry as a final follow-up',
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  const followUp = await prisma.followUp.findFirst({
    where: { id },
    include: {
      lead: {
        include: { user: { select: { name: true, writingTone: true } } },
      },
    },
  })

  if (!followUp || followUp.lead.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const tone = (body.tone || followUp.lead.user.writingTone) as WritingTone
  const lead = followUp.lead
  const timing = timingLabels[followUp.sendAfterDays] || `${followUp.sendAfterDays} days after inquiry`

  const toneGuide: Record<string, string> = {
    professional: 'formal, polished, and business-like while remaining warm',
    friendly: 'warm, approachable, and conversational',
    casual: 'relaxed, natural, and like a friend',
  }

  const prompt = `Write a single real estate follow-up email. Tone: ${toneGuide[tone] || toneGuide.professional}.

Lead: ${lead.name} (${lead.email})
Source: ${lead.source}
Property: ${lead.propertyType || 'not specified'}
Budget: ${lead.budget || 'not specified'}
Location: ${lead.locationPreference || 'not specified'}
Notes: ${lead.notes || 'none'}
Agent: ${lead.user.name || 'Agent'}
Timing: Send ${timing}

Rules: SHORT (3-5 sentences), human, not robotic, focus on booking a viewing.

Return ONLY valid JSON (no markdown):
{"subject": "...", "body": "..."}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 400,
    })

    const raw = completion.choices[0]?.message?.content || ''
    const cleaned = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(cleaned)

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        subject: parsed.subject,
        body: parsed.body,
        approved: false,
      },
    })

    return NextResponse.json({ followUp: updated })
  } catch (error) {
    console.error('[REGENERATE]', error)
    return NextResponse.json({ error: 'Failed to regenerate' }, { status: 500 })
  }
}

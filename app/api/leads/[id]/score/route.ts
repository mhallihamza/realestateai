import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateLeadScore, isHotLead } from '@/lib/scoring'
import type { EmailEvent } from '@/types'

interface Params {
  params: { id: string }
}

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, userId },
    include: { emailEvents: true },
  })

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const score = calculateLeadScore(lead.emailEvents as EmailEvent[])
  const shouldBeHot = isHotLead(score)

  const updatedLead = await prisma.lead.update({
    where: { id: params.id },
    data: {
      score,
      ...(shouldBeHot && lead.status !== 'Closed' ? { status: 'Hot' } : {}),
    },
  })

  return NextResponse.json({ score, isHot: shouldBeHot, lead: updatedLead })
}

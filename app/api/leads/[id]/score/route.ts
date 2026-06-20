import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateLeadScore, isHotLead } from '@/lib/scoring'
import type { EmailEvent } from '@/types'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = (session.user as { id: string; workspaceId: string }).workspaceId

  const lead = await prisma.lead.findFirst({
    where: { id, workspaceId },
    include: { emailEvents: true },
  })

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const score = calculateLeadScore(lead.emailEvents as EmailEvent[])
  const shouldBeHot = isHotLead(score)

  const updatedLead = await prisma.lead.update({
    where: { id },
    data: {
      score,
      ...(shouldBeHot && lead.status !== 'Closed' ? { status: 'Hot' } : {}),
    },
  })

  return NextResponse.json({ score, isHot: shouldBeHot, lead: updatedLead })
}

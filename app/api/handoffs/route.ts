import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = (session.user as any).workspaceId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const where: any = { workspaceId }
  if (status) where.status = status

  const handoffs = await prisma.humanHandoff.findMany({
    where,
    include: {
      lead: {
        select: { id: true, name: true, email: true, phone: true, score: true, intent: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(handoffs)
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = (session.user as any).workspaceId
  const body = await req.json()
  const { handoffId, action } = body

  if (!handoffId || !action) {
    return NextResponse.json({ error: 'Missing handoffId or action' }, { status: 400 })
  }

  try {
    switch (action) {
      case 'accept': {
        const handoff = await prisma.humanHandoff.findFirst({
          where: { id: handoffId, workspaceId },
        })
        if (!handoff) return NextResponse.json({ error: 'Handoff not found' }, { status: 404 })

        const userId = (session.user as any).id
        await prisma.humanHandoff.update({
          where: { id: handoffId },
          data: { status: 'accepted', acceptedAt: new Date(), assignedTo: userId },
        })

        await prisma.lead.update({
          where: { id: handoff.leadId },
          data: { humanTookOver: true, aiAgentActive: false },
        })

        return NextResponse.json({ success: true, status: 'accepted' })
      }

      case 'resolve': {
        const handoff = await prisma.humanHandoff.findFirst({
          where: { id: handoffId, workspaceId },
        })
        if (!handoff) return NextResponse.json({ error: 'Handoff not found' }, { status: 404 })

        await prisma.humanHandoff.update({
          where: { id: handoffId },
          data: { status: 'resolved', resolvedAt: new Date() },
        })

        return NextResponse.json({ success: true, status: 'resolved' })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[HANDOFF_PATCH_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id: string }).id

  const { id } = await params

  const followUp = await prisma.followUp.findFirst({
    where: { id },
    include: { lead: { select: { userId: true } } },
  })

  if (!followUp || followUp.lead.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { subject, body: msgBody, approved } = body

  const updated = await prisma.followUp.update({
    where: { id },
    data: {
      ...(subject !== undefined ? { subject } : {}),
      ...(msgBody !== undefined ? { body: msgBody } : {}),
      ...(approved !== undefined ? { approved } : {}),
    },
  })

  return NextResponse.json({ followUp: updated })
}
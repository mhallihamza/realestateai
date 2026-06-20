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

  const workspaceId = (session.user as { id: string; workspaceId: string }).workspaceId

  const { id } = await params

  const followUp = await prisma.followUp.findFirst({
    where: { id, workspaceId },
  })

  if (!followUp) {
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
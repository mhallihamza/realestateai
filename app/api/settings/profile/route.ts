import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, agencyName: true, writingTone: true },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  try {
    const body = await req.json()
    const { name, agencyName, writingTone } = body

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(agencyName !== undefined ? { agencyName } : {}),
        ...(writingTone !== undefined ? { writingTone } : {}),
      },
      select: { name: true, email: true, agencyName: true, writingTone: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('[SETTINGS PUT]', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

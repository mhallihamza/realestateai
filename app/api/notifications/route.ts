import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { markNotificationRead, markAllNotificationsRead, getUnreadCount } from '@/lib/notifications'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const workspaceId = (session.user as any).workspaceId
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unreadOnly') === 'true'

  const where: any = {
    OR: [
      { userId },
      { workspaceId, userId: null },
    ],
  }
  if (unreadOnly) where.readAt = null

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    getUnreadCount(userId),
  ])

  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()
  const { notificationId, action } = body

  if (action === 'readAll') {
    await markAllNotificationsRead(userId)
    return NextResponse.json({ success: true })
  }

  if (notificationId) {
    await markNotificationRead(notificationId)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Missing notificationId or action' }, { status: 400 })
}
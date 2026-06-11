import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = (session.user as any).workspaceId

  try {
    // Fetch recent leads for this workspace along with their AI conversations and messages
    const leads = await prisma.lead.findMany({
      where: { workspaceId },
      include: {
        conversations: {
          include: {
            messages: {
              orderBy: { sentAt: 'asc' }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('[DASHBOARD_LEADS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = (session.user as any).workspaceId

  try {
    const body = await req.json()
    const { leadId, aiAgentActive } = body

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 })
    }

    // Securely update the lead, ensuring it belongs to this logged-in workspace
    const updatedLead = await prisma.lead.updateMany({
      where: {
        id: leadId,
        workspaceId,
      },
      data: {
        aiAgentActive,
        humanTookOver: !aiAgentActive, // If AI is turned off, Human has taken over
      },
    })

    return NextResponse.json({ success: true, message: 'Lead control status updated' })
  } catch (error) {
    console.error('[LEADS_HANDOFF_PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
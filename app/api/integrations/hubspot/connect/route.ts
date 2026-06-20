import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateOAuthState } from '@/lib/crm/registry'
import { HubSpotAdapter } from '@/lib/crm/hubspot'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // Verify user belongs to this workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get or create integration record
    let integration = await prisma.integration.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: 'hubspot' } },
    })

    if (!integration) {
      integration = await prisma.integration.create({
        data: {
          workspaceId,
          provider: 'hubspot',
          status: 'disconnected',
        },
      })
    }

    // Generate OAuth state with workspace ID embedded
    const { state } = generateOAuthState(workspaceId, 'hubspot')

    // Store OAuth state temporarily
    await prisma.integration.update({
      where: { id: integration.id },
      data: { config: JSON.stringify({ oauthState: state }) },
    })

    // Build the HubSpot OAuth URL
    const tempAdapter = new HubSpotAdapter(integration)
    const authUrl = tempAdapter.getAuthUrl(state)

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('[HUBSPOT_CONNECT_ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
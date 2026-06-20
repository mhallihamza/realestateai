import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getIntegrationActivity, getIntegrationActivitySummary } from '@/lib/crm/activity-logger'

// GET /api/integrations - List workspace integrations with activity data
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const workspaceId = (session.user as any).workspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const singleProvider = searchParams.get('provider')

    // Get integrations
    const where: any = { workspaceId }
    if (singleProvider) where.provider = singleProvider

    const integrations = await prisma.integration.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    // Enrich with activity summaries
    const enriched = await Promise.all(
      integrations.map(async (integration) => {
        const activity = await getIntegrationActivitySummary(workspaceId, integration.provider)
        const recentLogs = await getIntegrationActivity(workspaceId, integration.provider, 10)
        return {
          ...integration,
          accessToken: undefined, // Never expose tokens
          refreshToken: undefined,
          activity,
          recentLogs,
        }
      })
    )

    // Generate webhook URL for reference
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const webhookUrl = `${appUrl}/api/integrations/hubspot/webhook`

    return NextResponse.json({
      integrations: enriched,
      webhookUrl,
    })
  } catch (error: any) {
    console.error('[INTEGRATIONS_GET_ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/integrations?provider=hubspot - Disconnect integration
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const workspaceId = (session.user as any).workspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    }

    // Verify membership
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    })

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only workspace owners and admins can disconnect integrations' }, { status: 403 })
    }

    // Find and disconnect integration
    const integration = await prisma.integration.findUnique({
      where: { workspaceId_provider: { workspaceId, provider } },
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Clear sensitive data and mark as disconnected
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: 'disconnected',
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        hubspotAccountId: null,
        hubspotAccountName: null,
        hubspotEmail: null,
      },
    })

    // Log disconnection
    const { logIntegrationActivity } = await import('@/lib/crm/activity-logger')
    await logIntegrationActivity(workspaceId, integration.id, provider, 'disconnected', `${provider} integration disconnected`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[INTEGRATIONS_DELETE_ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
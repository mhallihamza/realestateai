import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { HubSpotAdapter } from '@/lib/crm/hubspot'
import { logIntegrationActivity } from '@/lib/crm/activity-logger'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations&error=${error}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations&error=missing_params`
      )
    }

    // Find integration by OAuth state stored in config
    const integration = await prisma.integration.findFirst({
      where: {
        provider: 'hubspot',
        config: { contains: state },
      },
    })

    if (!integration) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations&error=invalid_state`
      )
    }

    // Verify workspace membership
    const workspace = await prisma.workspace.findUnique({
      where: { id: integration.workspaceId },
    })

    if (!workspace) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations&error=workspace_not_found`
      )
    }

    // Exchange code for tokens
    const tempAdapter = new HubSpotAdapter(integration)
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/hubspot/callback`
    const tokenData = await tempAdapter.exchangeCode(code, redirectUri)

    // Update integration with tokens
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        hubspotAccountId: tokenData.accountId,
        hubspotAccountName: tokenData.accountName,
        hubspotEmail: tokenData.email,
        status: 'active',
        lastSyncStatus: 'success',
        lastSyncAt: new Date(),
        config: null, // clear OAuth state
      },
    })

    // Log the connection
    await logIntegrationActivity(
      integration.workspaceId,
      integration.id,
      'hubspot',
      'connected',
      `HubSpot connected successfully - Account: ${tokenData.accountName || tokenData.accountId || 'Unknown'}`
    )

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations&success=hubspot_connected`
    )
  } catch (error: any) {
    console.error('[HUBSPOT_CALLBACK_ERROR]', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations&error=${error.message}`
    )
  }
}
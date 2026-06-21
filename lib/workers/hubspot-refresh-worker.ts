/**
 * HubSpot Token Refresh Worker
 *
 * Refreshes a HubSpot OAuth access token in the background.
 * This is NEVER called from the request path — only from the queue.
 * Single-flight guarantee: the caller (lead-ingest-worker) checks for
 * existing pending refresh jobs before enqueueing a new one.
 */

import { prisma } from '@/lib/prisma'

export async function processHubSpotRefreshJob(payload: Record<string, unknown>): Promise<void> {
  const { integrationId } = payload as { integrationId: string }

  if (!integrationId) {
    console.error('[HUBSPOT_REFRESH] Missing integrationId in payload')
    return
  }

  console.log('[HUBSPOT_REFRESH] starting refresh for integration', integrationId)

  try {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      console.error('[HUBSPOT_REFRESH] Integration not found', integrationId)
      return
    }

    if (integration.provider !== 'hubspot') {
      console.error('[HUBSPOT_REFRESH] Integration is not HubSpot', integrationId, integration.provider)
      return
    }

    // Dynamically import the adapter to create a fresh instance with current DB data
    const { HubSpotAdapter } = await import('@/lib/crm/hubspot')
    const adapter = new HubSpotAdapter(integration)

    const success = await adapter.refreshAccessToken()

    if (success) {
      console.log('[HUBSPOT_REFRESH] token refreshed successfully for integration', integrationId)
    } else {
      console.error('[HUBSPOT_REFRESH] token refresh failed for integration', integrationId)
    }
  } catch (error: any) {
    console.error('[HUBSPOT_REFRESH] error:', {
      message: error.message,
      integrationId,
    })
  }
}
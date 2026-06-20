import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueueJob } from '@/lib/queue'
import { logIntegrationActivity } from '@/lib/crm/activity-logger'
import { processLeadIngestJob } from '@/lib/workers/lead-ingest-worker'

/**
 * HubSpot Webhook endpoint
 * 
 * Receives webhook events from HubSpot (contact.created, contact.updated, etc.)
 * Validates signature, creates event record, and enqueues processing job.
 * Does NOT execute heavy AI/CRM work inside the webhook request.
 */
export async function POST(req: Request) {
  try {
    console.log('[WEBHOOK] received')
    const body = await req.text()
    const signature = req.headers.get('x-hubspot-signature-v3') || ''
    const timestamp = Number(
       req.headers.get('x-hubspot-request-timestamp')
         )
    const workspaceId = req.headers.get('x-workspace-id') || req.headers.get('x-hubspot-workspace-id') || ''

    // Find integration by workspace
    let integration
    if (workspaceId) {
      integration = await prisma.integration.findUnique({
        where: { workspaceId_provider: { workspaceId, provider: 'hubspot' } },
      })
    }

    if (!integration) {
      // Try to find any active HubSpot integration if no workspace header
      integration = await prisma.integration.findFirst({
        where: { provider: 'hubspot', status: 'active' },
        orderBy: { updatedAt: 'desc' },
      })
    }

    if (!integration || integration.status !== 'active') {
      return NextResponse.json({ error: 'No active HubSpot integration' }, { status: 404 })
    }

    // Validate HubSpot webhook signature
    const { HubSpotAdapter } = await import('@/lib/crm/hubspot')
    const adapter = new HubSpotAdapter(integration)
    const webhookClient = adapter.getWebhookClient()
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    const pathname = new URL(req.url).pathname
    const url = `${proto}://${host}${pathname}`
    const isValid = webhookClient.validateSignature({
  method: req.method,
  url: url,
  body,
  timestamp,
  signature,
})
    if (!isValid) {
      console.error('[HUBSPOT_WEBHOOK] Invalid signature')
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    // Parse webhook payload
    let events: any[]
    try {
      events = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    if (!Array.isArray(events)) {
      events = [events]
    }

    // Process each event - don't do heavy work here
    const processedIds: string[] = []

    for (const event of events) {
      const eventType = event.subscriptionType || event.eventType || 'unknown'
      const objectId = event.objectId || event.object_id

      // Log webhook received
      await logIntegrationActivity(
        integration.workspaceId,
        integration.id,
        'hubspot',
        'webhook_received',
        `HubSpot webhook: ${eventType} - Object: ${objectId}`,
        { eventType, objectId, event }
      )

      // Only process contact creation/update events; ignore others (deals, tickets, etc.)
      const isContactEvent = eventType.startsWith('contact.')
      if (!isContactEvent) {
        console.log(`[HUBSPOT_WEBHOOK] Ignoring non-contact event: ${eventType}`)
        continue
      }

      // Create WebhookEvent record
      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          workspaceId: integration.workspaceId,
          source: 'hubspot',
          eventType,
          payload: JSON.stringify(event),
          processed: false,
        },
      })
      console.log('[WEBHOOK] about to trigger lead pipeline')
      // Enqueue processing job (async) - keep queue for retry/backup
      await enqueueJob({
        workspaceId: integration.workspaceId,
        type: 'lead_ingest',
        payload: {
          workspaceId: integration.workspaceId,
          source: 'hubspot',
          eventType,
          objectId: String(objectId),
          webhookEventId: webhookEvent.id,
          integrationId: integration.id,
        },
        priority: 2,
      })

      // Process inline immediately so Lead is created right away
      // This ensures leads are created even without a worker poller running
      processLeadIngestJob({
        workspaceId: integration.workspaceId,
        source: 'hubspot',
        eventType,
        objectId: String(objectId),
        webhookEventId: webhookEvent.id,
        integrationId: integration.id,
      }).catch((err) => {
        console.error('[HUBSPOT_WEBHOOK] Inline lead ingest failed (queue backup exists):', err)
      })

      processedIds.push(webhookEvent.id)
    }

    return NextResponse.json({
      received: true,
      processed: processedIds.length,
      webhookEventIds: processedIds,
    })
  } catch (error: any) {
    console.error('[HUBSPOT_WEBHOOK_ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * HubSpot webhook challenge verification (GET)
 * HubSpot sends a GET with challenge to verify the endpoint
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const challenge = searchParams.get('hub.challenge')
  
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ ok: true })
}
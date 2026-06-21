import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueueJob, processJob, completeJob } from '@/lib/queue'
import { logIntegrationActivity } from '@/lib/crm/activity-logger'

/**
 * HubSpot Webhook endpoint
 * 
 * Receives webhook events from HubSpot (contact.created, contact.updated, etc.)
 * Validates signature, creates event record, and enqueues processing job.
 * Also attempts inline processing so leads appear instantly, not on next cron tick.
 * If inline processing fails, the enqueued job remains as a durable fallback/retry.
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

    // Enqueue each contact event for async processing (with inline fallback)
    const enqueuedIds: string[] = []

    for (const event of events) {
      const eventType = event.subscriptionType || event.eventType || 'unknown'
      const objectId = event.objectId || event.object_id
      // HubSpot includes an eventId field in each webhook payload entry for idempotency
      const eventId = event.eventId || event.event_id || null

      // ── IDEMPOTENCY CHECK ──────────────────────────────────────────────
      // Skip if a WebhookEvent with this HubSpot eventId already exists
      if (eventId) {
        const existingEvent = await prisma.webhookEvent.findUnique({
          where: { eventId },
        })
        if (existingEvent) {
          console.log(`[HUBSPOT_WEBHOOK] Duplicate eventId ${eventId} skipped (already processed)`)
          continue
        }
      }

      // Log webhook received
      await logIntegrationActivity(
        integration.workspaceId,
        integration.id,
        'hubspot',
        'webhook_received',
        `HubSpot webhook: ${eventType} - Object: ${objectId}`,
        { eventType, objectId, eventId, event }
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
          eventId, // store HubSpot eventId for idempotency
          payload: JSON.stringify(event),
          processed: false,
        },
      })
      cosnole.log("fun");
      console.log('[WEBHOOK] enqueuing lead_ingest for', String(objectId))

      // Build the job payload — workspaceId is ALWAYS included for every event type
      const jobPayload = {
        workspaceId: integration.workspaceId,
        source: 'hubspot',
        eventType,
        objectId: String(objectId),
        webhookEventId: webhookEvent.id,
        integrationId: integration.id,
      }

      // Enqueue processing job (async) - durable fallback/audit trail
      const jobId = await enqueueJob({
        workspaceId: integration.workspaceId,
        type: 'lead_ingest',
        payload: jobPayload,
        priority: 2,
      })

      // ── INLINE PROCESSING ──────────────────────────────────────────────
      // Attempt to process immediately so leads appear instantly.
      // Wrapped in try/catch so a failure does NOT throw and break the webhook response.
      // If inline processing succeeds, mark the job completed so the cron poller skips it.
      // If it throws, leave the job pending so the cron poller picks it up and retries.
      try {
        // Reconstruct a minimal job-like object for processJob
        const inlineJob = {
          id: webhookEvent.id,
          type: 'lead_ingest',
          payload: JSON.stringify(jobPayload),
        }
        await processJob(inlineJob)
        // If successful, mark the enqueued job as completed so cron skips it
        await completeJob(jobId)
        console.log(`[WEBHOOK] Inline processing succeeded for ${objectId}`)
      } catch (inlineError: any) {
        // Inline processing failed — do NOT throw. The enqueued job remains pending
        // and the cron poller will pick it up and retry via failJob() exponential backoff.
        console.warn(`[WEBHOOK] Inline processing failed for ${objectId}, will rely on cron: ${inlineError.message}`)
      }

      enqueuedIds.push(webhookEvent.id)
    }

    return NextResponse.json({
      received: true,
      enqueued: enqueuedIds.length,
      webhookEventIds: enqueuedIds,
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
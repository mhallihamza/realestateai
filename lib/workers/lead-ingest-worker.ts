/**
 * Lead Ingest Worker
 *
 * Handles inbound lead ingestion from external CRM systems (e.g. HubSpot).
 * When a contact is created/updated in the external CRM, this worker:
 * 1. Fetches the contact data from the CRM via the provider adapter
 * 2. If HubSpot token is expired, enqueues a background refresh job
 *    and marks the webhook event for retry — lead creation is NOT blocked
 * 3. Maps CRM fields to local Lead fields
 * 4. Upserts the Lead in the local database
 * 5. Marks the WebhookEvent as processed
 */

import { prisma } from '@/lib/prisma'
import { getCrmProvider } from '@/lib/crm/registry'
import { logIntegrationActivity } from '@/lib/crm/activity-logger'
import { enqueueJob } from '@/lib/queue'

interface LeadIngestPayload {
  workspaceId: string
  objectId: string
  webhookEventId: string
  integrationId: string
  source: string
  eventType: string
}

export async function processLeadIngestJob(payload: Record<string, unknown>): Promise<void> {
  console.log('[LEAD INGEST] function ENTERED')
  const { workspaceId, objectId, webhookEventId, integrationId, source, eventType } =
    payload as unknown as LeadIngestPayload

  if (!workspaceId || !objectId || !integrationId) {
    console.error('[LEAD_INGEST] Missing required fields in payload', payload)
    await markWebhookEventError(webhookEventId, 'Missing required payload fields')
    return
  }

  // ── EARLY SKIP FOR CONTACT DELETION ──────────────────────────────────
  // Deleted contacts should not be ingested as leads. Mark the webhook event
  // as processed with a clear note, rather than treating it as a validation error.
  if (eventType === 'contact.deletion') {
    console.log(`[LEAD_INGEST] Skipping contact.deletion for objectId=${objectId} — not ingesting deleted contacts`)
    if (webhookEventId) {
      try {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            processed: true,
            error: null,
          },
        })
      } catch (e) {
        console.error('[LEAD_INGEST] Failed to mark deletion webhook event as processed', e)
      }
    }
    await logIntegrationActivity(
      workspaceId,
      integrationId,
      source || 'hubspot',
      'ingest_skipped',
      `Skipped contact.deletion for ${objectId} — deleted contacts are not ingested`,
      { webhookEventId, objectId, eventType }
    ).catch(() => {})
    return
  }

  try {
    // Get the CRM provider adapter
    const crm = await getCrmProvider(workspaceId, source || 'hubspot')
    if (!crm) {
      console.error('[LEAD_INGEST] No CRM provider found for', source)
      await logIntegrationActivity(
        workspaceId,
        integrationId,
        source || 'hubspot',
        'ingest_failed',
        `No active CRM provider found for ${source}`,
        { webhookEventId, objectId }
      )
      await markWebhookEventError(webhookEventId, 'No active CRM provider')
      return
    }

    let contact: any
    try {
      contact = await crm.fetchContact(objectId)
    } catch (err: any) {
      // If token expired, enqueue background refresh and mark for retry
      // Lead creation is NOT blocked — we'll log and retry later
       if (err.message === 'TOKEN_EXPIRED' || err.message === 'TOKEN_EXPIRED_RETRY_LATER') {
        console.log('[LEAD INGEST] token expired, enqueuing background refresh')
        
        // Single-flight: only enqueue if no pending refresh job exists for this integration
        const existingRefreshJob = await prisma.jobQueue.findFirst({
          where: {
            type: 'hubspot_refresh_token',
            status: 'pending',
          },
        })
        if (!existingRefreshJob) {
          await enqueueJob({
            workspaceId,
            type: 'hubspot_refresh_token',
            payload: { integrationId },
            priority: 1,
          })
        }

        await markWebhookEventError(webhookEventId, 'HubSpot token expired — will retry after refresh')
        throw new Error('TOKEN_EXPIRED_RETRY_LATER')
      }
      // Other errors propagate normally
      throw err
    }

    console.log('[LEAD INGEST] contact received:', contact)
    if (!contact || !contact.properties) {
      console.error('[LEAD_INGEST] Contact not found in CRM', objectId)
      await logIntegrationActivity(
        workspaceId,
        integrationId,
        crm.provider,
        'ingest_failed',
        `Contact ${objectId} not found in ${crm.provider}`,
        { webhookEventId, objectId }
      )
      await markWebhookEventError(webhookEventId, 'Contact not found in CRM')
      return
    }

    const props = contact.properties

    // Map HubSpot contact fields to local Lead fields
    const firstName = props.firstname || ''
    const lastName = props.lastname || ''
    const name = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown Lead'
    const email = props.email || ''
    const phone = props.phone || ''

    if (!email) {
      console.error('[LEAD_INGEST] Contact has no email', objectId)
      await logIntegrationActivity(
        workspaceId,
        integrationId,
        crm.provider,
        'ingest_failed',
        `Contact ${objectId} has no email address`,
        { webhookEventId, objectId }
      )
      await markWebhookEventError(webhookEventId, 'Contact has no email')
      return
    }

    // Resolve a valid userId from workspace members
    const defaultMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId },
    })

    let assignedUserId: string
    if (defaultMember) {
      assignedUserId = defaultMember.userId
    } else {
      const globalFallbackUser = await prisma.user.findFirst()
      if (!globalFallbackUser) {
        await logIntegrationActivity(
          workspaceId,
          integrationId,
          crm.provider,
          'ingest_failed',
          'No workspace members or system users exist',
          { webhookEventId, objectId }
        )
        await markWebhookEventError(webhookEventId, 'No user to assign lead to')
        return
      }
      assignedUserId = globalFallbackUser.id
    }

    // Check if a lead with this email already exists in the workspace
    let lead = await prisma.lead.findFirst({
      where: { workspaceId, email },
    })

    if (lead) {
      // Update existing lead
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          name,
          phone: phone || lead.phone,
          externalId: objectId,
          crmId: contact.id,
          crmSource: crm.provider,
          source: 'HubSpot',
        },
      })
    } else {
      // Create new lead
      lead = await prisma.lead.create({
        data: {
          workspaceId,
          userId: assignedUserId,
          name,
          email,
          phone: phone || null,
          source: 'HubSpot',
          channel: 'email',
          status: 'New',
          score: 0,
          qualificationStage: 'unqualified',
          aiAgentActive: true,
          humanTookOver: false,
          externalId: objectId,
          crmId: contact.id,
          crmSource: crm.provider,
        },
      })
      console.log('[PRISMA] creating lead...')
    }

    // Mark the webhook event as processed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: true,
        leadId: lead.id,
      },
    })

    await logIntegrationActivity(
      workspaceId,
      integrationId,
      crm.provider,
      'ingest_completed',
      `Lead ${email} ingested from ${crm.provider} via ${eventType || 'webhook'}`,
      { webhookEventId, objectId, leadId: lead.id, eventType }
    )

    console.log(`[LEAD_INGEST] Successfully ingested lead ${email} from ${crm.provider}`)
  } catch (error: any) {
    console.error('[LEAD_INGEST] Error processing lead ingestion', error)

    await logIntegrationActivity(
      workspaceId,
      integrationId,
      source || 'hubspot',
      'ingest_failed',
      `Error ingesting lead: ${error.message}`,
      { webhookEventId, objectId, error: error.message }
    )

    await markWebhookEventError(webhookEventId, error.message)
  }
}

async function markWebhookEventError(webhookEventId: string, error: string): Promise<void> {
  if (!webhookEventId) return
  try {
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: false,
        error,
      },
    })
  } catch (e) {
    console.error('[LEAD_INGEST] Failed to mark webhook event error', e)
  }
}
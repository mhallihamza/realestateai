/**
 * CRM Worker (Refactored)
 * 
 * Uses the provider registry to dispatch CRM operations.
 * No references to specific CRM providers - purely provider-agnostic.
 */

import { prisma } from '@/lib/prisma'
import { getCrmProvider, getActiveCrmProvider } from '@/lib/crm/registry'
import { logIntegrationActivity } from '@/lib/crm/activity-logger'
import type { Lead } from '@/types'

interface CRMSyncPayload {
  leadId: string
  workspaceId: string
  syncType: 'create' | 'update' | 'note' | 'delete'
  note?: string
  provider?: string // optional, defaults to active provider
}

export async function processCRMSyncJob(payload: Record<string, unknown>): Promise<void> {
  const { leadId, workspaceId, syncType, note, provider } = payload as unknown as CRMSyncPayload

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return

  // Get the CRM provider (specific or active)
  let crm
  if (provider) {
    crm = await getCrmProvider(workspaceId, provider)
  } else {
    crm = await getActiveCrmProvider(workspaceId)
  }

  if (!crm) return // No CRM configured

  const typedLead = lead as unknown as Lead
  const integration = await prisma.integration.findFirst({
    where: { workspaceId, provider: crm.provider, status: 'active' },
  })

  if (!integration) return

  // Log sync start
  await logIntegrationActivity(
    workspaceId,
    integration.id,
    crm.provider,
    'sync_started',
    `${syncType} sync for lead ${lead.email || lead.name}`,
    { leadId, syncType }
  )

  try {
    let result

    switch (syncType) {
      case 'create':
        result = await crm.upsertContact(typedLead)
        break

      case 'update':
        result = await crm.upsertContact(typedLead)
        break

      case 'note':
        if (note) {
          result = await crm.addNote(typedLead, note)
        } else {
          result = { success: true }
        }
        break

      default:
        result = await crm.upsertContact(typedLead)
    }

    if (result.success) {
      await logIntegrationActivity(
        workspaceId,
        integration.id,
        crm.provider,
        'sync_completed',
        `${syncType} sync successful for ${lead.email || lead.name}`,
        { leadId, syncType, externalId: result.externalId }
      )

      // Update integration sync status
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'success',
          syncError: null,
        },
      })
    } else {
      await logIntegrationActivity(
        workspaceId,
        integration.id,
        crm.provider,
        'sync_failed',
        `${syncType} sync failed for ${lead.email || lead.name}: ${result.error || 'Unknown error'}`,
        { leadId, syncType, error: result.error }
      )

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'error',
          syncError: result.error || 'Unknown error',
          status: 'error',
        },
      })
    }
  } catch (error: any) {
    await logIntegrationActivity(
      workspaceId,
      integration.id,
      crm.provider,
      'sync_failed',
      `${syncType} sync failed for ${lead.email || lead.name}: ${error.message}`,
      { leadId, syncType, error: error.message }
    )

    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'error',
        syncError: error.message,
        status: 'error',
      },
    })
  }
}
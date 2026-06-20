/**
 * Integration Activity Logger
 * 
 * Tracks all integration activity: syncs, webhooks, errors, token refreshes.
 * Used by the Integrations monitoring dashboard.
 */

import { prisma } from '@/lib/prisma'

export type ActivityEventType =
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'webhook_received'
  | 'webhook_processed'
  | 'webhook_failed'
  | 'token_refreshed'
  | 'token_expired'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'connection_test'
  | 'ingest_started'
  | 'ingest_completed'
  | 'ingest_failed'

export async function logIntegrationActivity(
  workspaceId: string,
  integrationId: string,
  provider: string,
  eventType: ActivityEventType,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.integrationActivityLog.create({
      data: {
        workspaceId,
        integrationId,
        provider,
        eventType,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })
  } catch (error) {
    console.error(`[ACTIVITY_LOG_ERROR] Failed to log ${eventType} for ${provider}:`, error)
  }
}

export async function getIntegrationActivity(
  workspaceId: string,
  provider: string,
  limit = 50
): Promise<any[]> {
  return prisma.integrationActivityLog.findMany({
    where: { workspaceId, provider },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getIntegrationActivitySummary(
  workspaceId: string,
  provider?: string
): Promise<{
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  errors: number
  lastSyncAt: Date | null
  lastSyncStatus: string | null
  lastError: string | null
}> {
  const where: any = { workspaceId }
  if (provider) where.provider = provider

  const [totalSyncs, failedSyncs, errors, lastEntry] = await Promise.all([
    prisma.integrationActivityLog.count({
      where: { ...where, eventType: { in: ['sync_started', 'sync_completed', 'sync_failed'] } },
    }),
    prisma.integrationActivityLog.count({
      where: { ...where, eventType: 'sync_failed' },
    }),
    prisma.integrationActivityLog.count({
      where: { ...where, eventType: 'error' },
    }),
    prisma.integrationActivityLog.findFirst({
      where: { ...where, eventType: { in: ['sync_completed', 'sync_failed'] } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return {
    totalSyncs,
    successfulSyncs: totalSyncs - failedSyncs,
    failedSyncs,
    errors,
    lastSyncAt: lastEntry?.createdAt || null,
    lastSyncStatus: lastEntry?.eventType === 'sync_failed' ? 'error' : 'success',
    lastError: lastEntry?.eventType === 'sync_failed' ? lastEntry.message : null,
  }
}
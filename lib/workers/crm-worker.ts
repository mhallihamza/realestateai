import { prisma } from '@/lib/prisma'
import { createHubSpotLead, updateHubSpotLead, logHubSpotNote } from '@/lib/crm/hubspot'
import type { Lead } from '@/types'

export async function processCRMSyncJob(payload: Record<string, unknown>): Promise<void> {
  const { leadId, workspaceId, syncType } = payload as any

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return

  // Get integration
  const integration = await prisma.integration.findFirst({
    where: { workspaceId, provider: 'hubspot', status: 'active' },
  })
  if (!integration) return // No CRM configured

  const typedLead = lead as unknown as Lead

  switch (syncType) {
    case 'create':
      await createHubSpotLead(typedLead)
      break

    case 'update':
      await updateHubSpotLead(typedLead)
      break

    case 'note':
      const { note } = payload as any
      if (note) {
        await logHubSpotNote(typedLead, note)
      }
      break

    default:
      await updateHubSpotLead(typedLead)
  }
}
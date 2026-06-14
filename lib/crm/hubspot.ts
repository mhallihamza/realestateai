import { prisma } from '@/lib/prisma'
import type { Lead } from '@/types'

const HUBSPOT_API_BASE = 'https://api.hubapi.com'

function getHubspotClient(accessToken: string) {
  return {
    async request(method: string, path: string, body?: any) {
      const response = await fetch(`${HUBSPOT_API_BASE}${path}`, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`HubSpot API error: ${response.status} - ${error}`)
      }

      return response.json()
    },
  }
}

export async function getWorkspaceIntegration(workspaceId: string) {
  return prisma.integration.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'hubspot' } },
  })
}

export async function createHubSpotLead(lead: Lead): Promise<string | null> {
  try {
    const integration = await getWorkspaceIntegration(lead.workspaceId)
    if (!integration?.accessToken) return null

    const client = getHubspotClient(integration.accessToken)

    const contact = await client.request('POST', '/crm/v3/objects/contacts', {
      properties: {
        firstname: lead.name.split(' ')[0],
        lastname: lead.name.split(' ').slice(1).join(' ') || lead.name,
        email: lead.email,
        phone: lead.phone || '',
        hs_lead_status: lead.status,
        hs_analytics_source: lead.source,
        // Custom properties
        realestate_ai_score: lead.score.toString(),
        realestate_ai_intent: lead.intent || '',
        realestate_ai_urgency: lead.urgency || '',
        realestate_ai_agent_active: lead.aiAgentActive ? 'Yes' : 'No',
      },
    })

    // Store the CRM ID back on the lead
    if (contact?.id) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { crmId: contact.id, crmSource: 'hubspot' },
      })
    }

    return contact?.id || null
  } catch (error) {
    console.error('[HUBSPOT_CREATE_ERROR]', error)
    return null
  }
}

export async function updateHubSpotLead(lead: Lead): Promise<boolean> {
  try {
    if (!lead.crmId || lead.crmSource !== 'hubspot') {
      // Try to create if no CRM ID
      const id = await createHubSpotLead(lead)
      return !!id
    }

    const integration = await getWorkspaceIntegration(lead.workspaceId)
    if (!integration?.accessToken) return false

    const client = getHubspotClient(integration.accessToken)

    await client.request('PATCH', `/crm/v3/objects/contacts/${lead.crmId}`, {
      properties: {
        hs_lead_status: lead.status,
        realestate_ai_score: lead.score.toString(),
        realestate_ai_intent: lead.intent || '',
        realestate_ai_urgency: lead.urgency || '',
        realestate_ai_agent_active: lead.aiAgentActive ? 'Yes' : 'No',
      },
    })

    return true
  } catch (error) {
    console.error('[HUBSPOT_UPDATE_ERROR]', error)
    return false
  }
}

export async function logHubSpotNote(lead: Lead, note: string): Promise<boolean> {
  try {
    if (!lead.crmId || lead.crmSource !== 'hubspot') return false

    const integration = await getWorkspaceIntegration(lead.workspaceId)
    if (!integration?.accessToken) return false

    const client = getHubspotClient(integration.accessToken)

    await client.request('POST', `/crm/v3/objects/notes`, {
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: note,
      },
      associations: [
        {
          to: { id: lead.crmId },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 202, // Note to Contact
            },
          ],
        },
      ],
    })

    return true
  } catch (error) {
    console.error('[HUBSPOT_NOTE_ERROR]', error)
    return false
  }
}

export async function fetchHubSpotLeads(workspaceId: string, since?: Date): Promise<Lead[]> {
  try {
    const integration = await getWorkspaceIntegration(workspaceId)
    if (!integration?.accessToken) return []

    const client = getHubspotClient(integration.accessToken)

    const query = since
      ? `/crm/v3/objects/contacts?limit=100&filter=hs_lastmodifieddate>${since.toISOString()}`
      : '/crm/v3/objects/contacts?limit=100'

    const result = await client.request('GET', query)

    return (result.results || []).map((contact: any) => ({
      name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
      email: contact.properties.email,
      phone: contact.properties.phone,
      source: 'HubSpot' as const,
      status: 'New' as const,
      score: parseInt(contact.properties.realestate_ai_score || '0'),
      intent: contact.properties.realestate_ai_intent || 'unknown',
      urgency: contact.properties.realestate_ai_urgency || 'unknown',
      crmId: contact.id,
      crmSource: 'hubspot',
    })) as Lead[]
  } catch (error) {
    console.error('[HUBSPOT_FETCH_ERROR]', error)
    return []
  }
}
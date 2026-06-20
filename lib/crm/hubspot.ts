/**
 * HubSpot CRM Adapter
 * 
 * Implements CrmProvider interface for HubSpot.
 * Handles OAuth flow, contact sync, notes, webhook validation.
 */

import { prisma } from '@/lib/prisma'
import { Signature } from '@hubspot/api-client'
import type { CrmProvider, CrmSyncResult, CrmFetchResult } from './interface'
import type { Lead } from '@/types'
import { logIntegrationActivity } from './activity-logger'

const HUBSPOT_API_BASE = 'https://api.hubapi.com'
const HUBSPOT_AUTH_BASE = 'https://app.hubspot.com/oauth/authorize'
const HUBSPOT_TOKEN_BASE = 'https://api.hubapi.com/oauth/v1/token'

const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || ''
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || ''
const SCOPES = 'tickets crm.objects.line_items.read oauth crm.objects.companies.read crm.objects.contacts.read'

export class HubSpotAdapter implements CrmProvider {
  readonly provider = 'hubspot'
  readonly name = 'HubSpot'

  private integration: any
  private accessToken: string
  private refreshToken: string | null
  private expiresAt: Date | null
  private workspaceId: string
  private integrationId: string

  constructor(integration: any) {
    this.integration = integration
    this.accessToken = integration.accessToken || ''
    this.refreshToken = integration.refreshToken || null
    this.expiresAt = integration.expiresAt ? new Date(integration.expiresAt) : null
    this.workspaceId = integration.workspaceId
    this.integrationId = integration.id
  }

  private getClient() {
    return {
      request: async (method: string, path: string, body?: any) => {
        await this.ensureValidToken()

        const response = await fetch(`${HUBSPOT_API_BASE}${path}`, {
          method,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HubSpot API error (${response.status}): ${errorText}`)
        }

        return response.json()
      },
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.expiresAt || new Date() >= this.expiresAt) {
      const refreshed = await this.refreshAccessToken()
      if (!refreshed) {
        throw new Error('HubSpot token expired and refresh failed')
      }
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string; accountInfo?: Record<string, unknown> }> {
    try {
      const client = this.getClient()
      const result = await client.request('GET', '/crm/v3/objects/contacts?limit=1')
      return { 
        ok: true, 
        accountInfo: { 
          contactCount: result?.total || 0,
        } 
      }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  }

  async upsertContact(lead: Lead): Promise<CrmSyncResult> {
    try {
      const client = this.getClient()

      if (lead.crmId && lead.crmSource === 'hubspot') {
        // Update existing
        await client.request('PATCH', `/crm/v3/objects/contacts/${lead.crmId}`, {
          properties: {
            hs_lead_status: lead.status || 'NEW',
            realestate_ai_score: (lead.score || 0).toString(),
            realestate_ai_intent: lead.intent || 'unknown',
            realestate_ai_urgency: lead.urgency || 'unknown',
            realestate_ai_agent_active: lead.aiAgentActive ? 'Yes' : 'No',
            realestate_ai_budget: lead.budget || '',
            realestate_ai_property_type: lead.propertyType || '',
            realestate_ai_location: lead.locationPreference || '',
            realestate_ai_timeline: lead.timeline || '',
            realestate_ai_summary: lead.aiAnalysisSummary || '',
          },
        })
        return { success: true, externalId: lead.crmId }
      }

      // Create new contact
      const nameParts = (lead.name || 'Unknown Lead').split(' ')
      const contact = await client.request('POST', '/crm/v3/objects/contacts', {
        properties: {
          firstname: nameParts[0],
          lastname: nameParts.slice(1).join(' ') || nameParts[0],
          email: lead.email,
          phone: lead.phone || '',
          hs_lead_status: lead.status || 'NEW',
          hs_analytics_source: lead.source || 'AI Sales Agent',
          realestate_ai_score: (lead.score || 0).toString(),
          realestate_ai_intent: lead.intent || 'unknown',
          realestate_ai_urgency: lead.urgency || 'unknown',
          realestate_ai_agent_active: lead.aiAgentActive ? 'Yes' : 'No',
          realestate_ai_budget: lead.budget || '',
          realestate_ai_property_type: lead.propertyType || '',
          realestate_ai_location: lead.locationPreference || '',
          realestate_ai_timeline: lead.timeline || '',
        },
      })

      if (contact?.id) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { crmId: contact.id, crmSource: 'hubspot' },
        })
      }

      return { success: true, externalId: contact?.id }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async addNote(lead: Lead, note: string): Promise<CrmSyncResult> {
    try {
      if (!lead.crmId || lead.crmSource !== 'hubspot') {
        return { success: false, error: 'No HubSpot contact ID for this lead' }
      }

      const client = this.getClient()
      await client.request('POST', '/crm/v3/objects/notes', {
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
                associationTypeId: 202,
              },
            ],
          },
        ],
      })

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async fetchContact(objectId: string): Promise<any | null> {
    try {
      const client = this.getClient()
      const result = await client.request('GET', `/crm/v3/objects/contacts/${objectId}?properties=firstname,lastname,email,phone`)
      return result || null
    } catch (error: any) {
  console.error('[HUBSPOT_FETCH_CONTACT_ERROR FULL]', {
    message: error.message,
    status: error.status,
    objectId,
  })

  throw error
}
  }

  async fetchRecent(since?: Date, page?: string): Promise<CrmFetchResult> {
    try {
      const client = this.getClient()
      let path = '/crm/v3/objects/contacts?limit=100&sort=-hs_lastmodifieddate'

      if (since) {
        path += `&filter=hs_lastmodifieddate>${since.toISOString()}`
      }
      if (page) {
        path += `&after=${page}`
      }

      const result = await client.request('GET', path)

      return {
        contacts: (result.results || []).map((contact: any) => ({
          firstName: contact.properties?.firstname,
          lastName: contact.properties?.lastname,
          email: contact.properties?.email,
          phone: contact.properties?.phone,
          source: 'HubSpot',
          status: contact.properties?.hs_lead_status || 'New',
          score: parseInt(contact.properties?.realestate_ai_score || '0'),
          intent: contact.properties?.realestate_ai_intent || 'unknown',
          urgency: contact.properties?.realestate_ai_urgency || 'unknown',
          budget: contact.properties?.realestate_ai_budget,
          propertyType: contact.properties?.realestate_ai_property_type,
          locationPreference: contact.properties?.realestate_ai_location,
          timeline: contact.properties?.realestate_ai_timeline,
        })),
        nextPage: result?.paging?.next?.after,
      }
    } catch (error) {
      return { contacts: [] }
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: this.refreshToken,
      })

      const response = await fetch(HUBSPOT_TOKEN_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })

      if (!response.ok) {
        await logIntegrationActivity(this.workspaceId, this.integrationId, 'hubspot', 'token_expired', 'HubSpot token refresh failed')
        return false
      }

      const data = await response.json()

      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000)

      await prisma.integration.update({
        where: { id: this.integrationId },
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || this.refreshToken,
          expiresAt,
          status: 'active',
        },
      })

      this.accessToken = data.access_token
      this.refreshToken = data.refresh_token || this.refreshToken
      this.expiresAt = expiresAt

      await logIntegrationActivity(this.workspaceId, this.integrationId, 'hubspot', 'token_refreshed', 'HubSpot token refreshed successfully')

      return true
    } catch (error) {
      return false
    }
  }

  getAuthUrl(state: string): string {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/hubspot/callback`
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
    })
    console.log(redirectUri);
    return `${HUBSPOT_AUTH_BASE}?${params.toString()}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<{
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
    accountId?: string
    accountName?: string
    email?: string
  }> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      code,
    })

    const response = await fetch(HUBSPOT_TOKEN_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HubSpot OAuth token exchange failed: ${error}`)
    }

    const data = await response.json()
    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000)

    // Fetch account info
    let accountId: string | undefined
    let accountName: string | undefined
    let email: string | undefined

    try {
      const accountResponse = await fetch(`${HUBSPOT_API_BASE}/account-info/v3/details`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` },
      })
      if (accountResponse.ok) {
        const accountData = await accountResponse.json()
        accountId = accountData.portalId?.toString()
        accountName = accountData.accountName
      }
    } catch {}

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      accountId,
      accountName,
      email,
    }
  }
getWebhookClient() {
  return {
    validateSignature: (params: {
      method: string
      url: string
      body: string
      timestamp: number
      signature: string
    }) => {
      const secret = process.env.HUBSPOT_CLIENT_SECRET

      if (!secret) return false

      return Signature.isValid({
        signatureVersion: 'v3',
        signature: params.signature,
        method: params.method,
        clientSecret: secret,
        requestBody: params.body,
        url: params.url,
        timestamp: params.timestamp,
      })
    },
  }
}
}

export default HubSpotAdapter
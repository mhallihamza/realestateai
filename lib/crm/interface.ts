/**
 * CRM Provider Interface
 * 
 * All CRM adapters must implement this interface.
 * The AI Agent and business logic NEVER reference a specific CRM provider.
 * 
 * To add a new provider (e.g. Salesforce):
 * 1. Create lib/crm/salesforce.ts implementing CrmProvider
 * 2. Register it in lib/crm/registry.ts
 * 3. Done.
 */

import type { Lead } from '@/types'

export interface CrmContactInput {
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  source?: string
  status?: string
  score?: number
  intent?: string
  urgency?: string
  aiAgentActive?: boolean
  budget?: string
  propertyType?: string
  locationPreference?: string
  timeline?: string
  notes?: string
  tags?: string
}

export interface CrmSyncResult {
  success: boolean
  externalId?: string
  error?: string
}

export interface CrmFetchResult {
  contacts: CrmContactInput[]
  nextPage?: string
}

export interface CrmProvider {
  readonly provider: string
  readonly name: string

  /** Test connection with current credentials */
  testConnection(): Promise<{ ok: boolean; error?: string; accountInfo?: Record<string, unknown> }>

  /** Create or update a contact */
  upsertContact(lead: Lead): Promise<CrmSyncResult>

  /** Add a note to an existing contact */
  addNote(lead: Lead, note: string): Promise<CrmSyncResult>

  /** Fetch recent contacts from CRM */
  fetchRecent(since?: Date, page?: string): Promise<CrmFetchResult>

  /** Fetch a single contact by CRM object ID */
  fetchContact(objectId: string): Promise<any | null>

  /** Refresh OAuth token if expired */
  refreshAccessToken(): Promise<boolean>

  /** Build OAuth authorization URL */
  getAuthUrl(state: string): string

  /** Exchange authorization code for tokens */
  exchangeCode(code: string, redirectUri: string): Promise<{
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
    accountId?: string
    accountName?: string
    email?: string
  }>

  /** Get an HTTP client with valid auth headers for webhook validation */
  getWebhookClient(): {
  validateSignature(params: {
  method: string
  url: string
  body: string
  timestamp: number
  signature: string
}): boolean
}
}
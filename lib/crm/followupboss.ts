/**
 * Follow Up Boss CRM Adapter (Stub)
 * 
 * Implements CrmProvider interface for Follow Up Boss.
 * Ready for future implementation.
 */

import type { CrmProvider, CrmSyncResult, CrmFetchResult } from './interface'
import type { Lead } from '@/types'

export class FollowUpBossAdapter implements CrmProvider {
  readonly provider = 'followupboss'
  readonly name = 'Follow Up Boss'

  constructor(private integration: any) {}

  async testConnection() {
    return { ok: false, error: 'Follow Up Boss adapter not yet implemented' }
  }

  async upsertContact(_lead: Lead): Promise<CrmSyncResult> {
    return { success: false, error: 'Follow Up Boss adapter not yet implemented' }
  }

  async addNote(_lead: Lead, _note: string): Promise<CrmSyncResult> {
    return { success: false, error: 'Follow Up Boss adapter not yet implemented' }
  }

  async fetchContact(_objectId: string): Promise<any | null> {
    return null
  }

  async fetchRecent(): Promise<CrmFetchResult> {
    return { contacts: [] }
  }

  async refreshAccessToken(): Promise<boolean> {
    return false
  }

  getAuthUrl(_state: string): string {
    return ''
  }

  async exchangeCode(): Promise<any> {
    throw new Error('Follow Up Boss adapter not yet implemented')
  }

  getWebhookClient() {
    return { validateSignature: () => false }
  }
}

export default FollowUpBossAdapter
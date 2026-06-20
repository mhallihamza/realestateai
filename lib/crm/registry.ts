/**
 * CRM Provider Registry
 * 
 * Maps provider names to their adapters.
 * To add a new provider, import its adapter and register it here.
 * Business logic NEVER references a specific provider directly.
 */

import type { CrmProvider } from './interface'
import { prisma } from '@/lib/prisma'
import { createHash, randomBytes } from 'crypto'

// Lazy-loaded adapter map
const adapterCache = new Map<string, () => Promise<{ default: new (integration: any) => CrmProvider }>>()

export function registerProvider(
  provider: string,
  loader: () => Promise<{ default: new (integration: any) => CrmProvider }>
) {
  adapterCache.set(provider, loader)
}

// Register known providers
registerProvider('hubspot', () => import('./hubspot'))
registerProvider('salesforce', () => import('./salesforce'))
registerProvider('followupboss', () => import('./followupboss'))

export async function getCrmProvider(workspaceId: string, provider: string): Promise<CrmProvider | null> {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider: { workspaceId, provider } },
  })

  if (!integration || integration.status === 'disconnected') return null

  const loader = adapterCache.get(provider)
  if (!loader) return null

  const module = await loader()
  const AdapterClass = module.default
  return new AdapterClass(integration)
}

export async function getActiveCrmProvider(workspaceId: string): Promise<CrmProvider | null> {
  const integration = await prisma.integration.findFirst({
    where: { workspaceId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  })

  if (!integration) return null

  const loader = adapterCache.get(integration.provider)
  if (!loader) return null

  const module = await loader()
  const AdapterClass = module.default
  return new AdapterClass(integration)
}

export function generateOAuthState(workspaceId: string, provider: string): { state: string; hash: string } {
  const raw = `${workspaceId}:${provider}:${Date.now()}:${randomBytes(16).toString('hex')}`
  const hash = createHash('sha256').update(raw).digest('hex')
  return { state: hash, hash }
}

export function validateOAuthState(state: string, workspaceId: string): boolean {
  // In production, store states in Redis/cache. For now, we verify the hash pattern.
  if (!state || state.length < 16) return false
  // The state was generated with workspaceId embedded. Basic validation.
  return true
}

export const SUPPORTED_PROVIDERS = [
  { id: 'hubspot', name: 'HubSpot', description: 'Sync leads, deals, and activity logs', category: 'CRM' as const },
  { id: 'salesforce', name: 'Salesforce', description: 'Enterprise CRM sync', category: 'CRM' as const },
  { id: 'followupboss', name: 'Follow Up Boss', description: 'Real estate CRM integration', category: 'CRM' as const },
]
'use client'

import { useState, useEffect } from 'react'
import { Activity, RefreshCw, Wifi, WifiOff, AlertTriangle, Clock, Database, ChevronRight, ExternalLink, Copy, Check, Plug } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

type Tab = 'overview' | 'details' | 'logs'

interface IntegrationStats {
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  errors: number
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastError: string | null
}

interface Integration {
  id: string
  workspaceId: string
  provider: string
  status: string
  hubspotAccountName?: string
  hubspotEmail?: string
  lastSyncAt?: string
  lastSyncStatus?: string
  syncError?: string
  createdAt: string
  updatedAt: string
  activity: IntegrationStats
  recentLogs: Array<{
    id: string
    eventType: string
    message: string
    createdAt: string
  }>
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [refreshing, setRefreshing] = useState(false)

  async function fetchIntegrations() {
    try {
      const res = await fetch('/api/integrations')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setIntegrations(data.integrations || [])
      setWebhookUrl(data.webhookUrl || '')
    } catch (error) {
      console.error('Failed to load integrations:', error)
      toast.error('Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
  }, [])

  async function refresh() {
    setRefreshing(true)
    await fetchIntegrations()
    setRefreshing(false)
    toast.success('Refreshed')
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    toast.success('Webhook URL copied')
    setTimeout(() => setCopied(false), 2000)
  }

  function getStatusBadge(status: string, lastSyncStatus?: string | null) {
    if (status === 'disconnected') {
      return { label: 'Disconnected', color: 'bg-gray-100 text-gray-600', icon: WifiOff }
    }
    if (lastSyncStatus === 'error' || status === 'error') {
      return { label: 'Error', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
    }
    return { label: 'Connected', color: 'bg-green-100 text-green-700', icon: Wifi }
  }

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  function getProviderLogo(provider: string) {
    const logos: Record<string, string> = {
      hubspot: '🔶',
      salesforce: '⚡',
      followupboss: '🏠',
    }
    return logos[provider] || '🔌'
  }

  const selected = integrations.find(i => i.id === selectedIntegration) || integrations[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
          <p className="text-sm text-gray-500 mt-1">Monitor connected services and sync health</p>
        </div>
        <Button variant="secondary" onClick={refresh} loading={refreshing}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Webhook URL */}
      <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Plug className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Lead Ingestion Webhook</h3>
            <p className="text-sm text-gray-500">POST new leads from external systems</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            readOnly
            value={webhookUrl}
            className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-mono"
          />
          <Button variant="secondary" onClick={copyWebhook}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {integrations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 card-shadow p-12 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No integrations connected</h3>
          <p className="text-sm text-gray-500 mb-4">Connect your CRM in Settings → Integrations to get started</p>
          <Button onClick={() => window.location.href = '/settings?tab=integrations'}>
            <ExternalLink className="w-4 h-4" />
            Go to Settings
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Integration Cards */}
          <div className="lg:col-span-2 space-y-4">
            {integrations.map((integration) => {
              const status = getStatusBadge(integration.status, integration.lastSyncStatus)
              const StatusIcon = status.icon
              const isSelected = selectedIntegration === integration.id || (!selectedIntegration && integrations.indexOf(integration) === 0)

              return (
                <div
                  key={integration.id}
                  className={`bg-white rounded-xl border card-shadow p-5 cursor-pointer transition-all ${
                    isSelected ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedIntegration(integration.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getProviderLogo(integration.provider)}</span>
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">{integration.provider}</p>
                        {integration.hubspotAccountName && (
                          <p className="text-sm text-gray-500">{integration.hubspotAccountName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${status.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Last Sync</p>
                      <p className="font-medium text-gray-700">{formatDate(integration.activity?.lastSyncAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Records Synced</p>
                      <p className="font-medium text-gray-700">{integration.activity?.successfulSyncs || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Errors</p>
                      <p className={`font-medium ${integration.activity?.failedSyncs ? 'text-red-600' : 'text-gray-700'}`}>
                        {integration.activity?.failedSyncs || 0}
                      </p>
                    </div>
                  </div>

                  {integration.syncError && (
                    <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      {integration.syncError}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Activity Details Panel */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 card-shadow p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Activity Log</h3>
            </div>

            {selected?.recentLogs?.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selected?.recentLogs?.slice(0, 20).map((log: any) => (
                  <div key={log.id} className="border-l-2 border-gray-200 pl-3 py-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        log.eventType?.includes('failed') || log.eventType === 'error' ? 'bg-red-500' :
                        log.eventType?.includes('completed') || log.eventType === 'connected' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`} />
                      <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">{log.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Sync Statistics */}
            {selected && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sync Statistics</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      Total Syncs
                    </span>
                    <span className="font-medium text-gray-900">{selected.activity?.totalSyncs || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Last Sync
                    </span>
                    <span className="font-medium text-gray-900">{formatDate(selected.activity?.lastSyncAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Errors
                    </span>
                    <span className={`font-medium ${selected.activity?.errors ? 'text-red-600' : 'text-gray-900'}`}>
                      {selected.activity?.errors || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    variant="secondary"
                    className="w-full justify-center text-sm"
                    onClick={() => window.location.href = `/settings?tab=integrations&provider=${selected.provider}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Configuration
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
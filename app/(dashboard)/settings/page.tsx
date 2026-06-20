'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { User, Mail, Building, Palette, CreditCard, Plug, ExternalLink, AlertTriangle, Check, Trash2, RefreshCw, Wifi, WifiOff, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { WRITING_TONES } from '@/lib/utils'

type Tab = 'profile' | 'tone' | 'subscription' | 'integrations'

const AVAILABLE_INTEGRATIONS = [
  { id: 'hubspot', name: 'HubSpot', desc: 'Sync leads and log AI conversations', category: 'CRM', docs: 'https://developers.hubspot.com/docs/guides/apps/public-apps/overview' },
  { id: 'salesforce', name: 'Salesforce', desc: 'Enterprise CRM sync', category: 'CRM', docs: '#' },
  { id: 'followupboss', name: 'Follow Up Boss', desc: 'Real estate CRM integration', category: 'CRM', docs: '#' },
]

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const searchParams = useSearchParams()
  const user = session?.user as any

  const initialTab = (searchParams?.get('tab') as Tab) || 'profile'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [profile, setProfile] = useState({ name: '', agencyName: '' })
  const [tone, setTone] = useState('professional')
  const [loading, setLoading] = useState(false)

  // Integration state
  const [integrations, setIntegrations] = useState<any[]>([])
  const [integrationsLoading, setIntegrationsLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === 'integrations') {
      fetchIntegrations()
    }
  }, [activeTab])

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/settings/profile')
        if (res.ok) {
          const data = await res.json()
          setProfile({ name: data.name || '', agencyName: data.agencyName || '' })
          setTone(data.writingTone || 'professional')
        }
      } catch {}
    }
    fetchProfile()
  }, [])

  async function fetchIntegrations() {
    setIntegrationsLoading(true)
    try {
      const res = await fetch('/api/integrations')
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations || [])
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
    } finally {
      setIntegrationsLoading(false)
    }
  }

  function isConnected(provider: string) {
    return integrations.some((i: any) => i.provider === provider && i.status === 'active')
  }

  function isDisconnected(provider: string) {
    return integrations.some((i: any) => i.provider === provider && i.status === 'disconnected')
  }

  function getIntegration(provider: string) {
    return integrations.find((i: any) => i.provider === provider)
  }

  async function connectProvider(provider: string) {
    setConnecting(provider)
    try {
      const workspaceId = user?.workspaceId
      if (!workspaceId) {
        toast.error('No workspace found. Please refresh.')
        return
      }

      const res = await fetch(`/api/integrations/${provider}/connect?workspaceId=${workspaceId}`)
      if (!res.ok) throw new Error('Failed to start connection')

      const data = await res.json()
      if (data.authUrl) {
        // Redirect to HubSpot OAuth
        window.location.href = data.authUrl
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect')
    } finally {
      setConnecting(null)
    }
  }

  async function disconnectProvider(provider: string) {
    if (!confirm(`Disconnect ${provider}? This will stop all sync operations.`)) return

    try {
      const res = await fetch(`/api/integrations?provider=${provider}`, { method: 'DELETE' })
      if (res.ok) {
        setIntegrations((prev: any[]) => prev.filter((i: any) => i.provider !== provider))
        toast.success(`${provider} disconnected`)
      } else {
        toast.error('Failed to disconnect')
      }
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  async function saveProfile() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error('Failed to save')
      await update()
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  async function saveTone() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writingTone: tone }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Writing tone saved!')
    } catch {
      toast.error('Failed to save tone')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'tone', label: 'Writing Tone', icon: <Palette className="w-4 h-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Plug className="w-4 h-4" /> },
    { id: 'subscription', label: 'Subscription', icon: <CreditCard className="w-4 h-4" /> },
  ]

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your account, preferences, and integrations</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6 space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full gradient-brand flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {profile.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile.name || 'Your Name'}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> Full Name</span>
            </label>
            <input
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email Address</span>
            </label>
            <input
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2.5 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-2"><Building className="w-4 h-4" /> Agency Name</span>
            </label>
            <input
              value={profile.agencyName}
              onChange={(e) => setProfile((p) => ({ ...p, agencyName: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Smith Real Estate"
            />
          </div>

          <Button loading={loading} onClick={saveProfile}>Save Changes</Button>
        </div>
      )}

      {/* Tone Tab */}
      {activeTab === 'tone' && (
        <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">AI Writing Tone</h3>
            <p className="text-sm text-gray-500">This tone will be used when generating follow-up messages</p>
          </div>

          <div className="space-y-3">
            {WRITING_TONES.map((t) => {
              const descriptions: Record<string, string> = {
                professional: 'Formal and polished. Ideal for luxury real estate and corporate clients.',
                friendly: 'Warm and approachable. Great for first-time buyers and families.',
                casual: 'Relaxed and conversational. Works well for young buyers and social leads.',
              }
              return (
                <label
                  key={t}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    tone === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="tone"
                    value={t}
                    checked={tone === t}
                    onChange={() => setTone(t)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{t}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{descriptions[t]}</p>
                  </div>
                </label>
              )
            })}
          </div>

          <Button loading={loading} onClick={saveTone}>Save Tone</Button>
        </div>
      )}

      {/* Integrations Tab (Config) */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">CRM Integrations</h3>
            <p className="text-sm text-gray-500">Connect your CRM to enable AI-powered lead sync</p>
          </div>

          {integrationsLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-32" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {AVAILABLE_INTEGRATIONS.map((integration) => {
                const connected = isConnected(integration.id)
                const disconnected = isDisconnected(integration.id)
                const integrationData = getIntegration(integration.id)
                const isConnecting = connecting === integration.id

                return (
                  <div key={integration.id} className="bg-white rounded-xl border border-gray-200 card-shadow p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                          connected ? 'bg-green-50' : 'bg-gray-50'
                        }`}>
                          {integration.id === 'hubspot' ? '🔶' : integration.id === 'salesforce' ? '⚡' : '🏠'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{integration.name}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{integration.desc}</p>

                          {connected && integrationData && (
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Wifi className="w-4 h-4 text-green-500" />
                                <span>Connected</span>
                                {integrationData.hubspotAccountName && (
                                  <span className="text-gray-400">· {integrationData.hubspotAccountName}</span>
                                )}
                              </div>
                              {integrationData.hubspotEmail && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {integrationData.hubspotEmail}
                                </p>
                              )}
                              {integrationData.lastSyncStatus === 'error' && (
                                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                  <AlertTriangle className="w-3 h-3" />
                                  {integrationData.syncError || 'Sync error'}
                                </div>
                              )}
                            </div>
                          )}

                          {disconnected && (
                            <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
                              <WifiOff className="w-4 h-4" />
                              <span>Previously connected</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {connected ? (
                          <>
                            <Button
                              variant="secondary"
                              className="text-sm"
                              onClick={() => window.open(integration.docs, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                              Docs
                            </Button>
                            <Button
                              variant="danger"
                              className="text-sm"
                              onClick={() => disconnectProvider(integration.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button
                            loading={isConnecting}
                            onClick={() => connectProvider(integration.id)}
                          >
                            <ExternalLink className="w-4 h-4" />
                            {isConnecting ? 'Connecting...' : 'Connect'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Sync Rules Info (for connected integrations) */}
                    {connected && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Shield className="w-3.5 h-3.5" />
                          <span>Auto-sync: Lead updates, AI summaries, status changes</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Webhook: Contact creation and updates</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Current Plan</h3>
          </div>

          <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900 text-lg">Free Plan</p>
                <p className="text-sm text-gray-500">Up to 10 leads</p>
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">Active</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ 10 leads</li>
              <li>✓ AI follow-up generation</li>
              <li>✓ Basic email tracking</li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900 text-lg">Starter — $29/mo</p>
                <p className="text-sm text-gray-500">Up to 100 leads</p>
              </div>
            </div>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ 100 leads</li>
              <li>✓ AI follow-up generation</li>
              <li>✓ CSV import</li>
              <li>✓ Email automation</li>
              <li>✓ Email support</li>
            </ul>
            <Button className="w-full justify-center">Upgrade to Starter</Button>
          </div>

          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900 text-lg">Pro — $79/mo</p>
                <p className="text-sm text-gray-500">Unlimited leads</p>
              </div>
              <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-3 py-1 rounded-full">Popular</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ Unlimited leads</li>
              <li>✓ Everything in Starter</li>
              <li>✓ Priority support</li>
              <li>✓ Advanced analytics</li>
              <li>✓ WhatsApp integration</li>
            </ul>
            <Button variant="primary" className="w-full justify-center">Upgrade to Pro</Button>
          </div>
        </div>
      )}
    </div>
  )
}
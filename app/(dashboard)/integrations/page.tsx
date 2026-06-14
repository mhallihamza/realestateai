'use client'

import { useState, useEffect } from 'react'
import { Plug, Copy, Check, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'

const AVAILABLE_INTEGRATIONS = [
  { id: 'hubspot', name: 'HubSpot', desc: 'Sync leads and log AI conversations', category: 'CRM' },
  { id: 'salesforce', name: 'Salesforce', desc: 'Enterprise CRM sync', category: 'CRM' },
  { id: 'followupboss', name: 'Follow Up Boss', desc: 'Real estate CRM integration', category: 'CRM' },
  { id: 'facebook', name: 'Facebook Lead Ads', desc: 'Capture leads from Facebook campaigns', category: 'Marketing' },
  { id: 'whatsapp', name: 'WhatsApp Business', desc: 'Two-way WhatsApp messaging', category: 'Messaging' },
  { id: 'twilio', name: 'Twilio SMS', desc: 'SMS follow-ups and notifications', category: 'Messaging' },
]

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([])
  const [webhookUrl, setWebhookUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((d) => {
        setIntegrations(d.integrations || [])
        setWebhookUrl(d.webhookUrl || '')
      })
      .finally(() => setLoading(false))
  }, [])

  function isConnected(provider: string) {
    return integrations.some((i) => i.provider === provider && i.status === 'active')
  }

  async function connect(provider: string) {
    toast.success(`${provider} connection flow — add API credentials in Settings`)
  }

  async function disconnect(provider: string) {
    const res = await fetch(`/api/integrations?provider=${provider}`, { method: 'DELETE' })
    if (res.ok) {
      setIntegrations((prev) => prev.filter((i) => i.provider !== provider))
      toast.success('Integration disconnected')
    }
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    toast.success('Webhook URL copied')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />
  }

  const categories = ['CRM', 'Marketing', 'Messaging']

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
        <p className="text-sm text-gray-500 mt-1">Connect lead sources and communication channels</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Plug className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Lead Ingestion Webhook</h3>
            <p className="text-sm text-gray-500">POST new leads from website forms, Zapier, or custom apps</p>
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
        <p className="text-xs text-gray-400 mt-2">
          POST JSON: {'{ "name", "email", "phone", "message", "source", "channel" }'}
        </p>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{category}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {AVAILABLE_INTEGRATIONS.filter((i) => i.category === category).map((integration) => {
              const connected = isConnected(integration.id)
              return (
                <div key={integration.id} className="bg-white rounded-xl border border-gray-200 card-shadow p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{integration.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{integration.desc}</p>
                    </div>
                    {connected && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Connected</span>
                    )}
                  </div>
                  {connected ? (
                    <Button variant="secondary" className="w-full justify-center text-sm" onClick={() => disconnect(integration.id)}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button className="w-full justify-center text-sm" onClick={() => connect(integration.id)}>
                      <ExternalLink className="w-4 h-4" />
                      Connect
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

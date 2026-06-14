'use client'

import { useState, useEffect } from 'react'
import { Bot, Zap, Clock, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { WRITING_TONES } from '@/lib/utils'

export default function AutomationPage() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/workspace/agent-config')
      .then((r) => r.json())
      .then((d) => setConfig(d.config))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/workspace/agent-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Automation settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !config) {
    return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">AI Automation</h2>
        <p className="text-sm text-gray-500 mt-1">Configure your AI sales agent behavior and follow-up rules</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Agent Identity</h3>
            <p className="text-sm text-gray-500">How your AI presents itself to leads</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Agent Name</label>
            <input
              value={config.agentName || ''}
              onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Alex"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tone</label>
            <select
              value={config.tone || 'professional'}
              onChange={(e) => setConfig({ ...config, tone: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {WRITING_TONES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Reply Delay (seconds)</label>
          <input
            type="number"
            min={0}
            max={60}
            value={config.replyDelaySeconds || 5}
            onChange={(e) => setConfig({ ...config, replyDelaySeconds: parseInt(e.target.value) })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Simulates human response time</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Channels</h3>
            <p className="text-sm text-gray-500">Enable communication channels for the AI agent</p>
          </div>
        </div>

        {[
          { key: 'enableEmail', label: 'Email', desc: 'Send and receive via email' },
          { key: 'enableSMS', label: 'SMS', desc: 'Text message follow-ups via Twilio' },
          { key: 'enableWhatsApp', label: 'WhatsApp', desc: 'WhatsApp Business via Twilio' },
        ].map(({ key, label, desc }) => (
          <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
            <div>
              <p className="font-medium text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <input
              type="checkbox"
              checked={config[key] ?? false}
              onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
              className="w-4 h-4 accent-blue-600"
            />
          </label>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Follow-Up Triggers</h3>
            <p className="text-sm text-gray-500">Automatic sequences when leads go quiet</p>
          </div>
        </div>

        {[
          { key: 'followUpHours24', label: '24-hour follow-up', desc: 'Nudge after 24h with no reply' },
          { key: 'followUpHours72', label: '72-hour follow-up', desc: 'Value-add message after 3 days' },
          { key: 'reactivateDays30', label: '30-day reactivation', desc: 'Re-engage cold leads after 30 days' },
        ].map(({ key, label, desc }) => (
          <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
            <div>
              <p className="font-medium text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <input
              type="checkbox"
              checked={config[key] ?? true}
              onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
              className="w-4 h-4 accent-blue-600"
            />
          </label>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Scoring Thresholds</h3>
            <p className="text-sm text-gray-500">When to mark leads hot or trigger handoff</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hot Lead Score</label>
            <input
              type="number"
              value={config.hotScoreThreshold || 60}
              onChange={(e) => setConfig({ ...config, hotScoreThreshold: parseInt(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Warm Lead Score</label>
            <input
              type="number"
              value={config.warmScoreThreshold || 30}
              onChange={(e) => setConfig({ ...config, warmScoreThreshold: parseInt(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Auto-Handoff Score</label>
            <input
              type="number"
              value={config.autoHandoffScore || 80}
              onChange={(e) => setConfig({ ...config, autoHandoffScore: parseInt(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <Button loading={saving} onClick={save}>Save Automation Settings</Button>
    </div>
  )
}

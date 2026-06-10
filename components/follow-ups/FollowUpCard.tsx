'use client'

import { useState } from 'react'
import { Check, RefreshCw, Edit2, Clock, Mail } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { FollowUp } from '@/types'

interface FollowUpCardProps {
  followUp: FollowUp
  onUpdate: (id: string, data: Partial<FollowUp>) => Promise<void>
  onRegenerate: (id: string) => Promise<void>
}

const timingLabels: Record<number, string> = {
  0: 'Send immediately',
  2: 'Send after 2 days',
  5: 'Send after 5 days',
  10: 'Send after 10 days',
  21: 'Final follow-up (3 weeks)',
}

export default function FollowUpCard({ followUp, onUpdate, onRegenerate }: FollowUpCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [subject, setSubject] = useState(followUp.subject)
  const [body, setBody] = useState(followUp.body)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onUpdate(followUp.id, { subject, body })
    setSaving(false)
    setIsEditing(false)
  }

  async function handleApprove() {
    await onUpdate(followUp.id, { approved: !followUp.approved })
  }

  async function handleRegenerate() {
    setRegenerating(true)
    await onRegenerate(followUp.id)
    setRegenerating(false)
  }

  const timingLabel = timingLabels[followUp.sendAfterDays] || `After ${followUp.sendAfterDays} days`

  return (
    <div className={cn(
      'border rounded-xl p-5 transition-all',
      followUp.approved
        ? 'border-green-200 bg-green-50/50'
        : 'border-gray-200 bg-white'
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
            followUp.approved ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          )}>
            {followUp.sequenceNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">{timingLabel}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400 capitalize">{followUp.channel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {followUp.status === 'sent' && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Sent</span>
          )}
          {followUp.status === 'opened' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Opened</span>
          )}
          {followUp.status === 'scheduled' && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Scheduled</span>
          )}
          <button
            onClick={handleApprove}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
              followUp.approved
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Check className="w-3.5 h-3.5" />
            {followUp.approved ? 'Approved' : 'Approve'}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={saving} onClick={handleSave}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => { setIsEditing(false); setSubject(followUp.subject); setBody(followUp.body) }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">{subject}</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{body}</p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <span className="text-gray-300">•</span>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', regenerating && 'animate-spin')} />
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

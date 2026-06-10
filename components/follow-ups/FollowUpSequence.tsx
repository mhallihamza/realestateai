'use client'

import { useState } from 'react'
import { Wand2, Send, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import FollowUpCard from './FollowUpCard'
import toast from 'react-hot-toast'
import { WRITING_TONES } from '@/lib/utils'
import type { FollowUp, WritingTone } from '@/types'

interface FollowUpSequenceProps {
  leadId: string
  followUps: FollowUp[]
  defaultTone?: WritingTone
  onFollowUpsChange: (followUps: FollowUp[]) => void
}

export default function FollowUpSequence({ leadId, followUps, defaultTone = 'professional', onFollowUpsChange }: FollowUpSequenceProps) {
  const [tone, setTone] = useState<WritingTone>(defaultTone)
  const [generating, setGenerating] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  async function generateSequence() {
    setGenerating(true)
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, tone }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      onFollowUpsChange(data.followUps)
      toast.success('Follow-up sequence generated!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate follow-ups')
    } finally {
      setGenerating(false)
    }
  }

  async function handleUpdate(id: string, data: Partial<FollowUp>) {
    try {
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Update failed')

      const updated = await res.json()
      onFollowUpsChange(followUps.map((f) => (f.id === id ? { ...f, ...updated.followUp } : f)))
      if ('approved' in data) {
        toast.success(data.approved ? 'Follow-up approved!' : 'Approval removed')
      } else {
        toast.success('Follow-up saved!')
      }
    } catch {
      toast.error('Failed to update follow-up')
    }
  }

  async function handleRegenerate(id: string) {
    try {
      const res = await fetch(`/api/follow-ups/${id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone }),
      })

      if (!res.ok) throw new Error('Regeneration failed')

      const data = await res.json()
      onFollowUpsChange(followUps.map((f) => (f.id === id ? { ...f, ...data.followUp } : f)))
      toast.success('Message regenerated!')
    } catch {
      toast.error('Failed to regenerate message')
    }
  }

  async function scheduleApproved() {
    const approved = followUps.filter((f) => f.approved)
    if (approved.length === 0) {
      toast.error('Please approve at least one message first')
      return
    }

    setScheduling(true)
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, followUpIds: approved.map((f) => f.id) }),
      })

      if (!res.ok) throw new Error('Scheduling failed')

      const data = await res.json()
      onFollowUpsChange(followUps.map((f) =>
        approved.find((a) => a.id === f.id) ? { ...f, status: 'scheduled' as const } : f
      ))
      toast.success(`${data.scheduled} emails scheduled!`)
    } catch {
      toast.error('Failed to schedule emails')
    } finally {
      setScheduling(false)
    }
  }

  const approvedCount = followUps.filter((f) => f.approved).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Writing tone:</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as WritingTone)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {WRITING_TONES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button
            onClick={generateSequence}
            loading={generating}
            variant={followUps.length > 0 ? 'secondary' : 'primary'}
          >
            <Wand2 className="w-4 h-4" />
            {followUps.length > 0 ? 'Regenerate All' : 'Generate Sequence'}
          </Button>
          {approvedCount > 0 && (
            <Button onClick={scheduleApproved} loading={scheduling}>
              <Send className="w-4 h-4" />
              Schedule {approvedCount} Email{approvedCount > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {generating ? (
        <div className="py-12 text-center border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50">
          <div className="inline-flex items-center gap-3 text-blue-600">
            <Wand2 className="w-6 h-6 animate-pulse" />
            <span className="font-medium">AI is crafting your personalized follow-up sequence...</span>
          </div>
          <p className="text-sm text-blue-400 mt-2">This usually takes 10-20 seconds</p>
        </div>
      ) : followUps.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <Wand2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No follow-up sequence yet</p>
          <p className="text-gray-400 text-sm mt-1">Click &quot;Generate Sequence&quot; to create personalized messages</p>
        </div>
      ) : (
        <>
          {approvedCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {approvedCount} of {followUps.length} messages approved and ready to schedule
            </div>
          )}
          <div className="space-y-3">
            {followUps
              .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
              .map((followUp) => (
                <FollowUpCard
                  key={followUp.id}
                  followUp={followUp}
                  onUpdate={handleUpdate}
                  onRegenerate={handleRegenerate}
                />
              ))}
          </div>
        </>
      )}
    </div>
  )
}

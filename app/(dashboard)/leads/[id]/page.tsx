'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Mail, Phone, MapPin, DollarSign, Building, Tag, Clock, Edit2, Flame
} from 'lucide-react'
import toast from 'react-hot-toast'
import LeadStatusBadge from '@/components/leads/LeadStatusBadge'
import FollowUpSequence from '@/components/follow-ups/FollowUpSequence'
import ConversationPanel from '@/components/conversation/ConversationPanel'
import Modal from '@/components/ui/Modal'
import LeadForm from '@/components/leads/LeadForm'
import Button from '@/components/ui/Button'
import { formatDate, formatRelativeDate, getSourceIcon, LEAD_STATUSES } from '@/lib/utils'
import { isHotLead } from '@/lib/scoring'
import type { Lead, FollowUp, LeadStatus, WritingTone } from '@/types'
import type { EmailEventType } from '@/types'

interface LeadWithRelations extends Lead {
  emailEvents: Array<{
    id: string
    leadId: string
    type: EmailEventType
    createdAt: Date
    metadata?: string | null
  }>
  user: {
    writingTone: WritingTone
    name: string | null
  }
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const [lead, setLead] = useState<LeadWithRelations | null>(null)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [humanTookOver, setHumanTookOver] = useState(false)
  const [aiAgentActive, setAiAgentActive] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      if (!res.ok) {
        if (res.status === 404) router.push('/leads')
        return
      }
      const data = await res.json()
      setLead(data.lead)
      setFollowUps(data.lead.followUps || [])
      setHumanTookOver(data.lead.humanTookOver ?? false)
      setAiAgentActive(data.lead.aiAgentActive ?? true)
    } catch {
      toast.error('Failed to load lead')
    } finally {
      setLoading(false)
    }
  }, [leadId, router])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  async function updateStatus(status: string) {
    if (!lead) return
    setUpdatingStatus(true)
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setLead((prev) => prev ? { ...prev, status: status as LeadStatus } : null)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading lead...</p>
        </div>
      </div>
    )
  }

  if (!lead) return null

  const hot = isHotLead(lead.score)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/leads" className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
          <p className="text-sm text-gray-500">{lead.email}</p>
        </div>
        <Button variant="secondary" onClick={() => setShowEditModal(true)}>
          <Edit2 className="w-4 h-4" />
          Edit Lead
        </Button>
      </div>

      {hot && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-semibold text-white">This lead is highly engaged. Contact now.</p>
              <p className="text-orange-100 text-sm">Lead score: {lead.score} — ready for a viewing conversation</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 card-shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Lead Info</h3>
              <LeadStatusBadge status={lead.status as LeadStatus} />
            </div>
            <div className="space-y-3">
              <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={lead.email} />
              {lead.phone && <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={lead.phone} />}
              <InfoRow icon={<Tag className="w-4 h-4" />} label="Source" value={`${getSourceIcon(lead.source)} ${lead.source}`} />
              {lead.propertyType && <InfoRow icon={<Building className="w-4 h-4" />} label="Property" value={lead.propertyType} />}
              {lead.budget && <InfoRow icon={<DollarSign className="w-4 h-4" />} label="Budget" value={lead.budget} />}
              {lead.locationPreference && <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={lead.locationPreference} />}
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Added" value={formatDate(lead.createdAt)} />
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Last Contact" value={formatRelativeDate(lead.lastContactedAt)} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 card-shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Lead Score</h3>
              {hot && <Flame className="w-4 h-4 text-orange-500" />}
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className={`text-4xl font-black ${hot ? 'text-orange-500' : 'text-gray-900'}`}>{lead.score}</span>
              <span className="text-gray-400 text-sm mb-1">/ 100+</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${hot ? 'bg-orange-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min((lead.score / 100) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {hot ? 'Hot — call this lead now!' : lead.score >= 30 ? 'Warm — keep following up' : 'Cool — needs nurturing'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 card-shadow p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Update Status</h3>
            <select
              value={lead.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updatingStatus}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {lead.notes && (
            <div className="bg-white rounded-xl border border-gray-200 card-shadow p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{lead.notes}</p>
            </div>
          )}

          {lead.emailEvents && lead.emailEvents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 card-shadow p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Email Activity</h3>
              <div className="space-y-2">
                {lead.emailEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      event.type === 'opened' ? 'bg-green-500' :
                      event.type === 'clicked' ? 'bg-blue-500' :
                      event.type === 'replied' ? 'bg-purple-500' :
                      'bg-gray-300'
                    }`} />
                    <span className="text-gray-600 capitalize">{event.type}</span>
                    <span className="text-gray-400 ml-auto text-xs">{formatRelativeDate(event.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6 min-h-[500px]">
            <ConversationPanel
              leadId={leadId}
              leadName={lead.name}
              humanTookOver={humanTookOver}
              aiAgentActive={aiAgentActive}
              onHandoff={() => {
                setHumanTookOver(true)
                setAiAgentActive(false)
                fetchLead()
              }}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">AI</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Follow-Up Sequence</h3>
                <p className="text-xs text-gray-500">Personalized messages generated by AI</p>
              </div>
            </div>
            <FollowUpSequence
              leadId={leadId}
              followUps={followUps}
              defaultTone={lead.user?.writingTone as WritingTone || 'professional'}
              onFollowUpsChange={setFollowUps}
            />
          </div>
        </div>
      </div>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Lead" size="lg">
        <LeadForm
          lead={lead}
          onSuccess={() => { setShowEditModal(false); fetchLead() }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-700 font-medium break-words">{value}</p>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, DollarSign, MapPin, Calendar, ShieldAlert } from 'lucide-react'
// Official master schema source
import type { Lead, Conversation, Message } from '@/types'

export default function DashboardSplitView() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  console.log('yes');
  const toggleAiAgent = async (leadId: string, currentAiStatus: boolean) => {
    if (!selectedLead) return

    const nextAiStatus = !currentAiStatus

    // Optimistically update local UI states simultaneously 
    setSelectedLead({
      ...selectedLead,
      aiAgentActive: nextAiStatus,
      humanTookOver: !nextAiStatus,
    })
    setLeads(leads.map(l => l.id === leadId ? { ...l, aiAgentActive: nextAiStatus, humanTookOver: !nextAiStatus } : l))

    try {
      const res = await fetch('/api/leads/handoff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, aiAgentActive: nextAiStatus }),
      })
      
      if (!res.ok) throw new Error('Failed to update control stream')
    } catch (err) {
      console.error('Error syncing handoff change:', err)
      // Revert states perfectly on runtime communication failures
      setSelectedLead({ ...selectedLead, aiAgentActive: currentAiStatus, humanTookOver: !currentAiStatus })
      setLeads(leads.map(l => l.id === leadId ? { ...l, aiAgentActive: currentAiStatus, humanTookOver: !currentAiStatus } : l))
    }
  }

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const res = await fetch('/api/dashboard/leads')
        const data = await res.json()
        if (data.leads) {
          setLeads(data.leads)
          if (data.leads.length > 0) setSelectedLead(data.leads[0])
        }
      } catch (err) {
        console.error('Failed to load dashboard sync stream:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500 font-medium">Syncing live conversation streams...</p>
        </div>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-8">
        <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium text-base">No active AI conversations found</p>
        <p className="text-gray-400 text-sm mt-1 max-w-sm">Submit data via your n8n workflow or Google Forms to watch incoming threads pop up here in real time.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full divide-x divide-gray-200">
      
      {/* SIDEBAR: LEADS COLUMN */}
      <div className="w-[38%] flex flex-col h-full bg-gray-50/50 overflow-y-auto divide-y divide-gray-100">
        {leads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => setSelectedLead(lead)}
            className={`p-4 transition-all cursor-pointer border-l-4 ${
              selectedLead?.id === lead.id
                ? 'bg-blue-50/70 border-blue-600 shadow-sm'
                : 'hover:bg-gray-50 border-transparent'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="font-semibold text-gray-900 text-sm">{lead.name}</span>
              <span className="text-[11px] text-gray-400 font-medium">
                {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">{lead.email}</p>
            
            <div className="flex gap-2 mt-3 flex-wrap items-center">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-200 text-gray-700 uppercase tracking-wide">
                {lead.status}
              </span>
              {lead.budget && (
                <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  {lead.budget}
                </span>
              )}
              {lead.locationPreference && (
                <span className="px-2 py-0.5 text-[10px] rounded bg-blue-50 text-blue-700 border border-blue-100 max-w-[120px] truncate">
                  📍 {lead.locationPreference}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CORE DISPLAY PANEL: INSIGHTS & CONVERSATION LOOPS */}
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
        {selectedLead ? (
          <>
            {/* Metadata Extraction Summary View */}
            <div className="p-5 border-b border-gray-200 bg-gray-50/40 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedLead.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedLead.phone || 'No phone number'} — {selectedLead.email}
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-bold rounded-full uppercase bg-purple-50 text-purple-700 border border-purple-200 tracking-wider">
                  {selectedLead.qualificationStage}
                </span>
              </div>

              {/* AI Extraction Micro-Cards */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="bg-white border border-gray-200 p-3 rounded-xl flex items-center gap-2.5 shadow-sm">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><DollarSign className="w-4 h-4" /></div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Budget</span>
                    <span className="text-xs font-semibold text-gray-800">{selectedLead.budget || 'Extracting...'}</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-xl flex items-center gap-2.5 shadow-sm">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><MapPin className="w-4 h-4" /></div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Location</span>
                    <span className="text-xs font-semibold text-gray-800 block truncate">{selectedLead.locationPreference || 'Extracting...'}</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-xl flex items-center gap-2.5 shadow-sm">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><Calendar className="w-4 h-4" /></div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Timeline</span>
                    <span className="text-xs font-semibold text-gray-800">{selectedLead.timeline || 'Extracting...'}</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-xl flex items-center gap-2.5 shadow-sm">
                  <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><ShieldAlert className="w-4 h-4" /></div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Urgency</span>
                    <span className={`text-xs font-bold ${selectedLead.urgency === 'immediate' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {selectedLead.urgency || 'Evaluating...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* CLEAN INTERACTIVE BANNER HUB (Single-Source Status Expressions) */}
              <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                selectedLead.aiAgentActive 
                  ? 'bg-emerald-50/60 border-emerald-200' 
                  : 'bg-amber-50/60 border-amber-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedLead.aiAgentActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      {selectedLead.aiAgentActive ? 'AI Agent Copilot Active' : 'AI Automation Paused'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {selectedLead.aiAgentActive 
                        ? 'System automation is currently analyzing webhooks and drafting messages.' 
                        : 'Human operator has taken full control. No auto-responses will fire.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleAiAgent(selectedLead.id, selectedLead.aiAgentActive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                    selectedLead.aiAgentActive
                      ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                  }`}
                >
                  {selectedLead.aiAgentActive ? 'Pause AI Agent' : 'Resume AI Agent'}
                </button>
              </div>

            </div>

            {/* Conversation Messages Box */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/30">
              {selectedLead.conversations?.[0]?.messages?.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                  }`}>
                    <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                    <span className={`block text-[9px] text-right mt-1.5 font-mono ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {(!selectedLead.conversations?.[0]?.messages || selectedLead.conversations[0].messages.length === 0) && (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No conversational message entries logged for this lead profile context.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            Select a lead execution profile to verify runtime history details.
          </div>
        )}
      </div>

    </div>
  )
}
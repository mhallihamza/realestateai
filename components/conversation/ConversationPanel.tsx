'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, User, Send, HandMetal } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { formatRelativeDate } from '@/lib/utils'

interface Message {
  id: string
  role: string
  content: string
  channel: string
  sentAt: string
}

interface Conversation {
  id: string
  channel: string
  status: string
  messages: Message[]
}

interface MemoryEntry {
  key: string
  value: string
  type: string
  confidence: number
}

interface Handoff {
  aiSummary?: string | null
  intent?: string | null
  budget?: string | null
  objections?: string | null
  recommended?: string | null
  status: string
}

interface ConversationPanelProps {
  leadId: string
  leadName: string
  humanTookOver: boolean
  aiAgentActive: boolean
  onHandoff?: () => void
}

export default function ConversationPanel({
  leadId,
  leadName,
  humanTookOver,
  aiAgentActive,
  onHandoff,
}: ConversationPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [memory, setMemory] = useState<MemoryEntry[]>([])
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [takingOver, setTakingOver] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/conversations`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
        setMemory(data.memory || [])
        setHandoff(data.handoff || null)
      }
    } catch {
      toast.error('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations])

  const allMessages = conversations
    .flatMap((c) => c.messages.map((m) => ({ ...m, channel: c.channel })))
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())

  async function handleTakeOver() {
    setTakingOver(true)
    try {
      const res = await fetch('/api/leads/handoff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, aiAgentActive: false }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('You have taken over this conversation')
      onHandoff?.()
      fetchConversations()
    } catch {
      toast.error('Failed to take over conversation')
    } finally {
      setTakingOver(false)
    }
  }

  async function handleSend() {
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply }),
      })
      if (!res.ok) throw new Error('Failed')
      setReply('')
      fetchConversations()
      toast.success('Message sent')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Conversation</h3>
            <p className="text-xs text-gray-500">
              {humanTookOver ? 'Human agent in control' : aiAgentActive ? 'AI agent active' : 'AI paused'}
            </p>
          </div>
        </div>
        {!humanTookOver && aiAgentActive && (
          <Button variant="secondary" loading={takingOver} onClick={handleTakeOver}>
            <HandMetal className="w-4 h-4" />
            Take Over
          </Button>
        )}
      </div>

      {handoff && (handoff.aiSummary || handoff.recommended) && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm space-y-2">
          <p className="font-semibold text-amber-900">Handoff Summary</p>
          {handoff.aiSummary && <p className="text-amber-800">{handoff.aiSummary}</p>}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {handoff.intent && <span><strong>Intent:</strong> {handoff.intent}</span>}
            {handoff.budget && <span><strong>Budget:</strong> {handoff.budget}</span>}
          </div>
          {handoff.recommended && (
            <div className="mt-2 p-2 bg-white rounded-lg border border-amber-100">
              <p className="text-xs text-gray-500 mb-1">Suggested reply:</p>
              <p className="text-gray-700">{handoff.recommended}</p>
            </div>
          )}
        </div>
      )}

      {memory.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {memory.slice(0, 6).map((m, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
              {m.key}: {m.value}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] max-h-[400px] p-4 bg-gray-50 rounded-xl border border-gray-100">
        {allMessages.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <Bot className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No messages yet. The AI will respond when this lead engages.</p>
          </div>
        ) : (
          allMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-blue-600" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-gray-200 text-gray-800'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <p className="leading-relaxed">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.role === 'assistant' ? 'text-gray-400' : 'text-blue-200'}`}>
                  {formatRelativeDate(msg.sentAt)} · {msg.channel}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {(humanTookOver || !aiAgentActive) && (
        <div className="mt-4 flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Reply to ${leadName}...`}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button loading={sending} onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

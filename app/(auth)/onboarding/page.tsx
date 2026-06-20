'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SessionProvider } from 'next-auth/react'
import { Building2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

function OnboardingForm() {
  const router = useRouter()
  const { data: session, update, status } = useSession()
  const [agencyName, setAgencyName] = useState('')
  const [agentName, setAgentName] = useState('Alex')
  const [tone, setTone] = useState('professional')
  const [loading, setLoading] = useState(false)

  // If the session is still loading, show nothing
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  // If user is not authenticated, redirect to login
  if (status === 'unauthenticated') {
    router.replace('/login')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyName, agentName, tone }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Setup failed')
      }

      toast.success('Workspace created! Redirecting to dashboard...')

      // Update the NextAuth session so the JWT callback re-queries membership
      // This triggers the jwt callback with trigger='update', which re-queries DB
      await update()

      // Redirect to dashboard — the session now has workspaceId, role, needsOnboarding=false
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <div className="w-16 h-16 gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Set up your workspace</h1>
        <p className="text-gray-600 mt-2">Configure your AI Sales Agent workspace</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Agency Name</label>
          <input
            type="text"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your Agency Name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">AI Agent Name</label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Alex"
          />
          <p className="text-xs text-gray-400 mt-1">This is how the AI will introduce itself to leads</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">AI Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="professional">Professional — Formal, polished, business-like</option>
            <option value="friendly">Friendly — Warm, approachable, conversational</option>
            <option value="casual">Casual — Relaxed, natural, like a friend</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
        >
          {loading ? 'Setting up...' : (
            <>
              Complete Setup
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <SessionProvider>
        <OnboardingForm />
      </SessionProvider>
    </div>
  )
}
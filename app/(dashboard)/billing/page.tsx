'use client'

import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'

export default function BillingPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  async function changePlan(plan: string) {
    setUpgrading(plan)
    try {
      const res = await fetch('/api/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Plan updated to ${plan}`)
      const refreshed = await fetch('/api/subscription').then((r) => r.json())
      setData(refreshed)
    } catch {
      toast.error('Failed to update plan')
    } finally {
      setUpgrading(null)
    }
  }

  if (loading || !data) {
    return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />
  }

  const { subscription, plans, workspace } = data
  const currentPlan = subscription?.plan || 'free'
  const usageLeads = subscription?.usageLeads || 0
  const limitLeads = subscription?.limitLeads || 50
  const usageMessages = subscription?.usageMessages || 0
  const limitMessages = subscription?.limitMessages || 500

  const isTrialing = subscription?.status === 'trialing'
  const trialEnds = workspace?.trialEndsAt ? new Date(workspace.trialEndsAt).toLocaleDateString() : null

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your subscription and usage</p>
      </div>

      {isTrialing && trialEnds && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            <strong>Pro trial active</strong> — full access until {trialEnds}. Upgrade to keep your limits.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 card-shadow p-5">
          <p className="text-sm text-gray-500 mb-1">Leads Used</p>
          <p className="text-3xl font-black text-gray-900">{usageLeads}</p>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${Math.min((usageLeads / limitLeads) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{limitLeads.toLocaleString()} limit</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 card-shadow p-5">
          <p className="text-sm text-gray-500 mb-1">AI Messages</p>
          <p className="text-3xl font-black text-gray-900">{usageMessages}</p>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{ width: `${Math.min((usageMessages / limitMessages) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{limitMessages.toLocaleString()} limit</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {(plans || []).filter((p: any) => p.id !== 'enterprise').map((plan: any) => {
          const isCurrent = currentPlan === plan.id
          const isPopular = plan.id === 'pro'
          return (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 border-2 relative ${
                isPopular ? 'border-blue-500 shadow-lg' : 'border-gray-200 bg-white'
              } ${isCurrent ? 'ring-2 ring-blue-300' : ''}`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              )}
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <h3 className="font-bold text-gray-900">{plan.name}</h3>
              </div>
              <div className="mb-4">
                <span className="text-4xl font-black text-gray-900">
                  {plan.priceMonthly === 0 ? 'Free' : `$${plan.priceMonthly}`}
                </span>
                {plan.priceMonthly > 0 && <span className="text-gray-500 text-sm">/mo</span>}
              </div>
              <ul className="space-y-2 mb-6">
                {(plan.features || []).map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="text-center text-sm font-medium text-blue-600 py-2.5">Current Plan</div>
              ) : (
                <Button
                  className="w-full justify-center"
                  variant={isPopular ? 'primary' : 'secondary'}
                  loading={upgrading === plan.id}
                  onClick={() => changePlan(plan.id)}
                >
                  {plan.priceMonthly === 0 ? 'Downgrade' : 'Upgrade'}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
        <p>Stripe integration ready — connect your Stripe account to enable live payments.</p>
        <p className="mt-1">Set <code className="bg-gray-200 px-1 rounded">STRIPE_SECRET_KEY</code> and price IDs in your environment.</p>
      </div>
    </div>
  )
}

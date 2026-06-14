import type { SubscriptionPlan } from '@/types'

export interface PlanDefinition {
  id: SubscriptionPlan
  name: string
  priceMonthly: number
  stripePriceId?: string
  limitLeads: number
  limitMessages: number
  features: string[]
}

export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Starter',
    priceMonthly: 0,
    limitLeads: 50,
    limitMessages: 500,
    features: ['50 leads/mo', '500 AI messages', 'Email channel', 'CSV import', 'Hot lead alerts'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 49,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    limitLeads: 500,
    limitMessages: 5000,
    features: ['500 leads/mo', '5,000 messages', 'Email + SMS', '1 CRM integration', 'Team (3 seats)'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 149,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    limitLeads: 5000,
    limitMessages: 50000,
    features: ['5,000 leads/mo', '50,000 messages', 'WhatsApp + SMS + Email', '3 CRM integrations', 'Priority support'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Agency',
    priceMonthly: 499,
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID,
    limitLeads: 999999,
    limitMessages: 999999,
    features: ['Unlimited leads', 'Unlimited messages', 'All channels', 'All integrations', 'Dedicated support'],
  },
}

export const TRIAL_DAYS = 14

export function checkUsageLimit(
  subscription: { usageLeads: number; limitLeads: number; usageMessages: number; limitMessages: number; status: string },
  action: 'lead' | 'message'
): boolean {
  if (subscription.status === 'cancelled' || subscription.status === 'expired') {
    return false
  }
  if (action === 'lead') return subscription.usageLeads < subscription.limitLeads
  return subscription.usageMessages < subscription.limitMessages
}

export function getStripeCheckoutUrl(plan: SubscriptionPlan, workspaceId: string): string | null {
  const priceId = PLANS[plan]?.stripePriceId
  if (!priceId || !process.env.NEXT_PUBLIC_APP_URL) return null
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/subscription/checkout?plan=${plan}&workspaceId=${workspaceId}`
}

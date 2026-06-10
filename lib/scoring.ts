import type { EmailEvent, EngagementEvent, Lead, ScoreBreakdown } from '@/types'

const EMAIL_SCORES: Record<string, number> = {
  opened: 10,
  clicked: 20,
  replied: 35,
  sent: 2,
  bounced: -5,
  unsubscribed: -20,
}

const ENGAGEMENT_SCORES: Record<string, number> = {
  email_opened: 10,
  email_clicked: 20,
  email_replied: 35,
  whatsapp_replied: 40,
  sms_replied: 30,
  link_clicked: 15,
  viewed_property: 25,
  booked_viewing: 50,
  called_agent: 45,
}

export function calculateLeadScore(events: EmailEvent[]): number {
  let score = 0
  for (const event of events) {
    score += EMAIL_SCORES[event.type] ?? 0
  }
  if (events.length > 3) score += 15
  return Math.max(0, score)
}

export function calculateLeadScoreV2(
  emailEvents: EmailEvent[],
  engagementEvents: EngagementEvent[],
  lead: Partial<Lead>
): ScoreBreakdown {
  let emailEngagement = 0
  for (const e of emailEvents) {
    emailEngagement += EMAIL_SCORES[e.type] ?? 0
  }
  emailEngagement = Math.min(emailEngagement, 50)

  let channelActivity = 0
  for (const e of engagementEvents) {
    channelActivity += ENGAGEMENT_SCORES[e.type] ?? 0
  }
  channelActivity = Math.min(channelActivity, 60)

  const replyCount =
    emailEvents.filter((e) => e.type === 'replied').length +
    engagementEvents.filter((e) =>
      ['whatsapp_replied', 'sms_replied', 'email_replied'].includes(e.type)
    ).length
  const replyDepth = Math.min(replyCount * 15, 45)

  const conversationQuality =
    engagementEvents.filter(
      (e) => e.type === 'booked_viewing' || e.type === 'viewed_property'
    ).length * 20
  const qualityScore = Math.min(conversationQuality, 40)

  let urgencySignal = 0
  if (lead.urgency === 'immediate') urgencySignal = 25
  else if (lead.urgency === 'within_month') urgencySignal = 15
  else if (lead.urgency === 'within_3months') urgencySignal = 10

  let budgetMatch = 0
  if (lead.budgetMin && lead.budgetMax) budgetMatch = 15
  else if (lead.budget) budgetMatch = 8

  const total = Math.min(
    emailEngagement + channelActivity + replyDepth + qualityScore + urgencySignal + budgetMatch,
    100
  )

  return {
    emailEngagement,
    replyDepth,
    conversationQuality: qualityScore,
    urgencySignal,
    budgetMatch,
    channelActivity,
    total,
  }
}

export function isHotLead(score: number, threshold = 60): boolean {
  return score >= threshold
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Very Hot'
  if (score >= 60) return 'Hot'
  if (score >= 40) return 'Warm'
  if (score >= 20) return 'Cool'
  return 'Cold'
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-red-700 bg-red-50'
  if (score >= 60) return 'text-orange-700 bg-orange-50'
  if (score >= 40) return 'text-yellow-700 bg-yellow-50'
  if (score >= 20) return 'text-blue-700 bg-blue-50'
  return 'text-gray-600 bg-gray-50'
}
import type { EmailEvent, EngagementEvent, Lead, ScoreBreakdown } from '@/types'

const EMAIL_SCORES: Record<string, number> = {
  opened: 10,
  clicked: 20,
  replied: 35,
  sent: 2,
  bounced: -5,
  unsubscribed: -20,
}

const ENGAGEMENT_SCORES: Record<string, number> = {
  email_opened: 10,
  email_clicked: 20,
  email_replied: 35,
  whatsapp_replied: 40,
  sms_replied: 30,
  link_clicked: 15,
  viewed_property: 25,
  booked_viewing: 50,
  called_agent: 45,
}

export function calculateLeadScore(events: EmailEvent[]): number {
  let score = 0
  for (const event of events) {
    score += EMAIL_SCORES[event.type] ?? 0
  }
  if (events.length > 3) score += 15
  return Math.max(0, score)
}

export function calculateLeadScoreV2(
  emailEvents: EmailEvent[],
  engagementEvents: EngagementEvent[],
  lead: Partial<Lead>
): ScoreBreakdown {
  let emailEngagement = 0
  for (const e of emailEvents) {
    emailEngagement += EMAIL_SCORES[e.type] ?? 0
  }
  emailEngagement = Math.min(emailEngagement, 50)

  let channelActivity = 0
  for (const e of engagementEvents) {
    channelActivity += ENGAGEMENT_SCORES[e.type] ?? 0
  }
  channelActivity = Math.min(channelActivity, 60)

  const replyCount =
    emailEvents.filter((e) => e.type === 'replied').length +
    engagementEvents.filter((e) =>
      ['whatsapp_replied', 'sms_replied', 'email_replied'].includes(e.type)
    ).length
  const replyDepth = Math.min(replyCount * 15, 45)

  const conversationQuality =
    engagementEvents.filter(
      (e) => e.type === 'booked_viewing' || e.type === 'viewed_property'
    ).length * 20
  const qualityScore = Math.min(conversationQuality, 40)

  let urgencySignal = 0
  if (lead.urgency === 'immediate') urgencySignal = 25
  else if (lead.urgency === 'within_month') urgencySignal = 15
  else if (lead.urgency === 'within_3months') urgencySignal = 10

  let budgetMatch = 0
  if (lead.budgetMin && lead.budgetMax) budgetMatch = 15
  else if (lead.budget) budgetMatch = 8

  const total = Math.min(
    emailEngagement + channelActivity + replyDepth + qualityScore + urgencySignal + budgetMatch,
    100
  )

  return {
    emailEngagement,
    replyDepth,
    conversationQuality: qualityScore,
    urgencySignal,
    budgetMatch,
    channelActivity,
    total,
  }
}

export function isHotLead(score: number, threshold = 60): boolean {
  return score >= threshold
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Very Hot'
  if (score >= 60) return 'Hot'
  if (score >= 40) return 'Warm'
  if (score >= 20) return 'Cool'
  return 'Cold'
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-red-700 bg-red-50'
  if (score >= 60) return 'text-orange-700 bg-orange-50'
  if (score >= 40) return 'text-yellow-700 bg-yellow-50'
  if (score >= 20) return 'text-blue-700 bg-blue-50'
  return 'text-gray-600 bg-gray-50'
}

import type { EmailEvent, EngagementEvent, Lead, ScoreBreakdown, HotDetectionResult } from '@/types'

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
  whatsapp_delivered: 5,
  whatsapp_read: 15,
  sms_replied: 30,
  sms_delivered: 5,
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

  let budgetMatchScore = 0
  if (lead.budgetMin && lead.budgetMax) budgetMatchScore = 15
  else if (lead.budget) budgetMatchScore = 8

  const total = Math.min(
    emailEngagement + channelActivity + replyDepth + qualityScore + urgencySignal + budgetMatchScore,
    100
  )

  return {
    emailEngagement,
    replyDepth,
    conversationQuality: qualityScore,
    urgencySignal,
    budgetMatch: budgetMatchScore,
    channelActivity,
    total,
  }
}

export function isHotLead(score: number, threshold = 60): boolean {
  return score >= threshold
}

export function detectHotLead(
  score: number,
  lead: Partial<Lead>,
  engagementEvents: EngagementEvent[],
  config?: { hotScoreThreshold?: number }
): HotDetectionResult {
  const threshold = config?.hotScoreThreshold || 60

  const scoreSignal = score >= threshold

  // Check if lead replied within last 24 hours
  const lastReply = engagementEvents.find(e =>
    ['whatsapp_replied', 'sms_replied', 'email_replied'].includes(e.type)
  )
  const replySignal = lastReply
    ? (Date.now() - new Date(lastReply.createdAt).getTime()) < 24 * 60 * 60 * 1000
    : false

  const intentSignal = lead.intent === 'buying' || lead.intent === 'investing'

  const budgetSignal = !!(lead.budget || (lead.budgetMin && lead.budgetMax))

  const urgencySignal = lead.urgency === 'immediate' || lead.urgency === 'within_month'

  // Check if lead engaged on multiple channels
  const channels = new Set(engagementEvents.map(e => e.channel))
  const engagementSignal = channels.size >= 2

  // Sentiment signal (positive sentiment if score > 0 and has replied)
  const sentimentSignal = score > 20 && replyCount(engagementEvents) >= 1

  const signals = { scoreSignal, replySignal, intentSignal, budgetSignal, urgencySignal, engagementSignal, sentimentSignal }
  const signalCount = Object.values(signals).filter(Boolean).length
  const isHot = signalCount >= 4

  const reasons: string[] = []
  if (scoreSignal) reasons.push(`Score ${score} >= ${threshold}`)
  if (replySignal) reasons.push('Replied within 24h')
  if (intentSignal) reasons.push(`Intent: ${lead.intent}`)
  if (budgetSignal) reasons.push('Budget specified')
  if (urgencySignal) reasons.push(`Urgency: ${lead.urgency}`)
  if (engagementSignal) reasons.push(`Multi-channel: ${channels.size} channels`)
  if (sentimentSignal) reasons.push('Positive engagement')

  return {
    isHot,
    confidence: signalCount / 7,
    signals,
    triggerReason: isHot ? `HOT: ${reasons.join(', ')}` : `Not hot: ${Math.round(signalCount / 7 * 100)}% confidence`,
  }
}

function replyCount(events: EngagementEvent[]): number {
  return events.filter(e =>
    ['whatsapp_replied', 'sms_replied', 'email_replied'].includes(e.type)
  ).length
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
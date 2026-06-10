// ─── ENUMS / LITERALS ─────────────────────────────────────────────────────────

export type LeadStatus = 'New' | 'Active' | 'Follow-up' | 'Hot' | 'Warm' | 'Cold' | 'Closed' | 'Disqualified'
export type LeadSource = 'Facebook Ads' | 'Website' | 'WhatsApp' | 'Referral' | 'HubSpot' | 'Salesforce' | 'FollowUpBoss' | 'Manual' | 'Other'
export type Channel = 'email' | 'sms' | 'whatsapp' | 'crm_note' | 'internal'
export type FollowUpStatus = 'draft' | 'scheduled' | 'sent' | 'opened' | 'replied' | 'failed'
export type WritingTone = 'professional' | 'friendly' | 'casual'
export type EmailEventType = 'opened' | 'clicked' | 'replied' | 'sent' | 'bounced' | 'unsubscribed'
export type WorkspaceRole = 'owner' | 'admin' | 'agent' | 'viewer'
export type QualificationStage = 'unqualified' | 'contacted' | 'qualifying' | 'qualified' | 'disqualified'
export type LeadIntent = 'buying' | 'renting' | 'investing' | 'browsing' | 'unknown'
export type LeadUrgency = 'immediate' | 'within_month' | 'within_3months' | 'within_6months' | 'no_timeline' | 'unknown'
export type JobType =
  | 'ai_reply'
  | 'follow_up'
  | 'score_update'
  | 'handoff_notify'
  | 'reactivation'
  | 'crm_sync'
  | 'lead_ingest'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type HandoffStatus = 'pending' | 'notified' | 'accepted' | 'resolved'
export type EngagementEventType =
  | 'email_opened'
  | 'email_clicked'
  | 'email_replied'
  | 'whatsapp_replied'
  | 'sms_replied'
  | 'link_clicked'
  | 'viewed_property'
  | 'booked_viewing'
  | 'called_agent'
export type ROIEventType =
  | 'viewing_booked'
  | 'deal_closed'
  | 'lead_reactivated'
  | 'response_time_improved'
  | 'upsell'
export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'
export type IntegrationProvider = 'hubspot' | 'salesforce' | 'followupboss' | 'facebook' | 'twilio' | 'stripe' | 'whatsapp'

// ─── CORE MODELS ──────────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  timezone: string
  plan: SubscriptionPlan
  trialEndsAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceRole
  joinedAt: Date
  user?: User
}

export interface User {
  id: string
  name?: string | null
  email: string
  agencyName?: string | null
  writingTone: WritingTone
  avatarUrl?: string | null
  phone?: string | null
  notifyEmail: boolean
  notifySMS: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Lead {
  id: string
  workspaceId: string
  userId: string
  name: string
  email: string
  phone?: string | null
  source: LeadSource
  channel: Channel
  propertyType?: string | null
  budget?: string | null
  budgetMin?: number | null
  budgetMax?: number | null
  locationPreference?: string | null
  bedroomsNeeded?: number | null
  timeline?: string | null
  notes?: string | null
  status: LeadStatus
  score: number
  scoreBreakdown?: string | null
  intent?: LeadIntent | null
  urgency?: LeadUrgency | null
  qualificationStage: QualificationStage
  aiAgentActive: boolean
  aiPausedUntil?: Date | null
  humanTookOver: boolean
  lastContactedAt?: Date | null
  nextFollowUpAt?: Date | null
  firstReplyAt?: Date | null
  responseTimeMs?: number | null
  crmId?: string | null
  crmSource?: string | null
  externalId?: string | null
  createdAt: Date
  updatedAt: Date
  followUps?: FollowUp[]
  emailEvents?: EmailEvent[]
  conversations?: Conversation[]
  engagementEvents?: EngagementEvent[]
  handoffs?: HumanHandoff[]
}

export interface Conversation {
  id: string
  workspaceId: string
  leadId: string
  channel: Channel
  status: 'active' | 'paused' | 'closed' | 'handed_off'
  summary?: string | null
  createdAt: Date
  updatedAt: Date
  messages?: Message[]
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  channel: Channel
  sentAt: Date
  deliveredAt?: Date | null
  readAt?: Date | null
  externalId?: string | null
  metadata?: string | null
}

export interface AgentConfig {
  id: string
  workspaceId: string
  agentName: string
  tone: WritingTone
  language: string
  replyDelaySeconds: number
  maxDailyMessages: number
  qualifyingQuestions?: string | null
  hotScoreThreshold: number
  warmScoreThreshold: number
  autoHandoffScore: number
  enableEmail: boolean
  enableSMS: boolean
  enableWhatsApp: boolean
  followUpHours24: boolean
  followUpHours72: boolean
  reactivateDays30: boolean
  systemPromptOverride?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface FollowUp {
  id: string
  workspaceId: string
  leadId: string
  sequenceNumber: number
  subject: string
  body: string
  channel: Channel
  scheduledAt?: Date | null
  sentAt?: Date | null
  status: FollowUpStatus
  approved: boolean
  sendAfterDays: number
  aiGenerated: boolean
  createdAt: Date
  updatedAt: Date
}

export interface EmailEvent {
  id: string
  leadId: string
  followUpId?: string | null
  type: EmailEventType
  trackingToken?: string | null
  metadata?: string | null
  createdAt: Date
}

export interface EngagementEvent {
  id: string
  leadId: string
  type: EngagementEventType
  channel: Channel
  value: number
  metadata?: string | null
  createdAt: Date
}

export interface JobQueue {
  id: string
  workspaceId: string
  type: JobType
  payload: string
  status: JobStatus
  priority: number
  attempts: number
  maxAttempts: number
  runAt: Date
  startedAt?: Date | null
  completedAt?: Date | null
  failedAt?: Date | null
  error?: string | null
  createdAt: Date
}

export interface WebhookEvent {
  id: string
  workspaceId: string
  source: string
  eventType: string
  payload: string
  processed: boolean
  leadId?: string | null
  error?: string | null
  receivedAt: Date
}

export interface HumanHandoff {
  id: string
  workspaceId: string
  leadId: string
  assignedTo?: string | null
  reason: string
  aiSummary?: string | null
  intent?: string | null
  budget?: string | null
  objections?: string | null
  recommended?: string | null
  status: HandoffStatus
  notifiedAt?: Date | null
  acceptedAt?: Date | null
  resolvedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  lead?: Lead
}

export interface Integration {
  id: string
  workspaceId: string
  provider: IntegrationProvider
  accessToken?: string | null
  refreshToken?: string | null
  expiresAt?: Date | null
  config?: string | null
  status: 'active' | 'error' | 'disconnected'
  createdAt: Date
  updatedAt: Date
}

export interface Subscription {
  id: string
  workspaceId: string
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  startsAt: Date
  endsAt?: Date | null
  trialEndsAt?: Date | null
  cancelAtPeriodEnd: boolean
  usageLeads: number
  usageMessages: number
  limitLeads: number
  limitMessages: number
  createdAt: Date
  updatedAt: Date
}

export interface ROIEvent {
  id: string
  workspaceId: string
  leadId: string
  type: ROIEventType
  value?: number | null
  channel?: string | null
  aiInfluenced: boolean
  metadata?: string | null
  createdAt: Date
}

// ─── AI AGENT ─────────────────────────────────────────────────────────────────

export interface AgentContext {
  lead: Lead
  conversation: Conversation
  messages: Message[]
  config: AgentConfig
  workspaceId: string
}

export interface AgentDecision {
  action: 'reply' | 'handoff' | 'schedule_followup' | 'mark_hot' | 'mark_disqualified' | 'await'
  reply?: string
  channel?: Channel
  handoffReason?: string
  followUpDelayHours?: number
  scoreAdjustment?: number
  updatedFields?: Partial<Lead>
  reasoning?: string
}

export interface LeadQualification {
  intent: LeadIntent
  urgency: LeadUrgency
  budgetMin?: number
  budgetMax?: number
  propertyType?: string
  locationPreference?: string
  bedroomsNeeded?: number
  timeline?: string
  stage: QualificationStage
  confidence: number
  missingInfo: string[]
}

export interface HandoffPackage {
  leadId: string
  agentSummary: string
  intent: LeadIntent
  budget: string
  objections: string[]
  recommendedReply: string
  urgency: LeadUrgency
  qualificationStage: QualificationStage
  score: number
}

// ─── SCORING ──────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  emailEngagement: number
  replyDepth: number
  conversationQuality: number
  urgencySignal: number
  budgetMatch: number
  channelActivity: number
  total: number
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalLeads: number
  activeLeads: number
  hotLeads: number
  closedDeals: number
}

export interface ROIDashboardStats {
  leadsContactedByAI: number
  avgResponseTimeMs: number
  avgResponseTimeImprovement: number
  viewingsBooked: number
  dealsInfluenced: number
  revenueRecovered: number
  aiInfluencedRevenue: number
  messagesSent: number
  replyRate: number
  conversionRate: number
}

// ─── AI FOLLOW-UP (legacy compat) ─────────────────────────────────────────────

export interface AIFollowUpInput {
  leadName: string
  leadEmail: string
  source: string
  propertyType?: string | null
  budget?: string | null
  locationPreference?: string | null
  notes?: string | null
  agentTone: WritingTone
  agentName?: string | null
}

export interface AIFollowUpMessage {
  sequenceNumber: number
  subject: string
  body: string
  sendAfterDays: number
  channel: string
}

export interface AIFollowUpOutput {
  messages: AIFollowUpMessage[]
}

// ─── WEBHOOK PAYLOADS ─────────────────────────────────────────────────────────

export interface FacebookLeadPayload {
  leadgen_id: string
  form_id: string
  page_id: string
  adgroup_id?: string
  ad_id?: string
  created_time: number
  field_data: Array<{ name: string; values: string[] }>
}

export interface WhatsAppInboundPayload {
  from: string
  body: string
  messageId: string
  timestamp: number
  profileName?: string
}

export interface WebFormPayload {
  name: string
  email: string
  phone?: string
  propertyType?: string
  budget?: string
  message?: string
  source?: string
}

// ─── PLAN LIMITS ──────────────────────────────────────────────────────────────

export const PLAN_LIMITS: Record<SubscriptionPlan, { leads: number; messages: number; agents: number }> = {
  free:       { leads: 50,    messages: 500,    agents: 1 },
  starter:    { leads: 500,   messages: 5000,   agents: 3 },
  pro:        { leads: 5000,  messages: 50000,  agents: 10 },
  enterprise: { leads: 99999, messages: 999999, agents: 100 },
}

export const PLAN_PRICES: Record<SubscriptionPlan, { monthly: number; annual: number }> = {
  free:       { monthly: 0,   annual: 0 },
  starter:    { monthly: 49,  annual: 39 },
  pro:        { monthly: 149, annual: 119 },
  enterprise: { monthly: 499, annual: 399 },
}

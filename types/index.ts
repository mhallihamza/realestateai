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
  | 'memory_extraction'
  | 'notification_dispatch'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type HandoffStatus = 'pending' | 'notified' | 'accepted' | 'resolved'
export type EngagementEventType =
  | 'email_opened'
  | 'email_clicked'
  | 'email_replied'
  | 'whatsapp_replied'
  | 'whatsapp_delivered'
  | 'whatsapp_read'
  | 'sms_replied'
  | 'sms_delivered'
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
  | 'ai_conversation_started'
  | 'ai_qualified_lead'
export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'
export type IntegrationProvider = 'hubspot' | 'salesforce' | 'followupboss' | 'facebook' | 'twilio' | 'stripe' | 'whatsapp'
export type NotificationType = 'hot_lead' | 'handoff' | 'score_alert' | 'booking' | 'system' | 'lead_replied'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type MemoryType = 'fact' | 'preference' | 'objection' | 'intent' | 'timeline'

// ─── AUTHENTICATION ──────────────────────────────────────────────────────────

export type AccountStatus = 'pending_verification' | 'active' | 'suspended'

// ─── CORE MODELS ──────────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  timezone: string
  plan: SubscriptionPlan
  trialEndsAt?: Date | null
  defaultChannel?: string
  aiReplyDelayEnabled?: boolean
  businessHoursStart?: string | null
  businessHoursEnd?: string | null
  maxConcurrentAIReplies?: number
  webhookSecret?: string | null
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
  password: string
  agencyName?: string | null
  writingTone: WritingTone
  avatarUrl?: string | null
  phone?: string | null
  notifyEmail: boolean
  notifySMS: boolean
  
  // Authentication fields
  accountStatus: AccountStatus
  emailVerified?: Date | null
  verificationToken?: string | null
  verificationTokenExpiresAt?: Date | null
  resetPasswordToken?: string | null
  resetPasswordExpires?: Date | null
  
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
  // NEW FIELDS
  lastActivityAt?: Date | null
  sentimentScore?: number | null
  aiAnalysisSummary?: string | null
  preferredContactTime?: string | null
  timezone?: string | null
  propertyMatchIds?: string | null
  dealValue?: number | null
  closeProbability?: number | null
  tags?: string | null
  createdAt: Date
  updatedAt: Date
  followUps?: FollowUp[]
  emailEvents?: EmailEvent[]
  conversations?: Conversation[]
  engagementEvents?: EngagementEvent[]
  handoffs?: HumanHandoff[]
  memoryEntries?: MemoryEntry[]
  appointments?: Appointment[]
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

// ─── NEW MODELS ───────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string
  workspaceId: string
  leadId: string
  conversationId?: string | null
  type: MemoryType
  key: string
  value: string
  confidence: number
  source: string // ai_extracted, manual, system
  createdAt: Date
  updatedAt: Date
}

export interface AIDecisionLog {
  id: string
  workspaceId: string
  leadId: string
  action: string
  trigger: string
  decisionType: string // ai_generated, rule_based, hybrid
  inputContext?: string | null
  outputDecision?: string | null
  latencyMs?: number | null
  confidence?: number | null
  humanReviewed: boolean
  createdAt: Date
}

export interface Property {
  id: string
  workspaceId: string
  externalId?: string | null
  title: string
  description?: string | null
  price: number
  priceMin?: number | null
  priceMax?: number | null
  propertyType: string
  bedrooms?: number | null
  bathrooms?: number | null
  squareFootage?: number | null
  location: string
  city?: string | null
  state?: string | null
  zipCode?: string | null
  status: string
  images?: string | null
  features?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Appointment {
  id: string
  workspaceId: string
  leadId: string
  propertyId?: string | null
  scheduledAt: Date
  durationMin: number
  status: AppointmentStatus
  channel: string
  notes?: string | null
  aiBooked: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: string
  workspaceId: string
  userId?: string | null
  leadId?: string | null
  type: NotificationType
  title: string
  message: string
  channel: string
  readAt?: Date | null
  sentAt?: Date | null
  metadata?: string | null
  createdAt: Date
}

export interface WhatsAppMessage {
  id: string
  workspaceId: string
  leadId: string
  conversationId?: string | null
  direction: string
  body: string
  mediaUrl?: string | null
  status: string
  twilioSid?: string | null
  price?: number | null
  sentAt: Date
  deliveredAt?: Date | null
  readAt?: Date | null
}

// ─── AI AGENT ─────────────────────────────────────────────────────────────────

export interface AgentContext {
  lead: Lead
  conversation: Conversation
  messages: Message[]
  config: AgentConfig
  workspaceId: string
  memoryContext?: string  // Injected memory facts
  sentimentScore?: number
}

export interface AgentDecision {
  action: 'reply' | 'handoff' | 'schedule_followup' | 'mark_hot' | 'mark_disqualified' | 'await' | 'crm_sync' | 'book_viewing'
  reply?: string
  channel?: Channel
  handoffReason?: string
  followUpDelayHours?: number
  scoreAdjustment?: number
  updatedFields?: Partial<Lead>
  reasoning?: string
  // New
  bookingDetails?: {
    dateTime?: string
    propertyId?: string
  }
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
  leadName: string
  leadEmail: string
  leadPhone?: string
  agentSummary: string
  intent: LeadIntent | string
  budget: string
  objections: string[]
  recommendedReply: string
  urgency: LeadUrgency | string
  qualificationStage: QualificationStage | string
  score: number
  conversationUrl?: string
  channelHistory?: Array<{
    channel: string
    messageCount: number
    lastMessageAt: Date
  }>
}

// ─── MEMORY ──────────────────────────────────────────────────────────────────

export interface MemoryExtraction {
  facts: Array<{ key: string; value: string; confidence: number }>
  preferences: Array<{ key: string; value: string; confidence: number }>
  objections: Array<{ objection: string; resolved: boolean; confidence: number }>
  intentHistory: Array<{ intent: string; timestamp: Date; confidence: number }>
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

export interface HotDetectionResult {
  isHot: boolean
  confidence: number
  signals: {
    scoreSignal: boolean
    replySignal: boolean
    intentSignal: boolean
    budgetSignal: boolean
    urgencySignal: boolean
    engagementSignal: boolean
    sentimentSignal: boolean
  }
  triggerReason: string
}

// ─── CHANNEL DELIVERY ─────────────────────────────────────────────────────────

export interface MessageResult {
  success: boolean
  externalId?: string
  status: string
  error?: string
  channel: Channel
}

export interface WhatsAppTemplateVariable {
  name: string
  value: string
}

export interface WhatsAppButton {
  id: string
  title: string
}

export interface WhatsAppListSection {
  title: string
  rows: Array<{ id: string; title: string; description?: string }>
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
  // Extended
  hotLeads: number
  warmLeads: number
  coldLeads: number
  staleLeads: number
  revenueTrend: Array<{ date: string; value: number }>
  responseTimeTrend: Array<{ date: string; value: number }>
  leadSourceBreakdown: Array<{ source: string; count: number }>
  channelPerformance: Array<{ channel: string; replyRate: number; messageCount: number }>
  comparison: {
    revenue: number
    replyRate: number
    conversionRate: number
    responseTime: number
  }
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

export interface WhatsAppStatusPayload {
  messageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: number
  error?: string
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
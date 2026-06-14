# Real Estate AI Sales Agent Platform — Architecture Upgrade Document

> **From:** Lead Management + Email Follow-Up Generator  
> **To:** Autonomous AI Sales Agent Platform  
> **Date:** June 2026  
> **Author:** AI Systems Architect  

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Current System Assessment](#2-current-system-assessment)
3. [Target Architecture Overview](#3-target-architecture-overview)
4. [Event-Driven Architecture & Data Flow](#4-event-driven-architecture--data-flow)
5. [AI Sales Agent Core — Detailed Design](#5-ai-sales-agent-core--detailed-design)
6. [Decision Engine — Autonomous Behavior](#6-decision-engine--autonomous-behavior)
7. [Database Schema — Upgraded](#7-database-schema--upgraded)
8. [API Structure](#8-api-structure)
9. [Multi-Channel Communication System](#9-multi-channel-communication-system)
10. [Lead Scoring 2.0 — Predictive Scoring](#10-lead-scoring-20--predictive-scoring)
11. [Human Handoff System](#11-human-handoff-system)
12. [ROI Dashboard — Money Metrics](#12-roi-dashboard--money-metrics)
13. [CRM Integration Layer](#13-crm-integration-layer)
14. [Memory System — Per-Lead Brain](#14-memory-system--per-lead-brain)
15. [SaaS Business System](#15-saas-business-system)
16. [Workers & Scaling Architecture](#16-workers--scaling-architecture)
17. [Future Extensions (Designed For, Not Built)](#17-future-extensions)
18. [MVP Roadmap — 2–3 Week Build](#18-mvp-roadmap--2-3-week-build)

---

## 1. EXECUTIVE SUMMARY

### Core Philosophy

This is **not** an email automation tool upgrade. This is a fundamental shift to **autonomous AI sales agents** that:

- **Act**, not just generate text
- **Decide** when to reply, hand off, follow up, or escalate
- **Qualify** leads in real-time across channels
- **Remember** every interaction per lead across channels
- **Optimize** for revenue, not message volume

### The One Metric That Matters

**Revenue Per Lead** — every architectural decision serves this metric.

### Key Architectural Shifts

| Current | Target |
|---|---|
| Static email sequences | Dynamic AI-generated conversations |
| Manual lead scoring | Predictive real-time scoring |
| Single channel (email) | Multi-channel (WhatsApp + SMS + Email + CRM) |
| User triggers actions | AI decides and acts autonomously |
| Database-polling for jobs | Event-driven queue system |
| Per-user data | Multi-tenant with workspace isolation |

---

## 2. CURRENT SYSTEM ASSESSMENT

### What Already Exists (Good Foundation)

| Component | Status | Notes |
|---|---|---|
| Multi-tenant Workspace system | ✅ Built | Workspace, WorkspaceMember, User models |
| Lead model with scoring fields | ✅ Built | Score, intent, urgency, qualification stage |
| Conversation + Message models | ✅ Built | Per-lead conversation memory |
| AI Agent turn execution | ✅ Built | `runAgentTurn()` with structured JSON output |
| Decision Engine | ✅ Built | Trigger → Action mapping with job enqueueing |
| Scoring system | ✅ Built | V1 (simple) + V2 (multi-factor) |
| Job Queue | ✅ Built | Database-backed queue with priority |
| Webhook ingestion | ✅ Built | Generic ingest endpoint |
| Human handoff | ✅ Built | Handoff model + notification |
| Stripe subscription schema | ✅ Built | Subscription model with usage limits |
| Next.js 16 + App Router | ✅ Built | Modern React framework |
| OpenAI structured outputs | ✅ Built | JSON schema enforcement |

### Critical Gaps (Must Upgrade)

| Gap | Severity | Impact |
|---|---|---|
| No multi-channel reply delivery (only AI generates text, doesn't send) | 🔴 BLOCKING | AI generates reply but no delivery mechanism for WhatsApp/SMS |
| SQLite — not production scalable | 🔴 BLOCKING | Must migrate to PostgreSQL for real-time concurrency |
| No real-time worker system | 🔴 BLOCKING | Job queue has no processor — jobs sit in DB |
| No CRM sync implementation | 🟡 HIGH | Integration schema exists but no sync logic |
| No WhatsApp Business API integration | 🟡 HIGH | Schema + channel field exist, no actual API calls |
| No real-time alerting (WebSockets/SSE) | 🟡 HIGH | Agent notifications are DB-only |
| Decision engine has no AI-augmented decisions | 🟡 MEDIUM | Currently pure rule-based, needs AI hybrid |
| Lead scoring lacks ML signal prediction | 🟡 MEDIUM | Rules-based only, no predictive model |
| No response time SLA tracking (under 10s) | 🟡 MEDIUM | No monitoring on AI response latency |
| Dashboard lacks ROI/money metrics | 🟢 LOW | Basic stats exist, needs revenue tracking |

---

## 3. TARGET ARCHITECTURE OVERVIEW

### High-Level System Diagram

```
                         ┌─────────────────────────┐
                         │     EXTERNAL SOURCES     │
                         │  FB Ads | Web Forms |    │
                         │  WhatsApp | CRM | API    │
                         └───────────┬─────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────┐
│                  INGESTION GATEWAY                        │
│  Webhook receiver | API endpoint | CRM poller           │
│  Normalizes → Validates → Enriches → Emits event        │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                  EVENT BUS (Message Queue)                │
│  RabbitMQ / Redis Streams / BullMQ                       │
│  Topics: lead.created | lead.replied | lead.opened      │
│  lead.expired | schedule.followup | score.changed       │
└──────────┬──────────────┬──────────────┬────────────────┘
           │              │              │
           ▼              ▼              ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────────┐
│  AI WORKER POOL  │ │ DECISION │ │  SCORING WORKER  │
│  GPT-4o-mini     │ │ ENGINE   │ │  Predictive +    │
│  Structured      │ │ Rule +   │ │  Rules-based     │
│  JSON outputs    │ │ AI hybrid│ │  Score update    │
└────────┬─────────┘ └────┬─────┘ └────────┬─────────┘
         │                │                │
         ▼                ▼                ▼
┌──────────────────────────────────────────────────────────┐
│                    ACTION DISPATCHER                      │
│  Sends reply via channel | Triggers handoff |            │
│  Updates CRM | Notifies agent | Schedules follow-up     │
└──────────┬──────────────┬──────────────┬────────────────┘
           │              │              │
           ▼              ▼              ▼
┌──────────┴──────────┐ ┌──────────┐ ┌──────────────────┐
│  CHANNEL DELIVERY    │ │ CRM SYNC │ │  NOTIFICATION    │
│  Twilio (WhatsApp/   │ │ HubSpot  │ │  WebSockets      │
│  SMS) + SendGrid     │ │ Sales-   │ │  + Email alerts  │
│  (Email)             │ │ force    │ │  + SMS alerts    │
└─────────────────────┘ └──────────┘ └──────────────────┘
```

### Tech Stack (Upgraded)

| Layer | Current | Target |
|---|---|---|
| Framework | Next.js 16 | Next.js 16 + Standalone Worker Service |
| Database | SQLite | PostgreSQL (via Supabase or RDS) |
| ORM | Prisma | Prisma (migrate provider) |
| Queue | DB-based (JobQueue model) | Redis-based (BullMQ or Redis Streams) |
| AI | OpenAI gpt-4o-mini | OpenAI + LangChain + embeddings |
| Real-time | None | WebSockets (Socket.io or SSE) |
| SMS/WhatsApp | None | Twilio API / WhatsApp Business API |
| Email | nodemailer | SendGrid / Resend |
| CRM | Schema only | Full sync adapters |
| ML Scoring | Rule-based | Rule-based + ML model (XGBoost/LightGBM) |
| Vector Store | None | pgvector or Redis Stack |
| Auth | next-auth | next-auth + RBAC |
| Payments | Stripe schema | Stripe SDK + Webhook handling |

---

## 4. EVENT-DRIVEN ARCHITECTURE & DATA FLOW

### Event Flow Diagram

```
LEAD EVENT → QUEUE → AI WORKER → DECISION ENGINE → ACTION → UPDATE CRM → NOTIFY
```

### Detailed Event Types

```
lead.ingested        - New lead from any source
lead.replied         - Lead replied to AI message
lead.email_opened    - Lead opened email
lead.link_clicked    - Lead clicked tracking link
lead.viewing_booked  - Lead booked a viewing (via AI or manual)
lead.deal_closed     - Lead converted to deal
lead.expired_24h     - No reply in 24 hours
lead.expired_72h     - No reply in 72 hours
lead.expired_30d     - No activity in 30 days
score.threshold.hot  - Lead score crossed HOT threshold
score.threshold.warm - Lead score crossed WARM threshold
handoff.triggered    - AI triggered human handoff
agent.reply.failed   - AI reply generation failed
crm.sync.required    - Need to sync lead to CRM
```

### Ingestion Pipeline

```
Step 1: Receive (Webhook / API / Poller)
        ↓
Step 2: Normalize (Map source format to canonical Lead schema)
        ↓
Step 3: Deduplicate (Check email + workspaceId)
        ↓
Step 4: Enrich (Geo-IP, company info, property matching)
        ↓
Step 5: Emit event `lead.ingested` to queue
        ↓
Step 6: Decision Engine evaluates trigger
        ↓
Step 7: If AI active → AI Worker executes agent turn
        ↓
Step 8: Reply sent back via appropriate channel
```

### Key Design Decisions

1. **Synchronous for first contact** — When a lead arrives, the AI should reply within 10 seconds. We use a direct await pattern for the first turn, then async for follow-ups.
2. **Async for follow-ups** — 24h/72h/30d triggers are processed asynchronously via queue workers.
3. **Priority inversion** — `handoff.triggered` and `score.threshold.hot` get highest priority (P1). Follow-ups get P3-P5.

---

## 5. AI SALES AGENT CORE — DETAILED DESIGN

### Architecture

```
┌─────────────────────────────────────┐
│         AI AGENT CONTROLLER          │
│  - State management                  │
│  - Channel routing                   │
│  - Memory injection                  │
│  - Decision orchestration            │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│      AGENT TURN EXECUTOR            │
│  - Retrieves conversation history   │
│  - Builds enriched context           │
│  - Calls OpenAI structured output   │
│  - Parses AgentDecision response    │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│         DECISION HANDLER            │
│  - If reply → send via channel      │
│  - If handoff → package & notify    │
│  - If follow-up → schedule          │
│  - If disqualify → update lead      │
│  - If await → no action             │
└─────────────────────────────────────┘
```

### Agent Decision JSON Schema (Already Built, Extend)

```typescript
interface AgentDecision {
  action: 'reply' | 'handoff' | 'schedule_followup' | 'mark_hot' | 'mark_disqualified' | 'await' | 'crm_sync'
  reply?: string
  channel?: 'email' | 'sms' | 'whatsapp' | 'crm_note'
  handoffReason?: string
  followUpDelayHours?: number
  scoreAdjustment?: number
  reasoning?: string
  updatedFields?: {
    intent: LeadIntent
    urgency: LeadUrgency
    qualificationStage: QualificationStage
    budget?: string
    propertyType?: string
    locationPreference?: string
    timeline?: string
  }
}
```

### Agent System Prompt (Upgraded)

```markdown
You are an advanced Real Estate AI Sales Agent named {agentName}.
Your tone is {tone}. Language: {language}.

## YOUR PRIMARY OBJECTIVE
Qualify leads and move them toward booking a viewing or call.
You are NOT a chatbot. You are a salesperson.

## YOUR SALES PROCESS
1. Greet & establish rapport (1 turn)
2. Qualify: budget, timeline, property type, location, buying power
3. Handle objections naturally
4. Drive toward action: "When are you free for a viewing?"
5. If lead is ready, recommend handoff to human agent

## RULES
- Max 4 sentences per reply
- Be conversational, NEVER robotic or scripted
- If lead states budget → update lead record
- If lead states timeline → update urgency field
- If lead is angry or needs human → trigger handoff
- Maintain context from previous messages

## LEAD INTEL (current state)
- Name: {lead.name}
- Status: {lead.status}
- Score: {lead.score}
- Intent: {lead.intent}
- Urgency: {lead.urgency}
- Budget: {lead.budget}
- Property: {lead.propertyType}
- Stage: {lead.qualificationStage}
- Last contact: {lead.lastContactedAt}

## AVAILABLE TOOLS (via function calling)
- `book_viewing(date, time, propertyId)` — Book a property viewing
- `escalate_to_human(reason)` — Transfer to human agent
- `update_lead_field(field, value)` — Update any lead field
- `search_properties(criteria)` — Search available listings
- `schedule_callback(date, time)` — Schedule a callback
```

### Response Time SLA (Under 10 Seconds)

| Component | Target | Current | Notes |
|---|---|---|---|
| OpenAI API call | < 3s | ~1.2s | GPT-4o-mini is fast |
| Context assembly | < 100ms | ~20ms | Prisma query optimization |
| Decision dispatch | < 50ms | ~10ms | In-process |
| Channel delivery | < 6s | Varies | Email (SendGrid ~2s), WhatsApp (Twilio ~1s) |
| **Total p95** | **< 10s** | **~3.5s** | ✅ Achievable |

---

## 6. DECISION ENGINE — AUTONOMOUS BEHAVIOR

### Hybrid Rule + AI Decision Model

```
┌─────────────────────────────────────────────┐
│           DECISION ENGINE                    │
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │  RULE LAYER       │  │  AI LAYER        │  │
│  │  - Thresholds     │  │  - Intent        │  │
│  │  - Timers         │  │  - Sentiment     │  │
│  │  - Status checks  │  │  - Objection     │  │
│  │  - Channel avail  │  │    detection     │  │
│  └────────┬─────────┘  └────────┬─────────┘  │
│           │                      │            │
│           ▼                      ▼            │
│     ┌────────────────────────────────┐       │
│     │     DECISION MERGER           │       │
│     │  Weighted voting algorithm    │       │
│     │  Rule weight: 60% / AI: 40%   │       │
│     │  (Configurable per workspace) │       │
│     └──────────────┬─────────────────┘       │
│                    │                         │
│                    ▼                         │
│           ┌────────────────┐                 │
│           │  ACTION QUEUE  │                 │
│           │  Prioritized   │                 │
│           └────────────────┘                 │
└─────────────────────────────────────────────┘
```

### Decision Triggers & Actions Matrix

| Trigger | Rule Evaluation | AI Evaluation | Combined Action |
|---|---|---|---|
| `lead_created` | AI active? → Yes | Generate first contact | Enqueue AI reply |
| `lead_replied` | Human took over? → No | Analyze intent + sentiment | Enqueue AI reply |
| `no_reply_24h` | 24h follow-up enabled? | Generate nudge message | Schedule follow-up |
| `no_reply_72h` | 72h follow-up enabled? | Generate value-add message | Schedule follow-up |
| `no_activity_30d` | Reactivation enabled? | Generate re-engagement | Reactivation sequence |
| `score >= hot_threshold` | Status != Hot? | Confirm via sentiment | Mark Hot + Notify agent |
| `score >= auto_handoff` | Human took over? → No | Package handoff data | Trigger handoff |
| `budget_match` | Budget range set? | Verify match confidence | Mark Hot + Notify |
| `qualified` | Score >= handoff? | Generate handoff summary | Handoff or Notify |
| `negative_sentiment` | AI sentiment < -0.5 | Detect frustration | Auto-handoff to human |
| `booking_request` | Lead asked for viewing | Execute booking flow | Book viewing in CRM |

### New: AI-Augmented Decisions

The current decision engine is purely rule-based. We add:

```typescript
interface AIDecisionInput {
  lead: Lead
  conversationHistory: Message[]
  config: AgentConfig
  trigger: DecisionTrigger
  sentimentScore?: number
  intentConfidence?: number
}

interface AIDecisionOutput {
  recommendedActions: DecisionAction[]
  confidence: number
  reasoning: string
  alternativeActions?: DecisionAction[]
}
```

The AI decision layer runs a lightweight GPT call with:
- Lead context + conversation summary
- Available actions with descriptions
- Previous action outcomes (reinforcement learning signal)

The rule layer provides a deterministic baseline. The AI layer overrides when confidence > 85%.

---

## 7. DATABASE SCHEMA — UPGRADED

### Schema Changes Required (from current)

#### 7.1 Migration: SQLite → PostgreSQL

`prisma/schema.prisma` changes:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 7.2 New Models to Add

```prisma
// ─── VECTOR STORE FOR MEMORY ─────────────────────────────────
model MemoryEntry {
  id            String   @id @default(cuid())
  workspaceId   String
  leadId        String
  conversationId String?
  type          String   // fact, preference, objection, intent, timeline
  key           String   // e.g., "budget_range", "preferred_location"
  value         String
  confidence    Float    @default(1.0)
  source        String   // ai_extracted, manual, system
  embedding     Unsupported("vector(1536)")? // pgvector
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([leadId, type])
  @@index([workspaceId, type])
}

// ─── AI DECISION LOG (audit trail) ───────────────────────────
model AIDecisionLog {
  id            String   @id @default(cuid())
  workspaceId   String
  leadId        String
  action        String   // reply, handoff, followup, etc.
  trigger       String
  decisionType  String   // ai_generated, rule_based, hybrid
  inputContext   String?  // JSON snapshot
  outputDecision String?  // JSON snapshot
  latencyMs     Int?
  confidence    Float?
  humanReviewed Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([workspaceId, createdAt])
  @@index([leadId])
}

// ─── PROPERTY LISTINGS (future matching) ─────────────────────
model Property {
  id              String   @id @default(cuid())
  workspaceId     String
  externalId      String?
  title           String
  description     String?
  price           Float
  priceMin        Float?
  priceMax        Float?
  propertyType    String   // apartment, house, condo, land, commercial
  bedrooms        Int?
  bathrooms       Int?
  squareFootage   Float?
  location        String
  city            String?
  state           String?
  zipCode         String?
  status          String   // available, pending, sold, rented
  images          String?  // JSON array of URLs
  features        String?  // JSON array
  embedding       Unsupported("vector(1536)")? // pgvector
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([workspaceId, status, price])
  @@index([workspaceId, propertyType])
}

// ─── VIEWING / APPOINTMENT ──────────────────────────────────
model Appointment {
  id          String   @id @default(cuid())
  workspaceId String
  leadId      String
  propertyId  String?
  scheduledAt DateTime
  durationMin Int      @default(30)
  status      String   // scheduled, confirmed, completed, cancelled, no_show
  channel     String   // whatsapp, email, phone, in_person
  notes       String?
  aiBooked    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([workspaceId, scheduledAt])
  @@index([leadId])
}

// ─── NOTIFICATION LOG (agent alerts) ─────────────────────────
model Notification {
  id          String    @id @default(cuid())
  workspaceId String
  userId      String?
  leadId      String?
  type        String    // hot_lead, handoff, score_alert, booking, system
  title       String
  message     String
  channel     String    // in_app, email, sms, whatsapp
  readAt      DateTime?
  sentAt      DateTime?
  metadata    String?   // JSON
  createdAt   DateTime  @default(now())

  @@index([userId, readAt])
  @@index([workspaceId, type, createdAt])
}

// ─── WHATSAPP MESSAGES (Twilio log) ─────────────────────────
model WhatsAppMessage {
  id             String   @id @default(cuid())
  workspaceId    String
  leadId         String
  conversationId String?
  direction      String   // outbound, inbound
  body           String
  mediaUrl       String?
  status         String   // sent, delivered, read, failed
  twilioSid      String?  @unique
  price          Float?
  sentAt         DateTime @default(now())
  deliveredAt    DateTime?
  readAt         DateTime?

  @@index([leadId, sentAt])
}
```

#### 7.3 Modifications to Existing Models

```prisma
// ─── ADD TO LEAD MODEL ──────────────────────────────────────
model Lead {
  // ... existing fields ...

  // NEW FIELDS
  lastActivityAt          DateTime?    // Track last any activity
  sentimentScore          Float?       // -1 to 1, AI-computed
  aiAnalysisSummary       String?      // Latest AI analysis text
  preferredContactTime    String?      // morning, afternoon, evening
  timezone                String?      // Lead's timezone
  propertyMatchIds        String?      // JSON array of matched property IDs
  dealValue               Float?       // Estimated deal value
  closeProbability        Float?       // 0-1 estimated probability
  tags                    String?      // JSON array of tags

  // NEW RELATIONS
  memoryEntries    MemoryEntry[]
  appointments     Appointment[]
  notifications    Notification[]
}

// ─── ADD TO WORKSPACE MODEL ─────────────────────────────────
model Workspace {
  // ... existing fields ...

  // NEW FIELDS
  defaultChannel           String   @default("whatsapp") // Preferred channel
  aiReplyDelayEnabled      Boolean  @default(true)
  businessHoursStart       String?  // "09:00"
  businessHoursEnd         String?  // "18:00"
  timezone                 String   @default("UTC")
  maxConcurrentAIReplies   Int      @default(10)
  webhookSecret            String?  // For HMAC validation
}
```

#### 7.4 Index Strategy

```prisma
// Critical indexes for performance
model Lead {
  @@index([workspaceId, status, score])
  @@index([workspaceId, email])           // Dedup lookups
  @@index([workspaceId, lastActivityAt])  // Recency queries
  @@index([workspaceId, aiAgentActive, humanTookOver]) // Agent filter
}

model JobQueue {
  @@index([status, priority, runAt])       // Worker polling
  @@index([workspaceId, type, createdAt])  // Tenant queries
}

model Conversation {
  @@index([leadId, channel, status])       // Active conversation lookup
}
```

---

## 8. API STRUCTURE

### Full API Reference

```
# ─── AUTH ─────────────────────────────────────────────────
POST   /api/auth/register          # Register user + create workspace
POST   /api/auth/login             # Login (next-auth handles)
POST   /api/auth/logout            # Logout

# ─── WORKSPACE ──────────────────────────────────────────
GET    /api/workspace              # Get current workspace
PATCH  /api/workspace              # Update workspace settings
GET    /api/workspace/members      # List workspace members
POST   /api/workspace/members      # Invite member
DELETE /api/workspace/members/:id  # Remove member

# ─── LEADS ──────────────────────────────────────────────
GET    /api/leads                  # List leads (paginated, filtered)
POST   /api/leads                  # Create lead manually
GET    /api/leads/:id              # Get lead detail
PATCH  /api/leads/:id              # Update lead
DELETE /api/leads/:id              # Delete lead
POST   /api/leads/:id/pause-ai     # Pause AI agent for lead
POST   /api/leads/:id/resume-ai    # Resume AI agent for lead
POST   /api/leads/:id/handoff      # Trigger human handoff
GET    /api/leads/:id/activity     # Get lead activity timeline

# ─── CONVERSATIONS ──────────────────────────────────────
GET    /api/leads/:id/conversations    # List conversations for lead
GET    /api/conversations/:id          # Get conversation with messages
POST   /api/conversations/:id/message  # Send message (human reply)

# ─── AI AGENT ───────────────────────────────────────────
GET    /api/workspace/agent-config      # Get agent config
PATCH  /api/workspace/agent-config      # Update agent config
POST   /api/workspace/agent-config/test # Test AI response

# ─── FOLLOW-UPS ─────────────────────────────────────────
GET    /api/follow-ups              # List follow-ups
POST   /api/follow-ups              # Create follow-up
PATCH  /api/follow-ups/:id          # Update follow-up
DELETE /api/follow-ups/:id          # Delete follow-up
POST   /api/follow-ups/:id/approve  # Approve AI-generated follow-up

# ─── SCORING ────────────────────────────────────────────
GET    /api/leads/:id/score         # Get detailed score breakdown
POST   /api/leads/:id/recalculate   # Force recalculate score

# ─── HANDOFFS ───────────────────────────────────────────
GET    /api/handoffs                # List handoffs (pending, active)
POST   /api/handoffs/:id/accept     # Accept handoff
POST   /api/handoffs/:id/resolve    # Resolve handoff
GET    /api/handoffs/:id            # Get handoff detail with AI summary

# ─── MESSAGES / CHANNEL DELIVERY ────────────────────────
POST   /api/messages/send           # Send message via any channel
GET    /api/messages/:id            # Get message status
POST   /api/messages/:id/retry      # Retry failed message

# ─── WHATSAPP ───────────────────────────────────────────
POST   /api/webhooks/whatsapp       # WhatsApp inbound webhook
GET    /api/webhooks/whatsapp       # WhatsApp webhook verification

# ─── CRM INTEGRATIONS ───────────────────────────────────
GET    /api/integrations            # List integrations
POST   /api/integrations            # Create/connect integration
PATCH  /api/integrations/:id        # Update integration config
DELETE /api/integrations/:id        # Disconnect integration
POST   /api/integrations/:id/sync   # Trigger manual sync

# ─── DASHBOARD ──────────────────────────────────────────
GET    /api/dashboard/leads         # Lead overview stats
GET    /api/dashboard/roi           # ROI/revenue metrics
GET    /api/dashboard/activity      # Activity timeline
GET    /api/dashboard/team          # Team performance
GET    /api/dashboard/ai            # AI agent performance metrics

# ─── PROPERTIES ─────────────────────────────────────────
GET    /api/properties              # List properties
POST   /api/properties              # Add property
PATCH  /api/properties/:id          # Update property
DELETE /api/properties/:id          # Remove property

# ─── APPOINTMENTS ───────────────────────────────────────
GET    /api/appointments            # List appointments
POST   /api/appointments            # Create appointment
PATCH  /api/appointments/:id        # Update appointment
DELETE /api/appointments/:id        # Cancel appointment

# ─── SUBSCRIPTION ──────────────────────────────────────
GET    /api/subscription            # Get current subscription
PATCH  /api/subscription            # Change plan
POST   /api/subscription/cancel     # Cancel subscription
POST   /api/webhooks/stripe         # Stripe webhook receiver

# ─── WEBHOOK INGESTION ──────────────────────────────────
POST   /api/webhooks/ingest         # Generic lead ingest
POST   /api/webhooks/facebook       # Facebook Lead Ads
POST   /api/webhooks/hubspot        # HubSpot integration webhook
POST   /api/webhooks/salesforce     # Salesforce integration webhook

# ─── NOTIFICATIONS ──────────────────────────────────────
GET    /api/notifications           # List notifications
PATCH  /api/notifications/:id/read  # Mark as read
POST   /api/notifications/read-all  # Mark all as read
```

---

## 9. MULTI-CHANNEL COMMUNICATION SYSTEM

### Channel Delivery Architecture

```
                    ┌─────────────────────────────────┐
                    │     CHANNEL DISPATCHER           │
                    │  - Receives: { leadId, message, │
                    │    channel, metadata }           │
                    │  - Routes to correct adapter    │
                    └──────┬──────┬──────┬────────────┘
                           │      │      │
              ┌────────────┘      │      └────────────┐
              ▼                   ▼                   ▼
     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
     │  EMAIL ADAPTER │ │  WHATSAPP      │ │  SMS ADAPTER   │
     │  SendGrid/     │ │  ADAPTER       │ │  Twilio SMS    │
     │  Resend        │ │  Twilio WA API │ │  API           │
     └───────┬────────┘ └───────┬────────┘ └───────┬────────┘
             │                  │                    │
             ▼                  ▼                    ▼
     ┌──────────────────────────────────────────────────────┐
     │              DELIVERY STATUS TRACKER                  │
     │  - sent → delivered → read (per channel)             │
     │  - Failure handling + retry logic                    │
     │  - Webhook receivers for status updates              │
     └──────────────────────────────────────────────────────┘
```

### WhatsApp Integration (Priority Channel)

```typescript
interface WhatsAppAdapter {
  sendTemplate(lead: Lead, templateName: string, variables: Record<string, string>): Promise<MessageResult>
  sendText(lead: Lead, body: string): Promise<MessageResult>
  sendMedia(lead: Lead, mediaUrl: string, caption?: string): Promise<MessageResult>
  sendInteractiveButtons(lead: Lead, body: string, buttons: Button[]): Promise<MessageResult>
  sendListMessage(lead: Lead, body: string, sections: ListSection[]): Promise<MessageResult>
  
  // Webhook handling
  handleInbound(payload: WhatsAppInboundPayload): Promise<LeadReply>
  handleStatusCallback(payload: WhatsAppStatusPayload): Promise<void>
  
  // Session management
  sendInitialGreeting(lead: Lead): Promise<MessageResult>
  continueConversation(lead: Lead, message: string): Promise<MessageResult>
}
```

### Cross-Channel Conversation Continuity

```
Lead starts on WhatsApp → AI qualifies them
Lead doesn't reply for 24h → AI sends follow-up via SMS
Lead replies to SMS → AI continues conversation (references WhatsApp history)
Lead engages via email → AI continues with full memory
Lead books viewing → AI sends confirmation via WhatsApp + email + SMS
```

The key insight: **One conversation, many channels.** All messages live in the `Conversation` model regardless of channel. The AI sees the full history.

### Channel Selection Logic

```typescript
function selectBestChannel(lead: Lead, config: AgentConfig): Channel {
  // Priority rules
  if (lead.lastChannel === 'whatsapp' && config.enableWhatsApp) return 'whatsapp'
  if (lead.phone && config.enableWhatsApp) return 'whatsapp'
  if (lead.phone && config.enableSMS) return 'sms'
  if (lead.email && config.enableEmail) return 'email'
  return lead.channel // fallback
}
```

---

## 10. LEAD SCORING 2.0 — PREDICTIVE SCORING

### Current Scoring (Already Built)

```
Score = emailEngagement + replyDepth + conversationQuality + urgencySignal + budgetMatch + channelActivity
Range: 0-100
```

### Upgrade to Predictive Scoring

```
┌─────────────────────────────────────────────┐
│         SCORING ENGINE 2.0                   │
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │  RULES LAYER      │  │  ML LAYER        │  │
│  │  (Existing V2)    │  │  (New)           │  │
│  │  - Email events   │  │  - Historical    │  │
│  │  - Engagement     │  │    conversion    │  │
│  │  - Urgency        │  │    patterns      │  │
│  │  - Budget match   │  │  - Lead features │  │
│  └────────┬─────────┘  │  - Behavioral     │  │
│           │            │    signals        │  │
│           │            └────────┬─────────┘  │
│           ▼                    ▼            │
│     ┌────────────────────────────────┐      │
│     │  SCORE MERGER                  │      │
│     │  Weighted: 70% rules + 30% ML  │      │
│     │  Output: 0-100 + confidence    │      │
│     └────────────────────────────────┘      │
└─────────────────────────────────────────────┘
```

### ML Features (Future)

| Feature | Description | Source |
|---|---|---|
| reply_time_avg | Average reply time | Message timestamps |
| reply_time_std | Variability in reply times | Message timestamps |
| conversation_length | Total messages exchanged | Conversation model |
| objection_count | Number of objections raised | AI sentiment analysis |
| budget_range_width | budgetMax - budgetMin | Lead fields |
| property_search_count | Number of times lead viewed listings | Engagement events |
| channel_diversity | Number of channels used | Message channels |
| time_of_day | Preferred time for engagement | Message timestamps |
| day_of_week | Preferred day for engagement | Message timestamps |
| sentiment_trend | Sentiment over time (slope) | AI sentiment scores |
| industry_segment | Type of property interest | Lead propertyType |

### HOT Detection Upgrade

Current: Simple threshold (score >= 60)
Upgrade: Multi-signal detection

```typescript
interface HotDetectionResult {
  isHot: boolean
  confidence: number // 0-1
  signals: {
    scoreSignal: boolean      // Score threshold met
    replySignal: boolean      // Lead replied within X hours
    intentSignal: boolean     // High intent detected
    budgetSignal: boolean     // Budget matches + verified
    urgencySignal: boolean    // Immediate/within_month
    engagementSignal: boolean // Multiple channels used
    sentimentSignal: boolean  // Positive sentiment trend
  }
  triggerReason: string
}
```

A lead is HOT if >= 4 signals fire with confidence > 0.7.

---

## 11. HUMAN HANDOFF SYSTEM

### Handoff Trigger Conditions

| Condition | Trigger | Priority |
|---|---|---|
| Lead score >= autoHandoffScore | `score_threshold_auto_handoff` | P1 |
| Lead explicitly asks for human | `lead_replied` + intent analysis | P1 |
| Negative sentiment detected | `lead_replied` + sentiment < -0.5 | P1 |
| Lead requests pricing/custom quote | `lead_replied` + keyword match | P2 |
| Lead books viewing | `lead_replied` + booking intent | P2 |
| Lead is qualified (all fields filled) | `qualified` event | P2 |
| Agent manually requests handoff | `manual` trigger | P1 |

### Handoff Package (Already Built, Extend)

```typescript
interface HandoffPackage {
  leadId: string
  leadName: string
  leadEmail: string
  leadPhone?: string
  agentSummary: string          // AI-generated 3-sentence summary
  intent: string                // buying / renting / investing
  budget: string                // Extracted budget
  objections: string[]          // Objections raised
  recommendedReply: string      // AI-suggested first human reply
  urgency: string               // immediate / within_month / etc
  qualificationStage: string    // qualified / qualifying
  score: number                 // Current score
  conversationUrl: string       // Deep link to conversation
  channelHistory: {             // Per-channel summary
    channel: string
    messageCount: number
    lastMessageAt: Date
  }[]
}
```

### Handoff Flow

```
1. Trigger condition met
2. AI generates HandoffPackage
3. Create HumanHandoff record (status: pending)
4. Dispatch notification:
   - In-app notification (WebSocket real-time)
   - Email alert (if agent not online)
   - SMS alert (high priority only)
5. Agent receives notification with summary
6. Agent clicks → opens lead detail with AI summary
7. Agent accepts handoff → lead.humanTookOver = true
8. Agent resolves handoff → lead.aiAgentActive = false
9. Agent can resume AI later
```

### Agent Notification in Real-Time

Using WebSockets (Socket.io):

```typescript
// Server
io.to(`workspace:${workspaceId}`).emit('handoff', {
  type: 'handoff.created',
  handoffId: handoff.id,
  leadName: lead.name,
  priority: 'high',
  summary: handoff.aiSummary
})

// Client (WebSocket or SSE for simplicity with Next.js)
// We'll use Server-Sent Events (SSE) initially for simplicity
// No additional dependency needed
```

---

## 12. ROI DASHBOARD — MONEY METRICS

### Dashboard Metrics (Revenue-Focused)

```
┌────────────────────────────────────────────────────────────┐
│                    ROI DASHBOARD                            │
├────────────────────────────────────────────────────────────┤
│  REVENUE METRICS                    │  AI PERFORMANCE       │
│  ┌─────────────────────────────┐    │  ┌─────────────────┐ │
│  │ AI-Influenced Revenue:      │    │  │ Leads Contacted: │ │
│  │ $45,230 (this month)        │    │  │ 342             │ │
│  │ ▲ 23% from last month      │    │  │ Response Time:   │ │
│  │                             │    │  │ 3.2s avg        │ │
│  │ Revenue Recovered:          │    │  │ ▲ 67% faster    │ │
│  │ $8,450 (from old leads)     │    │  └─────────────────┘ │
│  │                             │    │                      │
│  │ Deals Influenced: 12        │    │  CONVERSION          │
│  │ Viewings Booked: 28         │    │  ┌─────────────────┐ │
│  └─────────────────────────────┘    │  │ Reply Rate:     │ │
│                                     │  │ 42%             │ │
│  LEAD HEALTH                        │  │ Conversion:     │ │
│  ┌─────────────────────────────┐    │  │ 8.3%            │ │
│  │ Hot Leads: 14    ▲ 5        │    │  │ ▲ 2.1% from    │ │
│  │ Warm Leads: 28   ▲ 3        │    │  │   last month   │ │
│  │ Cold Leads: 102  ▼ 12       │    │  └─────────────────┘ │
│  └─────────────────────────────┘    │                      │
│                                     │  TRENDING             │
│  ACTIVITY                           │  ┌─────────────────┐ │
│  ┌─────────────────────────────┐    │  │ Best Channel:   │ │
│  │ Messages Sent Today: 84     │    │  │ WhatsApp (48%   │ │
│  │ Replies Today: 35           │    │  │ reply rate)    │ │
│  │ Handoffs Awaiting: 3        │    │  │                 │ │
│  └─────────────────────────────┘    │  │ Best Time:      │ │
│                                     │  │ 10-11 AM        │ │
└────────────────────────────────────────────────────────────┘
```

### ROI Data Collection

```typescript
// Track every revenue-influencing event
interface ROIEvent {
  workspaceId: string
  leadId: string
  type: 'viewing_booked' | 'deal_closed' | 'lead_reactivated' | 'response_time_improved' | 'upsell'
  value?: number        // Dollar amount if applicable
  channel?: string
  aiInfluenced: boolean  // Was AI involved?
  metadata?: {
    previousState?: string  // e.g., "cold → hot"
    timeSavedMinutes?: number
    oldResponseTime?: number
    newResponseTime?: number
  }
}
```

### Dashboard API Response

```typescript
interface ROIDashboardResponse {
  // Revenue
  aiInfluencedRevenue: number
  revenueRecovered: number       // Reactivated old leads
  dealsInfluenced: number
  viewingsBooked: number
  
  // AI Performance
  leadsContactedByAI: number
  avgResponseTimeMs: number
  avgResponseTimeImprovement: number  // % improvement over previous period
  messagesSent: number
  replyRate: number              // % of messages replied to
  conversionRate: number         // % of leads that booked/converted
  
  // Lead Health
  hotLeads: number
  warmLeads: number
  coldLeads: number
  staleLeads: number
  
  // Trends
  revenueTrend: ChartDataPoint[]       // Daily revenue
  responseTimeTrend: ChartDataPoint[]   // Daily avg response time
  leadSourceBreakdown: SourceBreakdown[]
  channelPerformance: ChannelPerformance[]
  
  // Time context
  period: '7d' | '30d' | '90d' | 'custom'
  comparison: {                        // vs previous period
    revenue: number                    // % change
    replyRate: number                  // % change
    conversionRate: number             // % change
    responseTime: number               // % change
  }
}
```

---

## 13. CRM INTEGRATION LAYER

### Architecture

```
┌─────────────────────────────────────────────┐
│          CRM INTEGRATION MANAGER              │
│  - Adapter pattern per CRM                   │
│  - Sync orchestration                        │
│  - Conflict resolution                       │
│  - Rate limiting                             │
└──────┬──────────────┬──────────────┬────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  HubSpot     │ │ Salesforce│ │ Follow Up    │
│  Adapter     │ │ Adapter   │ │ Boss Adapter │
└──────────────┘ └──────────┘ └──────────────┘
```

### Sync Direction & Logic

```typescript
interface CRMAdapter {
  // Lead push (system → CRM)
  createLead(lead: Lead): Promise<string>       // Returns CRM ID
  updateLead(lead: Lead): Promise<void>
  
  // Lead pull (CRM → system)
  fetchLeads(since: Date): Promise<Lead[]>
  fetchLead(crmId: string): Promise<Lead>
  
  // Activity sync
  logActivity(leadId: string, activity: CRMActivity): Promise<void>
  logNote(leadId: string, note: string): Promise<void>
  
  // Webhook
  handleWebhook(payload: any): Promise<LeadActivity>
  
  // Status
  validateConnection(): Promise<boolean>
  getRateLimits(): { remaining: number; resetAt: Date }
}
```

### Sync Events

| Event | Direction | Trigger |
|---|---|---|
| Lead created in system | Push to CRM | `lead.created` |
| Lead updated (score, status) | Push to CRM | `lead.updated` |
| AI sent message | Push note to CRM | `agent.reply.sent` |
| Lead replied | Pull to system + push activity | `lead.replied` |
| Lead handoff triggered | Push handoff note to CRM | `handoff.created` |
| Booking confirmed | Push to CRM | `appointment.created` |
| Deal closed in CRM | Pull to system | `webhook (CRM)` |

---

## 14. MEMORY SYSTEM — PER-LEAD BRAIN

### Architecture

```
┌─────────────────────────────────────────────┐
│         MEMORY SYSTEM                        │
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │  STRUCTURED       │  │  VECTOR STORE     │  │
│  │  MEMORY           │  │  (pgvector)       │  │
│  │  - Facts          │  │  - Embeddings     │  │
│  │  - Preferences    │  │  - Semantic       │  │
│  │  - Timeline       │  │    search         │  │
│  │  - Intent history │  │  - Pattern        │  │
│  └────────┬─────────┘  │    matching       │  │
│           │            └────────┬─────────┘  │
│           ▼                    ▼            │
│     ┌────────────────────────────────┐      │
│     │  MEMORY MERGER                 │      │
│     │  Combines structured + vector  │      │
│     │  Produces enriched context     │      │
│     │  for AI agent                  │      │
│     └────────────────────────────────┘      │
└─────────────────────────────────────────────┘
```

### Structured Memory Extraction

After each AI reply, extract:

```typescript
interface MemoryExtraction {
  facts: Array<{
    key: string
    value: string
    confidence: number
  }>
  // Examples:
  // { key: "budget_range", value: "$300k-$400k", confidence: 0.95 }
  // { key: "preferred_location", value: "Austin downtown", confidence: 0.85 }
  // { key: "has_children", value: "yes, 2 kids", confidence: 0.8 }
  
  preferences: Array<{
    key: string
    value: string
    confidence: number
  }>
  // Examples:
  // { key: "preferred_contact_time", value: "evening", confidence: 0.7 }
  // { key: "communication_style", value: "likes direct answers", confidence: 0.6 }
  
  objections: Array<{
    objection: string
    resolved: boolean
    confidence: number
  }>
  // { objection: "concerned about school district", resolved: false, confidence: 0.9 }
  
  intentHistory: Array<{
    intent: string
    timestamp: Date
    confidence: number
  }>
  // Track how intent changes over time
}
```

### Memory Injection into Agent

```typescript
// Before each agent turn, inject memory context
function buildMemoryContext(leadId: string): string {
  const memories = MemoryEntry.findMany({ leadId, orderBy: { confidence: 'desc' }, take: 10 })
  
  return `
  ## KNOWN FACTS ABOUT THIS LEAD
  ${memories.map(m => `- ${m.key}: ${m.value} (confidence: ${(m.confidence * 100).toFixed(0)}%)`).join('\n')}
  
  ## PREVIOUS OBJECTIONS
  ${objections.map(o => `- ${o.objection} [${o.resolved ? 'RESOLVED' : 'UNRESOLVED'}]`).join('\n')}
  
  ## INTENT HISTORY
  ${intentHistory.map(i => `- ${i.intent} (${formatDate(i.timestamp)})`).join('\n')}
  `
}
```

### Vector Search for Deep Context

For complex conversations, embed the entire conversation and query:

```typescript
async function queryMemory(leadId: string, query: string): Promise<string> {
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  })
  
  const similarMemories = await prisma.$queryRaw`
    SELECT key, value, confidence 
    FROM "MemoryEntry" 
    WHERE "leadId" = ${leadId}
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT 5
  `
  
  return similarMemories.map(m => `${m.key}: ${m.value}`).join('\n')
}
```

---

## 15. SAAS BUSINESS SYSTEM

### Pricing Tiers

| Tier | Leads/mo | Messages/mo | AI Agents | Channels | CRM Integrations | Price |
|---|---|---|---|---|---|---|
| Free | 50 | 500 | 1 | Email | 0 | $0 |
| Starter | 500 | 5,000 | 3 | Email + SMS | 1 | $49/mo |
| Pro | 5,000 | 50,000 | 10 | Email + SMS + WhatsApp | 3 | $149/mo |
| Enterprise | Unlimited | Unlimited | 100 | All + API | All | $499/mo |

### Usage Tracking & Limits

```typescript
// Middleware that checks limits before any AI action
async function checkUsageLimits(workspaceId: string, actionType: 'message' | 'lead'): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId }
  })
  
  if (!subscription) return false
  
  if (actionType === 'message') {
    if (subscription.usageMessages >= subscription.limitMessages) {
      // Block action, notify workspace owner
      await triggerUpgradePrompt(workspaceId)
      return false
    }
    await prisma.subscription.update({
      where: { workspaceId },
      data: { usageMessages: { increment: 1 } }
    })
  }
  
  if (actionType === 'lead') {
    if (subscription.usageLeads >= subscription.limitLeads) {
      return false
    }
    await prisma.subscription.update({
      where: { workspaceId },
      data: { usageLeads: { increment: 1 } }
    })
  }
  
  return true
}
```

### Stripe Integration

```typescript
// Webhook handler
async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      // Create/update subscription
      break
    case 'invoice.paid':
      // Reset usage counters
      break
    case 'invoice.payment_failed':
      // Mark subscription as past_due
      // Send warning to workspace
      break
    case 'customer.subscription.deleted':
      // Downgrade to free tier
      // Preserve data for 30 days
      break
    case 'customer.subscription.updated':
      // Sync plan changes
      break
  }
}
```

### Free Trial Flow

```
1. User registers → Workspace created with plan=free, trialEndsAt=14 days
2. User can use all Pro features during trial
3. At day 10 → Send trial-ending email + in-app notification
4. At day 14 → Lock to free tier limits
5. If user upgrades → Stripe checkout → Immediately unlock

Free trial limits:
- Free: 50 leads, 500 messages
- Trial (14 days): Pro limits (5000 leads, 50000 messages)
```

---

## 16. WORKERS & SCALING ARCHITECTURE

### Worker System

```
┌──────────────────────────────────────────────┐
│                QUEUE (Redis/BullMQ)            │
│                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ AI Reply │ │ Follow-Up│ │ Score Update │  │
│  │ Queue    │ │ Queue    │ │ Queue        │  │
│  │ (P1)     │ │ (P3-P5)  │ │ (P2)         │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Handoff  │ │ CRM Sync │ │ Reactivation │  │
│  │ Queue    │ │ Queue    │ │ Queue        │  │
│  │ (P1)     │ │ (P4)     │ │ (P5)         │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
└──────────────────────────────────────────────┘
         │          │           │
         ▼          ▼           ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ AI Worker    │ │ Follow-Up│ │ Scoring      │
│ Pool (3-10)  │ │ Worker   │ │ Worker (1-3) │
│ GPU-optimized│ │ Pool (2) │ │ Pool         │
└──────────────┘ └──────────┘ └──────────────┘
```

### Current Job Queue (DB-backed) → Upgrade to BullMQ

```typescript
// Current (database-backed) - works for MVP but doesn't scale
// JobQueue model acts as the queue

// Target (BullMQ + Redis) - for production
import { Queue, Worker, QueueScheduler } from 'bullmq'

const aiReplyQueue = new Queue('ai-reply', {
  connection: { host: process.env.REDIS_HOST, port: 6379 }
})

// Worker in separate process
const aiWorker = new Worker('ai-reply', async job => {
  const { leadId, workspaceId, channel, inboundMessage } = job.data
  
  // Process AI turn
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  const config = await prisma.agentConfig.findUnique({ where: { workspaceId } })
  const conversation = await getOrCreateConversation(leadId, workspaceId, channel)
  const messages = await prisma.message.findMany({ where: { conversationId: conversation.id } })
  
  const decision = await runAgentTurn({
    lead, conversation, messages, config, workspaceId
  }, inboundMessage)
  
  // Handle decision...
}, {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
  concurrency: 5, // 5 concurrent AI replies
  limiter: {
    max: 10, // Max 10 jobs per second (API rate limit)
    duration: 1000
  }
})
```

### Fallback: Keep DB Queue for MVP

For the MVP (2-3 week build), we keep the database-backed `JobQueue` model and implement a simple poller worker:

```typescript
// Simple poller that runs every 5 seconds (Next.js API route called by cron-job.org)
// GET /api/worker/poll

export async function GET() {
  const now = new Date()
  
  // Pick highest priority pending job
  const job = await prisma.jobQueue.findFirst({
    where: {
      status: 'pending',
      runAt: { lte: now },
      attempts: { lt: prisma.jobQueue.fields.maxAttempts }
    },
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'asc' }
    ]
  })
  
  if (!job) return NextResponse.json({ processed: false })
  
  // Mark as running
  await prisma.jobQueue.update({
    where: { id: job.id },
    data: { status: 'running', startedAt: now }
  })
  
  try {
    await processJob(job)
    await prisma.jobQueue.update({
      where: { id: job.id },
      data: { status: 'completed', completedAt: new Date() }
    })
  } catch (error) {
    await prisma.jobQueue.update({
      where: { id: job.id },
      data: {
        status: job.attempts + 1 >= job.maxAttempts ? 'failed' : 'pending',
        attempts: { increment: 1 },
        error: error.message,
        runAt: new Date(Date.now() + 60000 * Math.pow(2, job.attempts)) // Exponential backoff
      }
    })
  }
  
  return NextResponse.json({ processed: true, jobType: job.type })
}
```

---

## 17. FUTURE EXTENSIONS

These are designed for but will NOT be built in the MVP:

| Extension | Description | When |
|---|---|---|
| AI Voice Calling Agent | Twilio Voice + ElevenLabs for phone calls | Phase 3 |
| Property Matching Engine | Vector similarity between lead preferences + listings | Phase 2 |
| AI Negotiation Assistant | Analyze offer/counter-offer conversations | Phase 3 |
| Ad Campaign Optimization | Auto-optimize Facebook ad audiences based on conversion data | Phase 4 |
| Full CRM Replacement Mode | Complete CRM features (pipeline management, contracts) | Phase 5 |
| Multi-Agent Coordination | Multiple AI agents handling different lead segments | Phase 3 |
| Mobile App | React Native app for agents | Phase 4 |
| Analytics Suite | Advanced reporting, cohort analysis, attribution | Phase 4 |

### Architecture Hooks for Future

```typescript
// Plugin system for future extensions
interface ExtensionPlugin {
  name: string
  hooks: {
    onLeadCreated?: (lead: Lead) => Promise<void>
    onMessageGenerated?: (message: string, context: AgentContext) => Promise<string>
    onDecisionMade?: (decision: AgentDecision, context: AgentContext) => Promise<void>
    onHandoff?: (handoff: HumanHandoff) => Promise<void>
    onScoreChange?: (lead: Lead, oldScore: number, newScore: number) => Promise<void>
  }
}
```

---

## 18. MVP ROADMAP — 2-3 WEEK BUILD

### Week 1: Foundation & AI Agent Core (Days 1-7)

```
Day 1-2: Infrastructure
├── Migrate SQLite → PostgreSQL
├── Set up Prisma with new schema (MemoryEntry, Notification, etc.)
├── Configure environment variables
└── Verify all existing routes work with new DB

Day 3-4: AI Agent Upgrade
├── Extend AgentDecision with new actions (book_viewing, escalate)
├── Improve system prompt with sales methodology
├── Add memory extraction after each AI reply
├── Implement memory context injection into agent turns
└── Add response time monitoring (SLA tracking)

Day 5-6: Multi-Channel Delivery
├── Twilio WhatsApp Business API integration
│   ├── Send template messages
│   ├── Send text messages
│   ├── Handle inbound webhooks
│   └── Status callback handling
├── SMS delivery via Twilio
├── Email delivery upgrade (SendGrid/Resend)
└── Channel dispatcher utility

Day 7: Worker System
├── Job queue processor (DB poller for MVP)
├── AI reply worker
├── Follow-up scheduler
├── Score update worker
└── Handoff notification worker
```

### Week 2: Decision Engine + Scoring + Handoff (Days 8-14)

```
Day 8-9: Decision Engine Upgrade
├── Add new triggers:
│   ├── negative_sentiment
│   ├── booking_request
│   └── budget_match
├── AI-augmented decision layer (hybrid mode)
├── Decision logging (AIDecisionLog model)
└── Configurable rule overrides per workspace

Day 10-11: Scoring 2.0
├── Multi-signal HOT detection
├── Predictive score features:
│   ├── reply_time_avg calculation
│   ├── conversation_length tracking
│   ├── channel_diversity scoring
│   └── sentiment_trend tracking
├── Score breakdown visualization API
└── Score change notifications

Day 12-13: Human Handoff & Notifications
├── Handoff package enrichment (AI summary, channel history)
├── Real-time agent notifications (SSE)
│   ├── Connection pool
│   ├── Event types: handoff, hot_lead, score_alert, booking
│   └── Reconnection handling
├── In-app notification UI
├── Email notification fallback
└── Handoff accept/resolve flow

Day 14: CRM Integration (Start)
├── HubSpot adapter (MVP)
│   ├── Create lead in HubSpot
│   ├── Update lead score in HubSpot
│   ├── Log AI conversation as note
│   └── Handle HubSpot webhook
├── CRM sync worker
└── Integration settings UI
```

### Week 3: ROI Dashboard + Polish + SaaS (Days 15-21)

```
Day 15-16: ROI Dashboard
├── ROI event collection system
├── Dashboard API endpoints:
│   ├── /api/dashboard/roi
│   ├── /api/dashboard/ai
│   └── /api/dashboard/activity
├── Revenue metrics aggregation
├── Lead health tracking (hot/warm/cold funnel)
└── Dashboard UI components

Day 17-18: SaaS Business System
├── Stripe webhook handler
│   ├── checkout.session.completed
│   ├── invoice.paid
│   ├── invoice.payment_failed
│   └── customer.subscription.deleted
├── Usage tracking middleware
├── Plan limit enforcement
├── Free trial management
└── Subscription UI (pricing page, billing)

Day 19-20: Testing & Hardening
├── End-to-end flow tests:
│   ├── Lead creation → AI reply → Lead reply → AI follow-up
│   ├── Multi-channel conversation continuity
│   ├── Scoring → Hot detection → Handoff
│   └── Usage limits enforcement
├── Error handling & retry logic
├── Logging & monitoring setup
├── Response time optimization
└── Security audit (auth, data isolation)

Day 21: Deployment & Launch
├── Production deployment (Vercel + Supabase)
├── Environment configuration
├── Database migration run
├── Webhook configuration guides
├── Documentation:
│   ├── API documentation
│   ├── Integration guides
│   └── User manual
└── Launch checklist verification
```

### MVP Deliverables Checklist

```
[ ] PostgreSQL migration complete
[ ] All existing features working on new database
[ ] AI agent upgraded with memory system
[ ] WhatsApp integration (send + receive)
[ ] SMS integration (send + receive)
[ ] Email delivery via SendGrid/Resend
[ ] Job queue processor running
[ ] Decision engine with 10+ triggers
[ ] AI-augmented decision layer
[ ] Multi-signal HOT detection
[ ] Human handoff with AI summary package
[ ] Real-time agent notifications (SSE)
[ ] In-app notification bell
[ ] HubSpot CRM integration (MVP)
[ ] ROI dashboard with revenue metrics
[ ] Stripe billing integration
[ ] Usage tracking & limits
[ ] Free trial system (14 days)
[ ] All end-to-end flows passing
[ ] Production deployment ready
```

### What is NOT in MVP (Explicitly Scoped Out)

- [ ] Property matching engine (Phase 2)
- [ ] Voice calling agents (Phase 3)
- [ ] ML model for scoring (rules-based for MVP)
- [ ] Advanced analytics suite (Phase 4)
- [ ] Mobile app (Phase 4)
- [ ] Multi-agent coordination (Phase 3)
- [ ] Full CRM replacement mode (Phase 5)
- [ ] Redis/BullMQ (stays DB-backed for MVP)

---

## ARCHITECTURE DECISION RECORDS

### ADR-1: DB-Backed Queue Over Redis for MVP

**Context:** We need a job queue for async AI processing.
**Decision:** Use the existing `JobQueue` model with a poller pattern.
**Consequence:** Simpler deployment (no Redis dependency). Polling introduces latency of ~5s, which is acceptable for non-time-sensitive jobs (follow-ups, reactivations). Time-sensitive jobs (AI reply) are processed synchronously inline.

### ADR-2: SSE Over WebSockets for MVP

**Context:** We need real-time agent notifications.
**Decision:** Use Server-Sent Events (SSE) instead of Socket.io.
**Consequence:** Simpler implementation (no additional server needed). SSE is unidirectional (server→client), which is sufficient for notifications. Bidirectional communication (agent → AI) can use REST API calls.

### ADR-3: PostgreSQL Over SQLite

**Context:** Current SQLite cannot handle concurrent writes from AI workers.
**Decision:** Migrate to PostgreSQL (Supabase).
**Consequence:** Higher cost but necessary for concurrent access. Supabase provides managed PostgreSQL with 99.99% uptime.

### ADR-4: Twilio Over Direct WhatsApp API

**Context:** WhatsApp Business API requires complex setup.
**Decision:** Use Twilio's WhatsApp API as the abstraction layer.
**Consequence:** Higher per-message cost but simplified integration and better developer experience. Twilio handles compliance, templates, and webhooks.

### ADR-5: Continue Using Prisma

**Context:** ORM choice for database access.
**Decision:** Keep Prisma (already established).
**Consequence:** Familiar toolchain. Will need to handle PostgreSQL-specific features (pgvector) through raw queries.

---

## APPENDIX: ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL="postgresql://..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Twilio (WhatsApp + SMS)
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_WHATSAPP_NUMBER="+14155238886"
TWILIO_SMS_NUMBER="+1..."

# Email
SENDGRID_API_KEY="..."
SENDGRID_FROM_EMAIL="ai@youragency.com"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."

# CRM
HUBSPOT_CLIENT_ID="..."
HUBSPOT_CLIENT_SECRET="..."
HUBSPOT_REDIRECT_URI="..."

SALESFORCE_CLIENT_ID="..."
SALESFORCE_CLIENT_SECRET="..."
SALESFORCE_REDIRECT_URI="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AGENT_REPLY_DELAY_MS="5000"
MAX_WORKER_CONCURRENCY="5"
```

---

*Document Version: 1.0*  
*Generated: June 2026*  
*Status: Architecture Blueprint — Ready for Implementation*
import { openai } from './openai'
import { prisma } from './prisma'
import { buildAgentSystemPrompt, buildQualificationPrompt, buildHandoffSummaryPrompt } from './prompts'
import { calculateLeadScoreV2 } from './scoring'
import type {
  AgentContext,
  AgentDecision,
  Lead,
  Message,
  Conversation,
  AgentConfig,
  LeadQualification,
  HandoffPackage,
  Channel,
} from '@/types'

export async function runAgentTurn(context: AgentContext, inboundMessage: string): Promise<AgentDecision> {
  const { lead, conversation, messages, config } = context

  if (lead.humanTookOver) {
    return { action: 'await', reasoning: 'Human agent has taken over this lead.' }
  }

  if (lead.aiPausedUntil && new Date(lead.aiPausedUntil) > new Date()) {
    return { action: 'await', reasoning: 'AI agent is paused for this lead.' }
  }

  const systemPrompt = config.systemPromptOverride || buildAgentSystemPrompt(lead, config)

  const chatHistory = messages.slice(-20).map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  const fullMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: inboundMessage },
  ]

  const decisionPrompt = `
Based on the conversation, respond with a JSON object:
{
  "action": "reply" | "handoff" | "schedule_followup" | "mark_hot" | "mark_disqualified" | "await",
  "reply": "<your reply to the lead if action is reply>",
  "channel": "email" | "sms" | "whatsapp",
  "handoffReason": "<reason if action is handoff>",
  "followUpDelayHours": <number if action is schedule_followup>,
  "scoreAdjustment": <number -20 to +30>,
  "updatedFields": {
    "intent": "buying|renting|investing|browsing|unknown",
    "urgency": "immediate|within_month|within_3months|within_6months|no_timeline|unknown",
    "qualificationStage": "unqualified|contacted|qualifying|qualified|disqualified",
    "budget": "<budget string if mentioned>",
    "propertyType": "<property type if mentioned>",
    "locationPreference": "<location if mentioned>",
    "timeline": "<timeline if mentioned>"
  },
  "reasoning": "<1 sentence internal reasoning>"
}

Rules:
- If lead mentions price/budget/timeline/property → extract and set in updatedFields
- If lead is ready to book or says yes → action: "handoff" or reply confirming booking
- If lead asks complex negotiation question → action: "handoff"
- If lead says not interested / wrong number → action: "mark_disqualified"
- If lead is highly engaged (replied 3+ times, budget confirmed) → scoreAdjustment: +20 and consider handoff
- Always move conversation toward booking a viewing or a call
- Keep replies under 4 sentences
- NEVER be robotic or salesy
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      ...fullMessages,
      { role: 'system', content: decisionPrompt },
    ],
    temperature: 0.6,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content || '{}'

  try {
    const decision = JSON.parse(raw) as AgentDecision
    return decision
  } catch {
    return {
      action: 'reply',
      reply: "Thanks for reaching out! I'd love to help you find the perfect property. What type of property are you looking for?",
      channel: (conversation.channel as Channel) || 'email',
      reasoning: 'Fallback reply due to parse error',
    }
  }
}

export async function qualifyLead(lead: Lead, messages: Message[]): Promise<LeadQualification> {
  const prompt = buildQualificationPrompt(lead, messages)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 600,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content || '{}'

  try {
    return JSON.parse(raw) as LeadQualification
  } catch {
    return {
      intent: 'unknown',
      urgency: 'unknown',
      stage: 'unqualified',
      confidence: 0,
      missingInfo: ['intent', 'budget', 'timeline', 'location'],
    }
  }
}

export async function generateHandoffPackage(lead: Lead, messages: Message[], score: number): Promise<HandoffPackage> {
  const prompt = buildHandoffSummaryPrompt(lead, messages, score)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content || '{}'

  try {
    const pkg = JSON.parse(raw)
    return {
      leadId: lead.id,
      agentSummary: pkg.agentSummary || 'Lead engaged via AI. Ready for human follow-up.',
      intent: pkg.intent || lead.intent || 'unknown',
      budget: pkg.budget || lead.budget || 'Not specified',
      objections: pkg.objections || [],
      recommendedReply: pkg.recommendedReply || 'Hi, thanks for your interest! Can we schedule a quick call?',
      urgency: pkg.urgency || lead.urgency || 'unknown',
      qualificationStage: pkg.qualificationStage || lead.qualificationStage || 'qualifying',
      score,
    }
  } catch {
    return {
      leadId: lead.id,
      agentSummary: 'Lead engaged via AI. Ready for human follow-up.',
      intent: lead.intent || 'unknown',
      budget: lead.budget || 'Not specified',
      objections: [],
      recommendedReply: 'Hi, I wanted to follow up personally — are you still looking for a property?',
      urgency: lead.urgency || 'unknown',
      qualificationStage: lead.qualificationStage || 'qualifying',
      score,
    }
  }
}

export async function getOrCreateConversation(leadId: string, workspaceId: string, channel: Channel) {
  const existing = await prisma.conversation.findFirst({
    where: { leadId, channel, status: { in: ['active', 'paused'] } },
    include: { messages: { orderBy: { sentAt: 'asc' }, take: 50 } },
  })

  if (existing) return existing

  return prisma.conversation.create({
    data: { leadId, workspaceId, channel, status: 'active' },
    include: { messages: true },
  })
}

export async function appendMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  channel: Channel,
  externalId?: string
) {
  return prisma.message.create({
    data: { conversationId, role, content, channel, externalId },
  })
}

export async function updateConversationSummary(conversationId: string, messages: Message[]) {
  if (messages.length < 6) return

  const text = messages.map((m) => `${m.role}: ${m.content}`).join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Summarize this real estate sales conversation in 2-3 sentences, capturing: lead intent, budget mentioned, objections, and current stage.\n\n${text}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 200,
  })

  const summary = response.choices[0]?.message?.content || ''
  await prisma.conversation.update({ where: { id: conversationId }, data: { summary } })
}
import { openai } from './openai'
import { prisma } from './prisma'
import { buildAgentSystemPrompt, buildQualificationPrompt, buildHandoffSummaryPrompt } from './prompts'
import { calculateLeadScoreV2 } from './scoring'
import type {
  AgentContext,
  AgentDecision,
  Lead,
  Message,
  Conversation,
  AgentConfig,
  LeadQualification,
  HandoffPackage,
  Channel,
} from '@/types'

export async function runAgentTurn(context: AgentContext, inboundMessage: string): Promise<AgentDecision> {
  const { lead, conversation, messages, config } = context

  if (lead.humanTookOver) {
    return { action: 'await', reasoning: 'Human agent has taken over this lead.' }
  }

  if (lead.aiPausedUntil && new Date(lead.aiPausedUntil) > new Date()) {
    return { action: 'await', reasoning: 'AI agent is paused for this lead.' }
  }

  const systemPrompt = config.systemPromptOverride || buildAgentSystemPrompt(lead, config)

  const chatHistory = messages.slice(-20).map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  const fullMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: inboundMessage },
  ]

  const decisionPrompt = `
Based on the conversation, respond with a JSON object:
{
  "action": "reply" | "handoff" | "schedule_followup" | "mark_hot" | "mark_disqualified" | "await",
  "reply": "<your reply to the lead if action is reply>",
  "channel": "email" | "sms" | "whatsapp",
  "handoffReason": "<reason if action is handoff>",
  "followUpDelayHours": <number if action is schedule_followup>,
  "scoreAdjustment": <number -20 to +30>,
  "updatedFields": {
    "intent": "buying|renting|investing|browsing|unknown",
    "urgency": "immediate|within_month|within_3months|within_6months|no_timeline|unknown",
    "qualificationStage": "unqualified|contacted|qualifying|qualified|disqualified",
    "budget": "<budget string if mentioned>",
    "propertyType": "<property type if mentioned>",
    "locationPreference": "<location if mentioned>",
    "timeline": "<timeline if mentioned>"
  },
  "reasoning": "<1 sentence internal reasoning>"
}

Rules:
- If lead mentions price/budget/timeline/property → extract and set in updatedFields
- If lead is ready to book or says yes → action: "handoff" or reply confirming booking
- If lead asks complex negotiation question → action: "handoff"
- If lead says not interested / wrong number → action: "mark_disqualified"
- If lead is highly engaged (replied 3+ times, budget confirmed) → scoreAdjustment: +20 and consider handoff
- Always move conversation toward booking a viewing or a call
- Keep replies under 4 sentences
- NEVER be robotic or salesy
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      ...fullMessages,
      { role: 'system', content: decisionPrompt },
    ],
    temperature: 0.6,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content || '{}'

  try {
    const decision = JSON.parse(raw) as AgentDecision
    return decision
  } catch {
    return {
      action: 'reply',
      reply: "Thanks for reaching out! I'd love to help you find the perfect property. What type of property are you looking for?",
      channel: (conversation.channel as Channel) || 'email',
      reasoning: 'Fallback reply due to parse error',
    }
  }
}

export async function qualifyLead(lead: Lead, messages: Message[]): Promise<LeadQualification> {
  const prompt = buildQualificationPrompt(lead, messages)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 600,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content || '{}'

  try {
    return JSON.parse(raw) as LeadQualification
  } catch {
    return {
      intent: 'unknown',
      urgency: 'unknown',
      stage: 'unqualified',
      confidence: 0,
      missingInfo: ['intent', 'budget', 'timeline', 'location'],
    }
  }
}

export async function generateHandoffPackage(lead: Lead, messages: Message[], score: number): Promise<HandoffPackage> {
  const prompt = buildHandoffSummaryPrompt(lead, messages, score)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content || '{}'

  try {
    const pkg = JSON.parse(raw)
    return {
      leadId: lead.id,
      agentSummary: pkg.agentSummary || 'Lead engaged via AI. Ready for human follow-up.',
      intent: pkg.intent || lead.intent || 'unknown',
      budget: pkg.budget || lead.budget || 'Not specified',
      objections: pkg.objections || [],
      recommendedReply: pkg.recommendedReply || 'Hi, thanks for your interest! Can we schedule a quick call?',
      urgency: pkg.urgency || lead.urgency || 'unknown',
      qualificationStage: pkg.qualificationStage || lead.qualificationStage || 'qualifying',
      score,
    }
  } catch {
    return {
      leadId: lead.id,
      agentSummary: 'Lead engaged via AI. Ready for human follow-up.',
      intent: lead.intent || 'unknown',
      budget: lead.budget || 'Not specified',
      objections: [],
      recommendedReply: 'Hi, I wanted to follow up personally — are you still looking for a property?',
      urgency: lead.urgency || 'unknown',
      qualificationStage: lead.qualificationStage || 'qualifying',
      score,
    }
  }
}

export async function getOrCreateConversation(leadId: string, workspaceId: string, channel: Channel) {
  const existing = await prisma.conversation.findFirst({
    where: { leadId, channel, status: { in: ['active', 'paused'] } },
    include: { messages: { orderBy: { sentAt: 'asc' }, take: 50 } },
  })

  if (existing) return existing

  return prisma.conversation.create({
    data: { leadId, workspaceId, channel, status: 'active' },
    include: { messages: true },
  })
}

export async function appendMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  channel: Channel,
  externalId?: string
) {
  return prisma.message.create({
    data: { conversationId, role, content, channel, externalId },
  })
}

export async function updateConversationSummary(conversationId: string, messages: Message[]) {
  if (messages.length < 6) return

  const text = messages.map((m) => `${m.role}: ${m.content}`).join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Summarize this real estate sales conversation in 2-3 sentences, capturing: lead intent, budget mentioned, objections, and current stage.\n\n${text}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 200,
  })

  const summary = response.choices[0]?.message?.content || ''
  await prisma.conversation.update({ where: { id: conversationId }, data: { summary } })
}

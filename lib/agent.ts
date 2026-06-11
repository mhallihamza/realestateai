import { openai } from './openai'
import { prisma } from './prisma'
import type {
  AgentContext,
  AgentDecision,
  Lead,
  Message,
  LeadQualification,
  HandoffPackage,
  Channel,
} from '@/types'

/**
 * Executes a single stateful conversational turn with an inbound lead message.
 * Enforces rigid structural JSON responses directly using OpenAI's parsing engine.
 */
export async function runAgentTurn(context: AgentContext, inboundMessage: string): Promise<AgentDecision> {
  const { lead, conversation, messages, config } = context

  if (lead.humanTookOver) {
    return { action: 'await', reasoning: 'Human agent has taken over this lead.' }
  }

  if (lead.aiPausedUntil && new Date(lead.aiPausedUntil) > new Date()) {
    return { action: 'await', reasoning: 'AI agent is paused for this lead.' }
  }

  // Self-contained system prompt fallback if config override doesn't exist
  const systemPrompt = config.systemPromptOverride || `
    You are an advanced Real Estate AI Sales Assistant named ${config.agentName}. 
    Your tone is strictly ${config.tone} and your primary speaking language is ${config.language || 'English'}.

    YOUR GOAL:
    Qualify incoming leads, uncover their exact property needs, estimate timeline/urgency, and move the conversation toward booking a viewing or a call.

    RULES:
    - Keep replies under 4 sentences.
    - NEVER be robotic or salesy.
    - If lead mentions price, budget, timeline, or property, extract it.
  `

  // Maintain conversational context window depth limit
  const chatHistory = messages.slice(-20).map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: inboundMessage },
  ]

  try {
    const response = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: fullMessages as any,
      temperature: 0.5,
      max_tokens: 800,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'agent_decision',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              action: { 
                type: 'string', 
                enum: ['reply', 'handoff', 'schedule_followup', 'mark_hot', 'mark_disqualified', 'await'] 
              },
              reply: { type: 'string', description: 'Your message copy back to the lead.' },
              channel: { type: 'string', enum: ['email', 'sms', 'whatsapp', 'crm_note', 'internal'] },
              handoffReason: { type: 'string', description: 'Explicit description for manual handoff.' },
              followUpDelayHours: { type: 'number', description: 'Hours to delay before sequence restart.' },
              scoreAdjustment: { type: 'number', description: 'Integer score variance tracking (-20 to 30).' },
              reasoning: { type: 'string', description: 'Internal processing logs.' },
              updatedFields: {
                type: 'object',
                properties: {
                  intent: { type: 'string', enum: ['buying', 'renting', 'investing', 'browsing', 'unknown'] },
                  urgency: { type: 'string', enum: ['immediate', 'within_month', 'within_3months', 'within_6months', 'no_timeline', 'unknown'] },
                  qualificationStage: { type: 'string', enum: ['unqualified', 'contacted', 'qualifying', 'qualified', 'disqualified'] },
                  budget: { type: 'string' },
                  propertyType: { type: 'string' },
                  locationPreference: { type: 'string' },
                  timeline: { type: 'string' }
                },
                required: ['intent', 'urgency', 'qualificationStage', 'budget', 'propertyType', 'locationPreference', 'timeline'],
                additionalProperties: false
              }
            },
            required: ['action', 'reply', 'channel', 'handoffReason', 'followUpDelayHours', 'scoreAdjustment', 'reasoning', 'updatedFields'],
            additionalProperties: false
          }
        }
      }
    })

    const parsedData = response.choices[0]?.message?.parsed as any
    if (!parsedData) throw new Error('Model parsing yielded empty output constraints.')

    return {
      action: parsedData.action as AgentDecision['action'],
      reply: parsedData.reply,
      channel: (parsedData.channel || conversation.channel) as Channel,
      handoffReason: parsedData.handoffReason,
      followUpDelayHours: parsedData.followUpDelayHours,
      scoreAdjustment: parsedData.scoreAdjustment,
      reasoning: parsedData.reasoning,
      updatedFields: parsedData.updatedFields
    }

  } catch (error) {
    console.error('❌ Structured Output Processing Error:', error)
    return {
      action: 'reply',
      reply: "Thanks for reaching out! I'd love to help you find the perfect property. What type of property are you looking for?",
      channel: conversation.channel as Channel,
      reasoning: 'Fallback string fired due to internal model parse processing exception.',
    }
  }
}

export async function qualifyLead(lead: Lead, messages: Message[]): Promise<LeadQualification> {
  const historyText = messages.map((m) => `${m.role}: ${m.content}`).join('\n')
  const prompt = `Analyze this conversation history and output the lead's current real estate qualification data:\n\n${historyText}`

  try {
    const response = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'lead_qualification',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              intent: { type: 'string', enum: ['buying', 'renting', 'investing', 'browsing', 'unknown'] },
              urgency: { type: 'string', enum: ['immediate', 'within_month', 'within_3months', 'within_6months', 'no_timeline', 'unknown'] },
              stage: { type: 'string', enum: ['unqualified', 'contacted', 'qualifying', 'qualified', 'disqualified'] },
              confidence: { type: 'number' },
              missingInfo: { type: 'array', items: { type: 'string' } }
            },
            required: ['intent', 'urgency', 'stage', 'confidence', 'missingInfo'],
            additionalProperties: false
          }
        }
      }
    })

    return response.choices[0]?.message?.parsed as unknown as LeadQualification
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
  const historyText = messages.map((m) => `${m.role}: ${m.content}`).join('\n')
  const prompt = `Generate a high-level human agent handoff summary from this conversation history for a lead with score ${score}:\n\n${historyText}`

  try {
    const response = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'handoff_package',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              agentSummary: { type: 'string' },
              intent: { type: 'string', enum: ['buying', 'renting', 'investing', 'browsing', 'unknown'] },
              budget: { type: 'string' },
              objections: { type: 'array', items: { type: 'string' } },
              recommendedReply: { type: 'string' },
              urgency: { type: 'string', enum: ['immediate', 'within_month', 'within_3months', 'within_6months', 'no_timeline', 'unknown'] },
              qualificationStage: { type: 'string', enum: ['unqualified', 'contacted', 'qualifying', 'qualified', 'disqualified'] }
            },
            required: ['agentSummary', 'intent', 'budget', 'objections', 'recommendedReply', 'urgency', 'qualificationStage'],
            additionalProperties: false
          }
        }
      }
    })

    const parsed = response.choices[0]?.message?.parsed as any
    return {
      leadId: lead.id,
      agentSummary: parsed.agentSummary,
      intent: parsed.intent,
      budget: parsed.budget,
      objections: parsed.objections,
      recommendedReply: parsed.recommendedReply,
      urgency: parsed.urgency,
      qualificationStage: parsed.qualificationStage,
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
  role: 'user' | 'assistant' | 'system',
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

  try {
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
  } catch (err) {
    console.error('Failed to update conversation summary metrics:', err)
  }
}
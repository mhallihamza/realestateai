import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import type { MemoryExtraction, MemoryEntry } from '@/types'

export async function extractMemoryFromConversation(
  workspaceId: string,
  leadId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  if (messages.length < 2) return

  const conversationText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n')

  try {
    const response = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract structured memory from this real estate sales conversation. 
          Identify: facts (budget, location, property type), preferences (contact time, communication style),
          objections (concerns, hesitations), and intent changes. 
          Only extract high-confidence information (>= 0.7).`,
        },
        { role: 'user', content: conversationText },
      ],
      temperature: 0.1,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'memory_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              facts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string' },
                    value: { type: 'string' },
                    confidence: { type: 'number' },
                  },
                  required: ['key', 'value', 'confidence'],
                  additionalProperties: false,
                },
              },
              preferences: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string' },
                    value: { type: 'string' },
                    confidence: { type: 'number' },
                  },
                  required: ['key', 'value', 'confidence'],
                  additionalProperties: false,
                },
              },
              objections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    objection: { type: 'string' },
                    resolved: { type: 'boolean' },
                    confidence: { type: 'number' },
                  },
                  required: ['objection', 'resolved', 'confidence'],
                  additionalProperties: false,
                },
              },
            },
            required: ['facts', 'preferences', 'objections'],
            additionalProperties: false,
          },
        },
      },
    })

    const parsed = response.choices[0]?.message?.parsed as any
    if (!parsed) return

    // Store facts
    for (const fact of parsed.facts || []) {
      if (fact.confidence >= 0.7) {
        await upsertMemory(workspaceId, leadId, conversationId, 'fact', fact.key, fact.value, fact.confidence)
      }
    }

    // Store preferences
    for (const pref of parsed.preferences || []) {
      if (pref.confidence >= 0.7) {
        await upsertMemory(workspaceId, leadId, conversationId, 'preference', pref.key, pref.value, pref.confidence)
      }
    }

    // Store objections
    for (const obj of parsed.objections || []) {
      if (obj.confidence >= 0.7) {
        await upsertMemory(
          workspaceId,
          leadId,
          conversationId,
          'objection',
          obj.objection,
          obj.resolved ? 'Resolved' : 'Unresolved',
          obj.confidence
        )
      }
    }
  } catch (error) {
    console.error('[MEMORY_EXTRACTION_ERROR]', error)
  }
}

async function upsertMemory(
  workspaceId: string,
  leadId: string,
  conversationId: string,
  type: string,
  key: string,
  value: string,
  confidence: number
): Promise<void> {
  // Check if memory with same key and type exists
  const existing = await prisma.memoryEntry.findFirst({
    where: { leadId, type, key },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    // Update confidence if new is higher
    if (confidence > existing.confidence) {
      await prisma.memoryEntry.update({
        where: { id: existing.id },
        data: { value, confidence, source: 'ai_extracted' },
      })
    }
  } else {
    await prisma.memoryEntry.create({
      data: {
        workspaceId,
        leadId,
        conversationId,
        type,
        key,
        value,
        confidence,
        source: 'ai_extracted',
      },
    })
  }
}

export async function getMemoryContext(leadId: string): Promise<string> {
  const memories = await prisma.memoryEntry.findMany({
    where: { leadId },
    orderBy: { confidence: 'desc' },
    take: 15,
  })

  if (memories.length === 0) return ''

  const facts = memories.filter(m => m.type === 'fact')
  const prefs = memories.filter(m => m.type === 'preference')
  const objections = memories.filter(m => m.type === 'objection')

  const lines: string[] = []

  if (facts.length > 0) {
    lines.push('## Known Facts')
    facts.forEach(f => lines.push(`- ${f.key}: ${f.value} (confidence: ${(f.confidence * 100).toFixed(0)}%)`))
  }

  if (prefs.length > 0) {
    lines.push('## Lead Preferences')
    prefs.forEach(p => lines.push(`- ${p.key}: ${p.value}`))
  }

  if (objections.length > 0) {
    lines.push('## Objections')
    objections.forEach(o => lines.push(`- ${o.key}: ${o.value}`))
  }

  return lines.join('\n')
}
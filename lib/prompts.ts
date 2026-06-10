import type { AIFollowUpInput, AIFollowUpMessage } from '@/types'

export function generateFollowUpPrompt(input: AIFollowUpInput): string {
  const toneGuide = {
    professional: 'formal, polished, and business-like while remaining warm',
    friendly: 'warm, approachable, and conversational',
    casual: 'relaxed, natural, and like a friend talking to another friend',
  }

  const tone = toneGuide[input.agentTone] || toneGuide.professional

  return `You are a real estate agent assistant. Write 5 follow-up email messages for a lead. The messages should sound ${tone}.

IMPORTANT RULES:
- Write in first person as the agent
- Messages must be SHORT (3-5 sentences max)
- Sound human and natural, NOT robotic or salesy
- Focus on booking a property viewing or a quick call
- Never use spam trigger words
- Be helpful, not pushy
- Each message should feel fresh and not repetitive

LEAD INFORMATION:
- Name: ${input.leadName}
- Email: ${input.leadEmail}
- Source: ${input.source}
- Property Type: ${input.propertyType || 'Not specified'}
- Budget: ${input.budget || 'Not specified'}
- Location Preference: ${input.locationPreference || 'Not specified'}
- Notes: ${input.notes || 'None'}
- Agent Name: ${input.agentName || 'Your Agent'}

Create exactly 5 follow-up messages with these timings:
1. sendAfterDays: 0 (immediately after inquiry)
2. sendAfterDays: 2 (2 days after inquiry)
3. sendAfterDays: 5 (5 days after inquiry)
4. sendAfterDays: 10 (10 days after inquiry)
5. sendAfterDays: 21 (final follow-up, 3 weeks)

Return ONLY a valid JSON array (no markdown, no explanation). Format:
[
  {
    "sequenceNumber": 1,
    "subject": "string",
    "body": "string",
    "sendAfterDays": 0,
    "channel": "email"
  }
]`
}

export function parseFollowUps(raw: string): AIFollowUpMessage[] {
  try {
    const cleaned = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      return parsed as AIFollowUpMessage[]
    }
    return []
  } catch {
    return []
  }
}

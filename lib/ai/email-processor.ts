import { openai } from '@/lib/openai'

export async function generateAIResponse(prompt: string, agentConfig: any): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 500,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('[generateAIResponse]', error)
    return ''
  }
}

export async function processInboundEmail({
  lead,
  workspace,
  agentConfig,
  emailContent,
  subject,
}: {
  lead: any
  workspace: any
  agentConfig: any
  emailContent: string
  subject: string
}): Promise<string> {
  const prompt = `
You are ${agentConfig?.agentName || 'AI Assistant'} for ${workspace.name}, 
a real estate agency.
Tone: ${agentConfig?.tone || 'professional'}
Language: ${agentConfig?.language || 'en'}

A potential client sent this email:
Subject: ${subject}
Message: ${emailContent}

Write a professional reply on behalf of ${workspace.name}.
${agentConfig?.qualifyingQuestions ? 
  `Ask these qualifying questions: ${agentConfig.qualifyingQuestions}` : 
  'Ask about their property needs, budget, and timeline.'}
Keep it concise and friendly.
`

  return await generateAIResponse(prompt, agentConfig)
}
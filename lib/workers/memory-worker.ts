import { extractMemoryFromConversation } from '@/lib/memory/extractor'

export async function processMemoryExtractionJob(payload: Record<string, unknown>): Promise<void> {
  const { workspaceId, leadId, conversationId, messages } = payload as any

  await extractMemoryFromConversation(
    workspaceId,
    leadId,
    conversationId,
    messages as Array<{ role: string; content: string }>
  )
}
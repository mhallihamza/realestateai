import { createNotification } from '@/lib/notifications'
import type { NotificationType } from '@/types'

export async function processNotificationJob(payload: Record<string, unknown>): Promise<void> {
  const { workspaceId, userId, leadId, type, title, message, metadata } = payload as any

  await createNotification({
    workspaceId,
    userId,
    leadId,
    type: type as NotificationType,
    title,
    message,
    metadata: metadata as Record<string, unknown> | undefined,
  })
}
import { prisma } from './prisma'
import type { JobType, JobStatus } from '@/types'

export interface EnqueueJobInput {
  workspaceId: string
  type: JobType
  payload: Record<string, unknown>
  priority?: number
  runAt?: Date
  maxAttempts?: number
}

export async function enqueueJob(input: EnqueueJobInput): Promise<void> {
  await prisma.jobQueue.create({
    data: {
      workspaceId: input.workspaceId,
      type: input.type,
      payload: JSON.stringify(input.payload),
      priority: input.priority ?? 5,
      runAt: input.runAt ?? new Date(),
      maxAttempts: input.maxAttempts ?? 3,
      status: 'pending',
    },
  })
}

export async function dequeueJob(): Promise<any | null> {
  const now = new Date()

  const job = await prisma.jobQueue.findFirst({
    where: {
      status: 'pending',
      runAt: { lte: now },
      attempts: { lt: prisma.jobQueue.fields.maxAttempts },
    },
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  if (!job) return null

  await prisma.jobQueue.update({
    where: { id: job.id },
    data: { status: 'running', startedAt: now },
  })

  return job
}

export async function completeJob(jobId: string): Promise<void> {
  await prisma.jobQueue.update({
    where: { id: jobId },
    data: { status: 'completed', completedAt: new Date() },
  })
}

export async function failJob(jobId: string, error: string, maxAttempts: number, currentAttempts: number): Promise<void> {
  const isExhausted = currentAttempts + 1 >= maxAttempts

  await prisma.jobQueue.update({
    where: { id: jobId },
    data: {
      status: isExhausted ? 'failed' : 'pending',
      attempts: { increment: 1 },
      error,
      runAt: isExhausted
        ? undefined
        : new Date(Date.now() + 60000 * Math.pow(2, currentAttempts)), // Exponential backoff
      failedAt: isExhausted ? new Date() : undefined,
    },
  })
}

export async function processJob(job: any): Promise<void> {
  const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload

  switch (job.type) {
    case 'ai_reply':
      const { processAIReplyJob } = await import('./workers/ai-reply-worker')
      await processAIReplyJob(payload)
      break

    case 'follow_up':
      const { processFollowUpJob } = await import('./workers/follow-up-worker')
      await processFollowUpJob(payload)
      break

    case 'score_update':
      const { processScoreUpdateJob } = await import('./workers/score-worker')
      await processScoreUpdateJob(payload)
      break

    case 'handoff_notify':
      const { processHandoffNotifyJob } = await import('./workers/handoff-worker')
      await processHandoffNotifyJob(payload)
      break

    case 'reactivation':
      const { processReactivationJob } = await import('./workers/reactivation-worker')
      await processReactivationJob(payload)
      break

    case 'crm_sync':
      const { processCRMSyncJob } = await import('./workers/crm-worker')
      await processCRMSyncJob(payload)
      break

    case 'memory_extraction':
      const { processMemoryExtractionJob } = await import('./workers/memory-worker')
      await processMemoryExtractionJob(payload)
      break

    case 'notification_dispatch':
      const { processNotificationJob } = await import('./workers/notification-worker')
      await processNotificationJob(payload)
      break

    case 'lead_ingest':
      const { processLeadIngestJob } = await import('./workers/lead-ingest-worker')
      await processLeadIngestJob(payload)
      break

    default:
      console.warn(`Unknown job type: ${job.type}`)
  }
}
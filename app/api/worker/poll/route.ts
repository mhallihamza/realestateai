import { NextResponse } from 'next/server'
import { dequeueJob, completeJob, failJob, processJob } from '@/lib/queue'

export async function GET() {
  try {
    const job = await dequeueJob()
    if (!job) {
      return NextResponse.json({ processed: false, message: 'No pending jobs' })
    }

    await processJob(job)
    await completeJob(job.id)

    return NextResponse.json({
      processed: true,
      jobType: job.type,
      jobId: job.id,
    })
  } catch (error: any) {
    console.error('[WORKER_POLL_ERROR]', error)
    return NextResponse.json({
      processed: false,
      error: error.message || 'Worker processing failed',
    })
  }
}
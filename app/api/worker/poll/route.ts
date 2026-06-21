import { NextResponse } from 'next/server'
import { dequeueJob, completeJob, failJob, processJob } from '@/lib/queue'

export async function GET(req: Request) {
  // CRON_SECRET auth: reject requests without the correct secret (Vercel Cron provides it as a header)
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '') || req.headers.get('x-cron-secret') || ''
  if (cronSecret && authHeader !== cronSecret) {
    console.warn('[WORKER_POLL] Unauthorized cron attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
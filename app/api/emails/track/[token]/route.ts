import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateLeadScore, isHotLead } from '@/lib/scoring'
import type { EmailEvent } from '@/types'

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const event = await prisma.emailEvent.findUnique({
      where: { trackingToken: token },
      include: { lead: { include: { emailEvents: true } } },
    })

    if (event && event.type === 'sent') {
      await prisma.emailEvent.create({
        data: {
          leadId: event.leadId,
          followUpId: event.followUpId,
          type: 'opened',
        },
      })

      if (event.followUpId) {
        await prisma.followUp.update({
          where: { id: event.followUpId },
          data: { status: 'opened' },
        })
      }

      const allEvents = await prisma.emailEvent.findMany({
        where: { leadId: event.leadId },
      })

      const score = calculateLeadScore(allEvents as EmailEvent[])
      const hot = isHotLead(score)

      await prisma.lead.update({
        where: { id: event.leadId },
        data: {
          score,
          ...(hot ? { status: 'Hot' } : {}),
        },
      })
    }
  } catch (err) {
    console.error('[TRACK]', err)
  }

  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

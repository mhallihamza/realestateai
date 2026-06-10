import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { generateTrackingToken } from '@/lib/utils'
import { addDays } from 'date-fns'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  try {
    const body = await req.json()
    const { leadId, followUpIds } = body

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
    })

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const followUps = await prisma.followUp.findMany({
      where: {
        id: { in: followUpIds },
        leadId,
        approved: true,
      },
      orderBy: { sequenceNumber: 'asc' },
    })

    const now = new Date()
    let scheduled = 0

    for (const followUp of followUps) {
      const scheduledAt = addDays(now, followUp.sendAfterDays)
      const trackingToken = generateTrackingToken()

      await prisma.followUp.update({
        where: { id: followUp.id },
        data: {
          status: 'scheduled',
          scheduledAt,
        },
      })

      await prisma.emailEvent.create({
        data: {
          leadId,
          followUpId: followUp.id,
          type: 'sent',
          trackingToken,
        },
      })

      if (followUp.sendAfterDays === 0) {
        try {
          const htmlBody = followUp.body.replace(/\n/g, '<br/>')
          await sendEmail({
            to: lead.email,
            subject: followUp.subject,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;line-height:1.6;">${htmlBody}</div>`,
            trackingToken,
          })

          await prisma.followUp.update({
            where: { id: followUp.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
            },
          })
        } catch (err) {
          console.error('[EMAIL SEND ERROR]', err)
        }
      }

      scheduled++
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { lastContactedAt: now },
    })

    return NextResponse.json({ scheduled, message: `${scheduled} emails scheduled` })
  } catch (error) {
    console.error('[EMAILS SEND]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

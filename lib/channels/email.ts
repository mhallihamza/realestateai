import { prisma } from '@/lib/prisma'
import type { Lead, MessageResult } from '@/types'
import { Resend } from 'resend'

const sendgridApiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'ai@youragency.com'
const resend = new Resend(process.env.RESEND_API_KEY ?? '')

export async function sendEmail(
  lead: Lead,
  subject: string,
  body: string,
  trackingEnabled = true
): Promise<MessageResult> {
  try {
    // Fetch workspace config for from name and reply-to
    const [workspace, config] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: lead.workspaceId },
        select: { name: true },
      }),
      prisma.agentConfig.findUnique({
        where: { workspaceId: lead.workspaceId },
        select: { emailFrom: true },
      }),
    ])

    // Priority 1: Resend
    if (process.env.RESEND_API_KEY) {
      const trackingId = trackingEnabled ? crypto.randomUUID() : undefined

      await resend.emails.send({
        from: `${workspace?.name ?? 'DarLeads'} <noreply@${process.env.RESEND_FROM_DOMAIN}>`,
        replyTo: config?.emailFrom ?? undefined,
        to: lead.email,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br/>'),
      })

      // Track email event
      if (trackingId) {
        await prisma.emailEvent.create({
          data: {
            leadId: lead.id,
            type: 'sent',
            trackingToken: trackingId,
          },
        })
      }

      return {
        success: true,
        externalId: trackingId,
        status: 'sent',
        channel: 'email',
      }
    }

    // Priority 2: SendGrid
    if (!sendgridApiKey) {
      // Fallback to nodemailer if SendGrid is not configured
      return sendEmailNodemailer(lead, subject, body)
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(sendgridApiKey)

    const trackingId = trackingEnabled ? crypto.randomUUID() : undefined

    const msg: any = {
      to: lead.email,
      from: fromEmail,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br/>'),
    }

    if (trackingId) {
      msg.customArgs = { trackingId }
      msg.trackingSettings = {
        openTracking: { enable: true },
        clickTracking: { enable: true },
      }
    }

    await sgMail.send(msg)

    // Track email event
    if (trackingId) {
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          type: 'sent',
          trackingToken: trackingId,
        },
      })
    }

    return {
      success: true,
      externalId: trackingId,
      status: 'sent',
      channel: 'email',
    }
  } catch (error: any) {
    console.error('[EMAIL_SEND_ERROR]', error)
    return {
      success: false,
      status: 'failed',
      error: error.message || 'Email send failed',
      channel: 'email',
    }
  }
}

async function sendEmailNodemailer(
  lead: Lead,
  subject: string,
  body: string
): Promise<MessageResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require('nodemailer')

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: fromEmail,
      to: lead.email,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br/>'),
    })

    return {
      success: true,
      status: 'sent',
      channel: 'email',
    }
  } catch (error: any) {
    console.error('[NODEMAILER_ERROR]', error)
    return {
      success: false,
      status: 'failed',
      error: error.message,
      channel: 'email',
    }
  }
}

export async function trackEmailOpen(trackingToken: string): Promise<void> {
  const event = await prisma.emailEvent.findUnique({ where: { trackingToken } })
  if (!event) return

  await prisma.emailEvent.update({
    where: { id: event.id },
    data: { type: 'opened' },
  })

  await prisma.engagementEvent.create({
    data: {
      leadId: event.leadId,
      type: 'email_opened',
      channel: 'email',
      value: 10,
    },
  })
}

export async function trackEmailClick(trackingToken: string): Promise<void> {
  const event = await prisma.emailEvent.findUnique({ where: { trackingToken } })
  if (!event) return

  await prisma.emailEvent.update({
    where: { id: event.id },
    data: { type: 'clicked' },
  })

  await prisma.engagementEvent.create({
    data: {
      leadId: event.leadId,
      type: 'email_clicked',
      channel: 'email',
      value: 20,
    },
  })
}
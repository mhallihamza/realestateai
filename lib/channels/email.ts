import { prisma } from '@/lib/prisma'
import type { Lead, MessageResult } from '@/types'
import { Resend } from 'resend'

const sendgridApiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'ai@youragency.com'
const resend = new Resend(process.env.RESEND_API_KEY ?? '')

/**
 * Case 1 — AI reply to client:
 *   from: `${workspace.name} <noreply@mypron8n.site>`
 *   reply_to: `leads@mypron8n.site`
 *   to: lead.email
 */
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
        from: `${workspace?.name ?? 'DarLeads'} <noreply@mypron8n.site>`,
        replyTo: 'leads@mypron8n.site',
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

/**
 * Case 2 — Forwarding to agent Gmail:
 *   from: `DarLeads <leads@mypron8n.site>`
 *   to: agentConfig.emailFrom
 *   subject: `[New Lead] ${originalSubject}`
 *   text: `From: ${clientEmail}\n\n${originalMessage}`
 */
export async function sendForwardToAgent(
  agentEmail: string,
  clientEmail: string,
  subject: string,
  message: string,
  workspaceName: string,
  inboundEmail: string
): Promise<void> {
  try {
    if (process.env.RESEND_API_KEY) {
      console.log("Before send forwardtoagent");
      console.log(agentEmail);
      const result = await resend.emails.send({
        from: `${workspaceName} <noreply@mypron8n.site>`,
        to: agentEmail,
        replyTo: clientEmail,
        subject: `[New Lead] ${subject}`,
        text: `New lead message received.\n\nFrom: ${clientEmail}\n\nMessage:\n${message}`,
        html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
      <div style="background: #1d4ed8; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 18px;">🏠 New Lead — ${workspaceName}</h1>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">You have a new lead inquiry. The AI agent has already replied automatically.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; border-radius: 4px; font-size: 13px; color: #374151; font-weight: 600; width: 30%;">From</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #111827;">${clientEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; border-radius: 4px; font-size: 13px; color: #374151; font-weight: 600;">Subject</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #111827;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; border-radius: 4px; font-size: 13px; color: #374151; font-weight: 600;">Reply To</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #1d4ed8;">${clientEmail}</td>
          </tr>
        </table>
        <div style="background: #f9fafb; border-left: 4px solid #1d4ed8; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Message</p>
          <p style="margin: 0; font-size: 14px; color: #374151; white-space: pre-wrap;">${message}</p>
        </div>
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          This lead was received at ${inboundEmail}@mypron8n.site — 
          Log in to DarLeads to view the full conversation.
        </p>
      </div>
    </div>
  `,
        headers: {
          'X-Entity-Ref-ID': crypto.randomUUID(),
        },
        tags: [{ name: 'category', value: 'lead_forward' }],
      })
      console.log('[FORWARD_RESULT]', JSON.stringify(result))
    } else if (sendgridApiKey) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(sendgridApiKey)
      await sgMail.send({
        to: agentEmail,
        from: fromEmail,
        subject: `[New Lead] ${subject}`,
        text: `From: ${clientEmail}\n\n${message}`,
      })
    }
  } catch (error: any) {
    console.error('[FORWARD_TO_AGENT_ERROR]', error)
  }
}

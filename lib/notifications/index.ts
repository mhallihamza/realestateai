import { prisma } from '@/lib/prisma'
import type { NotificationType } from '@/types'

// In-memory SSE client store
const clients = new Map<string, Set<(event: string, data: any) => void>>()

export function addSSEClient(workspaceId: string, onEvent: (event: string, data: any) => void): () => void {
  if (!clients.has(workspaceId)) {
    clients.set(workspaceId, new Set())
  }
  clients.get(workspaceId)!.add(onEvent)

  return () => {
    clients.get(workspaceId)?.delete(onEvent)
    if (clients.get(workspaceId)?.size === 0) {
      clients.delete(workspaceId)
    }
  }
}

export function broadcastToWorkspace(workspaceId: string, event: string, data: any): void {
  const workspaceClients = clients.get(workspaceId)
  if (workspaceClients) {
    workspaceClients.forEach(cb => cb(event, data))
  }
}

export async function createNotification(input: {
  workspaceId: string
  userId?: string
  leadId?: string
  type: NotificationType
  title: string
  message: string
  channel?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      leadId: input.leadId,
      type: input.type,
      title: input.title,
      message: input.message,
      channel: input.channel || 'in_app',
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      sentAt: new Date(),
    },
  })

  // Broadcast to SSE clients
  broadcastToWorkspace(input.workspaceId, `notification:${input.type}`, {
    id: notification.id,
    type: input.type,
    title: input.title,
    message: input.message,
    leadId: input.leadId,
    createdAt: notification.createdAt,
  })

  // Also send email notification for high-priority types
  if (['hot_lead', 'handoff'].includes(input.type) && input.userId) {
    await sendEmailNotification(input.userId, input.title, input.message)
  }
}

async function sendEmailNotification(userId: string, title: string, message: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.notifyEmail) return

    // Use nodemailer for email notifications
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
      from: process.env.SENDGRID_FROM_EMAIL || 'ai@youragency.com',
      to: user.email,
      subject: `[AI Sales Agent] ${title}`,
      text: message,
      html: `<h2>${title}</h2><p>${message}</p>`,
    })
  } catch (error) {
    console.error('[NOTIFICATION_EMAIL_ERROR]', error)
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  })
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  })
}
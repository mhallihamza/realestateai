import { NextResponse } from 'next/server'
import { handleWhatsAppInbound, handleWhatsAppStatus, verifyWhatsAppWebhook } from '@/lib/channels/whatsapp'
import { evaluate } from '@/lib/decision-engine'
import { prisma } from '@/lib/prisma'
import type { WhatsAppInboundPayload, WhatsAppStatusPayload } from '@/types'

export async function GET(req: Request) {
  // WhatsApp webhook verification
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // WhatsApp Business API webhook payload structure
    const entry = body.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    if (!value) {
      return NextResponse.json({ status: 'ok' })
    }

    // Handle inbound messages
    if (value.messages) {
      for (const msg of value.messages) {
        if (msg.type === 'text') {
          const payload: WhatsAppInboundPayload = {
            from: msg.from,
            body: msg.text.body,
            messageId: msg.id,
            timestamp: msg.timestamp,
            profileName: value.contacts?.[0]?.profile?.name,
          }

          const result = await handleWhatsAppInbound(payload)
          if (result) {
            // Trigger decision engine for AI reply
            const lead = await prisma.lead.findUnique({
              where: { id: result.leadId },
            })
            const config = await prisma.agentConfig.findUnique({
              where: { workspaceId: result.workspaceId },
            })

            if (lead && config) {
              await evaluate({
                lead: lead as any,
                config: config as any,
                trigger: 'whatsapp_received',
                inboundMessage: result.message,
              })
            }
          }
        }
      }
    }

    // Handle status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        await handleWhatsAppStatus({
          messageId: status.id,
          status: status.status,
          timestamp: status.timestamp,
          error: status.errors?.[0]?.message,
        })
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[WHATSAPP_WEBHOOK_ERROR]', error)
    return NextResponse.json({ status: 'ok' }) // Always return 200 to WhatsApp
  }
}
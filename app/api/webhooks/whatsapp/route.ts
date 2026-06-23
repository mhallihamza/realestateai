import { NextResponse } from 'next/server'
import { handleWhatsAppInbound, handleWhatsAppStatus } from '@/lib/channels/whatsapp'
import { evaluate } from '@/lib/decision-engine'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
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
    const contentType = req.headers.get('content-type') || ''
    let from: string = ''
    let body: string = ''
    let messageId: string = ''
    let profileName: string | undefined
    let timestamp: number = Math.floor(Date.now() / 1000)

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // ── Twilio format ──
      const text = await req.text()
      const params = new URLSearchParams(text)
      from = params.get('From') || ''
      body = params.get('Body') || ''
      messageId = params.get('MessageSid') || ''
      profileName = params.get('ProfileName') || undefined

    } else {
      // ── Meta Cloud API format ──
      const json = await req.json()
      const value = json.entry?.[0]?.changes?.[0]?.value

      if (!value) return NextResponse.json({ status: 'ok' })

      if (value.statuses) {
        for (const status of value.statuses) {
          await handleWhatsAppStatus({
            messageId: status.id,
            status: status.status,
            timestamp: status.timestamp,
            error: status.errors?.[0]?.message,
          })
        }
        return NextResponse.json({ status: 'ok' })
      }

      const msg = value.messages?.[0]
      if (!msg || msg.type !== 'text') return NextResponse.json({ status: 'ok' })

      from = msg.from
      body = msg.text.body
      messageId = msg.id
      timestamp = Number(msg.timestamp)
      profileName = value.contacts?.[0]?.profile?.name
    }

    if (!from || !body) return NextResponse.json({ status: 'ok' })

    const result = await handleWhatsAppInbound({ from, body, messageId, profileName, timestamp })

    if (result) {
      const lead = await prisma.lead.findUnique({ where: { id: result.leadId } })
      const config = await prisma.agentConfig.findUnique({ where: { workspaceId: result.workspaceId } })

      if (lead && config) {
        await evaluate({
          lead: lead as any,
          config: config as any,
          trigger: 'whatsapp_received',
          inboundMessage: result.message,
        })
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[WHATSAPP_WEBHOOK_ERROR]', error)
    return NextResponse.json({ status: 'ok' })
  }
}
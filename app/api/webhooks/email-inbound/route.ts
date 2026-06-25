import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, sendForwardToAgent } from '@/lib/channels/email'
import { processInboundEmail } from '@/lib/ai/email-processor'
import type { Lead } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    // Cloudflare Worker sends this format
    const from = payload.from
    const to = payload.to        // support@mypron8n.site
    const subject = payload.subject
    const text = payload.text

    if (!from || !to) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Find any workspace with email enabled
    const workspace = await prisma.workspace.findFirst({
      where: { 
        agentConfigs: {
          some: {
            enableEmail: true
          }
        }
      },
      include: { 
        agentConfigs: true,
        members: { take: 1 }
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const agentConfig = workspace.agentConfigs[0]
    const firstMember = workspace.members[0]

    // Find or create lead
    let lead = await prisma.lead.findFirst({
      where: {
        email: from,
        workspaceId: workspace.id
      }
    })

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          name: from.split('@')[0] || 'Unknown',
          email: from,
          userId: firstMember?.userId || 'unknown',
          workspaceId: workspace.id,
          channel: 'email',
          status: 'New',
        }
      })
    }

    // Get or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        leadId: lead.id,
        channel: 'email',
        status: { in: ['active', 'paused'] }
      }
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          workspaceId: workspace.id,
          channel: 'email',
          status: 'active'
        }
      })
    }

    // Save inbound message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: text || '',
        channel: 'email',
      }
    })

    // Forward to agent Gmail if emailFrom is set
    if (agentConfig?.emailFrom) {
      await sendForwardToAgent(
        agentConfig.emailFrom,
        from,
        subject,
        text || ''
      )
    }

    // Generate AI reply
    const aiReply = await processInboundEmail({
      lead: lead as unknown as Lead,
      workspace,
      agentConfig,
      emailContent: text || '',
      subject: subject || '(no subject)',
    })

    // Send AI reply to client
    await sendEmail(lead as unknown as Lead, `Re: ${subject}`, aiReply)

    // Save AI reply to DB
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiReply,
        channel: 'email',
      }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[EMAIL_INBOUND_ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
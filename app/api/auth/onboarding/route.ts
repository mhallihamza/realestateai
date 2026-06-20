import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { PLANS, TRIAL_DAYS } from '@/lib/billing'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  console.log(session);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id
  const email = (session.user as any).email

  try {
    const body = await req.json()
    const { agencyName, agentName, tone } = body

    // Check if user already has a workspace
    const existing = await prisma.workspaceMember.findFirst({
      where: { userId },
    })

    if (existing) {
      return NextResponse.json({ error: 'Workspace already exists' }, { status: 400 })
    }

    // Create workspace
    const slug = `ws-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

    const workspace = await prisma.workspace.create({
      data: {
        name: agencyName || `${session.user.name || 'My'}'s Agency`,
        slug,
        plan: 'pro',
        trialEndsAt,
        webhookSecret: crypto.randomBytes(16).toString('hex'),
        agentConfigs: {
          create: {
            agentName: agentName || 'Alex',
            tone: tone || 'professional',
          },
        },
        subscriptions: {
          create: {
            plan: 'pro',
            status: 'trialing',
            trialEndsAt,
            limitLeads: PLANS.pro.limitLeads,
            limitMessages: PLANS.pro.limitMessages,
          },
        },
      },
    })

    // Link user as owner
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'owner',
      },
    })

    return NextResponse.json({ 
      success: true, 
      workspaceId: workspace.id,
    })
  } catch (error) {
    console.error('[ONBOARDING]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
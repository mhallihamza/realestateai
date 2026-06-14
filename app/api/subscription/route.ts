import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole } from '@/lib/workspace-auth'
import { PLANS } from '@/lib/billing'

export async function GET() {
  const { ctx, error } = await requireSession()
  if (error) return error

  let subscription = await prisma.subscription.findFirst({
    where: { workspaceId: ctx!.workspaceId },
    orderBy: { createdAt: 'desc' },
  })

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        workspaceId: ctx!.workspaceId,
        plan: 'free',
        status: 'active',
        limitLeads: PLANS.free.limitLeads,
        limitMessages: PLANS.free.limitMessages,
      },
    })
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: ctx!.workspaceId },
    select: { plan: true, trialEndsAt: true },
  })

  return NextResponse.json({
    subscription,
    workspace,
    plans: Object.values(PLANS),
  })
}

export async function PATCH(req: Request) {
  const { ctx, error } = await requireSession()
  if (error) return error

  const roleError = requireRole(ctx!, ['owner', 'admin'])
  if (roleError) return roleError

  const { plan } = await req.json()
  if (!plan || !PLANS[plan as keyof typeof PLANS]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const planDef = PLANS[plan as keyof typeof PLANS]

  const subscription = await prisma.subscription.updateMany({
    where: { workspaceId: ctx!.workspaceId },
    data: {
      plan,
      limitLeads: planDef.limitLeads,
      limitMessages: planDef.limitMessages,
      status: plan === 'free' ? 'active' : 'trialing',
    },
  })

  await prisma.workspace.update({
    where: { id: ctx!.workspaceId },
    data: { plan },
  })

  return NextResponse.json({ success: true, subscription })
}

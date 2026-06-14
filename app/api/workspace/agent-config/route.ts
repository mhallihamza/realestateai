import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole } from '@/lib/workspace-auth'

export async function GET() {
  const { ctx, error } = await requireSession()
  if (error) return error

  const config = await prisma.agentConfig.findUnique({
    where: { workspaceId: ctx!.workspaceId },
  })

  if (!config) {
    const created = await prisma.agentConfig.create({
      data: { workspaceId: ctx!.workspaceId },
    })
    return NextResponse.json({ config: created })
  }

  return NextResponse.json({ config })
}

export async function PATCH(req: Request) {
  const { ctx, error } = await requireSession()
  if (error) return error

  const roleError = requireRole(ctx!, ['owner', 'admin', 'agent'])
  if (roleError) return roleError

  const body = await req.json()
  const allowed = [
    'agentName', 'tone', 'language', 'replyDelaySeconds', 'maxDailyMessages',
    'hotScoreThreshold', 'warmScoreThreshold', 'autoHandoffScore',
    'enableEmail', 'enableSMS', 'enableWhatsApp',
    'followUpHours24', 'followUpHours72', 'reactivateDays30',
    'systemPromptOverride',
  ]

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const config = await prisma.agentConfig.upsert({
    where: { workspaceId: ctx!.workspaceId },
    create: { workspaceId: ctx!.workspaceId, ...data },
    update: data,
  })

  return NextResponse.json({ config })
}

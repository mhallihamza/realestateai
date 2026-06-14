import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole } from '@/lib/workspace-auth'

export async function GET() {
  const { ctx, error } = await requireSession()
  if (error) return error

  const integrations = await prisma.integration.findMany({
    where: { workspaceId: ctx!.workspaceId },
    select: {
      id: true,
      provider: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const workspace = await prisma.workspace.findUnique({
    where: { id: ctx!.workspaceId },
    select: { webhookSecret: true, slug: true },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = `${appUrl}/api/webhooks/ingest?workspaceId=${ctx!.workspaceId}`

  return NextResponse.json({ integrations, webhookUrl, workspace })
}

export async function POST(req: Request) {
  const { ctx, error } = await requireSession()
  if (error) return error

  const roleError = requireRole(ctx!, ['owner', 'admin'])
  if (roleError) return roleError

  const { provider, accessToken, config } = await req.json()
  if (!provider) {
    return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
  }

  const integration = await prisma.integration.upsert({
    where: {
      workspaceId_provider: { workspaceId: ctx!.workspaceId, provider },
    },
    create: {
      workspaceId: ctx!.workspaceId,
      provider,
      accessToken: accessToken || null,
      config: config ? JSON.stringify(config) : null,
      status: accessToken ? 'active' : 'disconnected',
    },
    update: {
      accessToken: accessToken || undefined,
      config: config ? JSON.stringify(config) : undefined,
      status: accessToken ? 'active' : 'disconnected',
    },
  })

  return NextResponse.json({ integration })
}

export async function DELETE(req: Request) {
  const { ctx, error } = await requireSession()
  if (error) return error

  const roleError = requireRole(ctx!, ['owner', 'admin'])
  if (roleError) return roleError

  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider')
  if (!provider) {
    return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
  }

  await prisma.integration.deleteMany({
    where: { workspaceId: ctx!.workspaceId, provider },
  })

  return NextResponse.json({ success: true })
}

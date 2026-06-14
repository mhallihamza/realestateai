import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'
import { prisma } from './prisma'
import type { WorkspaceRole } from '@/types'

export interface SessionContext {
  userId: string
  workspaceId: string
  role: WorkspaceRole
  email: string
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const user = session.user as { id?: string; workspaceId?: string; role?: string; email?: string }
  if (!user.id || !user.workspaceId) return null

  return {
    userId: user.id,
    workspaceId: user.workspaceId,
    role: (user.role || 'agent') as WorkspaceRole,
    email: user.email || '',
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden(message = 'Insufficient permissions') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export async function requireSession() {
  const ctx = await getSessionContext()
  if (!ctx) return { ctx: null, error: unauthorized() }
  return { ctx, error: null }
}

export function requireRole(ctx: SessionContext, allowed: WorkspaceRole[]) {
  if (!allowed.includes(ctx.role) && ctx.role !== 'owner') {
    return forbidden()
  }
  return null
}

export async function assertLeadAccess(leadId: string, workspaceId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId },
  })
  return lead
}

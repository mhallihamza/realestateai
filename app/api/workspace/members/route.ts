import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole } from '@/lib/workspace-auth'

export async function GET() {
  const { ctx, error } = await requireSession()
  if (error) return error

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: ctx!.workspaceId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({ members })
}

export async function POST(req: Request) {
  const { ctx, error } = await requireSession()
  if (error) return error

  const roleError = requireRole(ctx!, ['owner', 'admin'])
  if (roleError) return roleError

  const { email, name, role = 'agent', password } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  let user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password required for new users (min 6 chars)' }, { status: 400 })
    }
    user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: await bcrypt.hash(password, 12),
      },
    })
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ctx!.workspaceId, userId: user.id } },
  })

  if (existing) {
    return NextResponse.json({ error: 'User is already a team member' }, { status: 409 })
  }

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId: ctx!.workspaceId,
      userId: user.id,
      role,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ member }, { status: 201 })
}

export async function DELETE(req: Request) {
  const { ctx, error } = await requireSession()
  if (error) return error

  const roleError = requireRole(ctx!, ['owner', 'admin'])
  if (roleError) return roleError

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('id')
  if (!memberId) {
    return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
  }

  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: ctx!.workspaceId },
  })

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove workspace owner' }, { status: 400 })
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } })
  return NextResponse.json({ success: true })
}

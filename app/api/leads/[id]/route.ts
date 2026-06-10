import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(
  _req: Request,
  { params }: Params
) {
  const session = await getServerSession(authOptions)
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  const { id } = await params

  const lead = await prisma.lead.findFirst({
    where: { id, userId },
    include: {
      followUps: { orderBy: { sequenceNumber: 'asc' } },
      emailEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
      user: { select: { writingTone: true, name: true } },
    },
  })

  if (!lead)
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  return NextResponse.json({ lead })
}


export async function PUT(
  req: Request,
  { params }: Params
) {
  const session = await getServerSession(authOptions)
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  const { id } = await params

  const existing = await prisma.lead.findFirst({
    where: { id, userId }
  })

  if (!existing)
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  try {
    const body = await req.json()

    const {
      name,
      email,
      phone,
      source,
      propertyType,
      budget,
      locationPreference,
      notes,
      status
    } = body

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(source !== undefined ? { source } : {}),
        ...(propertyType !== undefined ? { propertyType: propertyType || null } : {}),
        ...(budget !== undefined ? { budget: budget || null } : {}),
        ...(locationPreference !== undefined ? { locationPreference: locationPreference || null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    })

    return NextResponse.json({ lead })

  } catch (error) {
    console.error('[LEADS PUT]', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


export async function DELETE(
  _req: Request,
  { params }: Params
) {
  const session = await getServerSession(authOptions)

  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  const { id } = await params

  const existing = await prisma.lead.findFirst({
    where: { id, userId }
  })

  if (!existing)
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  await prisma.lead.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
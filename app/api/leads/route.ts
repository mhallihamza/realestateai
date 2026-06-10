import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id
  const { searchParams } = new URL(req.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const skip = (page - 1) * limit

  const where = {
    userId,
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
      ],
    } : {}),
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ])

  return NextResponse.json({ leads, total, page, limit })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  try {
    const body = await req.json()
    const { name, email, phone, source, propertyType, budget, locationPreference, notes, status } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const lead = await prisma.lead.create({
      data: {
        userId,
        name,
        email,
        phone: phone || null,
        source: source || 'Other',
        propertyType: propertyType || null,
        budget: budget || null,
        locationPreference: locationPreference || null,
        notes: notes || null,
        status: status || 'New',
      },
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error('[LEADS POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

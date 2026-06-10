import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  try {
    const body = await req.json()
    const { leads } = body

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
    }

    const validLeads = leads
      .filter((l) => l.name && l.email)
      .map((l) => ({
        userId,
        name: String(l.name),
        email: String(l.email),
        phone: l.phone ? String(l.phone) : null,
        source: l.source || 'Other',
        propertyType: l.propertyType || null,
        budget: l.budget || null,
        locationPreference: l.locationPreference || null,
        notes: l.notes || null,
        status: l.status || 'New',
      }))

    const result = await prisma.lead.createMany({
      data: validLeads,
      skipDuplicates: true,
    })

    return NextResponse.json({ count: result.count, message: `${result.count} leads imported` })
  } catch (error) {
    console.error('[CSV IMPORT]', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  let workspaceId = (session.user as any).workspaceId

  if (!workspaceId) {
    const member = await prisma.workspaceMember.findFirst({ where: { userId } })
    if (!member) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    workspaceId = member.workspaceId
  }

  try {
    const body = await req.json()
    const { leads } = body

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
    }

    const validLeads = leads
      .filter((l) => l.name && l.email)
      .map((l) => ({
        workspaceId,
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

    // Create leads one by one to handle duplicates
    let count = 0
    for (const lead of validLeads) {
      const existing = await prisma.lead.findFirst({
        where: { workspaceId, email: lead.email }
      })
      if (!existing) {
        await prisma.lead.create({ data: lead as any })
        count++
      }
    }

    return NextResponse.json({ count, message: `${count} leads imported` })
  } catch (error) {
    console.error('[CSV IMPORT]', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}

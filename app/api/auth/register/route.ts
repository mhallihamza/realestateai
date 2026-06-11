import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, agencyName } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Replace your prisma.user.create block with this:
const user = await prisma.user.create({
  data: {
    name,
    email,
    password: hashedPassword,
    agencyName: "", // Keeps this safely initialized as an empty string
    workspaces: {
      create: {
        workspaceId: "cmq8tq6mo000013q2w6isee1w",
        role: "OWNER" 
      }
    }
  }
})

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 })
  } catch (error) {
    console.error('[REGISTER]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

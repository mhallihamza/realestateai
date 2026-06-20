import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createVerificationToken } from '@/lib/auth-tokens'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Validate password strength
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain at least one uppercase letter and one number' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user as pending_verification - NO workspace created yet
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        accountStatus: 'pending_verification',
      },
    })

    // Send verification email (this also sets the token)
    await createVerificationToken(user.id, email)

    return NextResponse.json({ 
      success: true, 
      message: 'Account created. Please check your email to verify your account.' 
    }, { status: 201 })
  } catch (error) {
    console.error('[REGISTER]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
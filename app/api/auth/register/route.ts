import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { createVerificationToken } from '@/lib/auth-tokens'
import { PLANS, TRIAL_DAYS } from '@/lib/billing'

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
    const slug = `ws-${Date.now().toString(36)}`
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        agencyName: agencyName || null,
        workspaces: {
          create: {
            role: 'owner',
            workspace: {
              create: {
                name: agencyName || `${name || 'My'}'s Agency`,
                slug,
                plan: 'pro',
                trialEndsAt,
                webhookSecret: crypto.randomBytes(16).toString('hex'),
                agentConfigs: {
                  create: {
                    agentName: 'Alex',
                    tone: 'professional',
                  },
                },
                subscriptions: {
                  create: {
                    plan: 'pro',
                    status: 'trialing',
                    trialEndsAt,
                    limitLeads: PLANS.pro.limitLeads,
                    limitMessages: PLANS.pro.limitMessages,
                  },
                },
              },
            },
          },
        },
      },
    })

    await createVerificationToken(user.id, email)

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 })
  } catch (error) {
    console.error('[REGISTER]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

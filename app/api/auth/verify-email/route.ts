import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEmailToken } from '@/lib/auth-tokens'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const result = await verifyEmailToken(token)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // ✅ User is now verified and active.
    // ❌ NO workspace creation here — that happens during onboarding.
    //    The user will be redirected to login, then to /onboarding.

    return NextResponse.json({ 
      success: true,
    })
  } catch (error) {
    console.error('[VERIFY_EMAIL]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Support GET for email link clicks
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=missing_token', req.url))
    }

    const result = await verifyEmailToken(token)

    if (!result.success) {
      const errorParam = encodeURIComponent(result.error || 'Verification failed')
      return NextResponse.redirect(new URL(`/login?error=${errorParam}`, req.url))
    }

    // ✅ Verified! Redirect to login with success flag so the user
    //    can sign in and then be redirected to onboarding.
    return NextResponse.redirect(new URL('/login?verified=true', req.url))
  } catch (error) {
    console.error('[VERIFY_EMAIL_GET]', error)
    return NextResponse.redirect(new URL('/login?error=verification_failed', req.url))
  }
}
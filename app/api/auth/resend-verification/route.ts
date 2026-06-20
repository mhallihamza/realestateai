import { NextResponse } from 'next/server'
import { resendVerificationEmail } from '@/lib/auth-tokens'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const success = await resendVerificationEmail(email)

    if (!success) {
      return NextResponse.json({ error: 'Unable to resend verification email. Account may already be verified.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Verification email resent.' })
  } catch (error) {
    console.error('[RESEND_VERIFICATION]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
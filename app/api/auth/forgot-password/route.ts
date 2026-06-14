import { NextResponse } from 'next/server'
import { createPasswordResetToken } from '@/lib/auth-tokens'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    await createPasswordResetToken(email)
    return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' })
  } catch (error) {
    console.error('[FORGOT_PASSWORD]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

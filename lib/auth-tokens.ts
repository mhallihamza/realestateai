import crypto from 'crypto'
import { prisma } from './prisma'
import { sendEmail } from './email'

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createVerificationToken(userId: string, email: string) {
  // Invalidate any existing tokens first
  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: null,
      verificationTokenExpiresAt: null,
    },
  })

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
      accountStatus: 'pending_verification',
    },
  })

  await sendVerificationEmail(email, token)
}

export async function sendVerificationEmail(email: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await sendEmail({
    to: email,
    subject: 'Verify your Real Estate AI account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #1e3a8a, #2563eb); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">RE</span>
          </div>
          <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0;">Verify your email</h1>
        </div>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Thanks for signing up! Click the button below to verify your email address and activate your account.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${appUrl}/verify-email?token=${token}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin-bottom: 8px;">
          This link expires in 24 hours.
        </p>
        <p style="color: #9ca3af; font-size: 13px; margin: 0;">
          If you didn't create this account, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Real Estate AI — Turn more leads into property viewings, 24/7.
        </p>
      </div>
    `,
  }).catch((err) => {
    console.error('[VERIFICATION_EMAIL_ERROR]', err)
  })
}

export async function resendVerificationEmail(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return false

  // Don't resend if already verified
  if (user.accountStatus === 'active') return false

  await createVerificationToken(user.id, email)
  return true
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; error?: string; userId?: string }> {
  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      accountStatus: 'pending_verification',
    },
  })

  if (!user) {
    return { success: false, error: 'Invalid verification token' }
  }

  // Check token expiry
  if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
    return { success: false, error: 'Verification token has expired. Please request a new one.' }
  }

  // One-time usage: clear token immediately and activate user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
      verificationTokenExpiresAt: null,
      accountStatus: 'active',
    },
  })

  return { success: true, userId: user.id }
}

export async function createPasswordResetToken(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return true // Don't reveal if email exists

  const token = generateToken()
  const expires = new Date(Date.now() + 3600000) // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordToken: token, resetPasswordExpires: expires },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await sendEmail({
    to: email,
    subject: 'Reset your Real Estate AI password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${appUrl}/reset-password?token=${token}">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  }).catch(() => {})

  return true
}
import crypto from 'crypto'
import { prisma } from './prisma'
import { sendEmail } from './email'

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createVerificationToken(userId: string, email: string) {
  const token = generateToken()
  await prisma.user.update({
    where: { id: userId },
    data: { verificationToken: token },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await sendEmail({
    to: email,
    subject: 'Verify your Real Estate AI account',
    html: `
      <h2>Welcome to Real Estate AI</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${appUrl}/verify-email?token=${token}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
  }).catch(() => {})
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

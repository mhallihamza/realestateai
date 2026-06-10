import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  trackingToken?: string
}

export async function sendEmail({ to, subject, html, trackingToken }: SendEmailOptions) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  let finalHtml = html

  if (trackingToken) {
    const pixelUrl = `${appUrl}/api/emails/track/${trackingToken}`
    finalHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Real Estate AI <noreply@example.com>',
    to,
    subject,
    html: finalHtml,
  })
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify()
    return true
  } catch {
    return false
  }
}

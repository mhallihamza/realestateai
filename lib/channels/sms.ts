import { prisma } from '@/lib/prisma'
import type { Lead, MessageResult } from '@/types'

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
const twilioSmsNumber = process.env.TWILIO_SMS_NUMBER

function getTwilioClient() {
  if (!twilioAccountSid || !twilioAuthToken) {
    throw new Error('Twilio credentials not configured')
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require('twilio')
  return twilio(twilioAccountSid, twilioAuthToken)
}

export async function sendSMS(lead: Lead, body: string): Promise<MessageResult> {
  try {
    if (!lead.phone) {
      return { success: false, status: 'failed', error: 'Lead has no phone number', channel: 'sms' }
    }

    const client = getTwilioClient()
    const message = await client.messages.create({
      from: twilioSmsNumber,
      to: lead.phone,
      body,
    })

    return {
      success: true,
      externalId: message.sid,
      status: 'sent',
      channel: 'sms',
    }
  } catch (error: any) {
    console.error('[SMS_SEND_ERROR]', error)
    return {
      success: false,
      status: 'failed',
      error: error.message || 'SMS send failed',
      channel: 'sms',
    }
  }
}
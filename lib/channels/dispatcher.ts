import type { Lead, Channel, MessageResult } from '@/types'
import { sendWhatsAppText, sendWhatsAppTemplate } from './whatsapp'
import { sendSMS } from './sms'
import { sendEmail } from './email'

export async function dispatchMessage(
  lead: Lead,
  channel: Channel,
  content: string,
  options?: {
    subject?: string
    templateName?: string
    templateVariables?: Record<string, string>
  }
): Promise<MessageResult> {
  switch (channel) {
    case 'whatsapp':
      if (options?.templateName && options?.templateVariables) {
        return sendWhatsAppTemplate(lead, options.templateName, options.templateVariables)
      }
      if (!lead.phone) {
        return { success: false, status: 'failed', error: 'No phone number for WhatsApp', channel: 'whatsapp' }
      }
      return sendWhatsAppText(lead, content)

    case 'sms':
      if (!lead.phone) {
        return { success: false, status: 'failed', error: 'No phone number for SMS', channel: 'sms' }
      }
      return sendSMS(lead, content)

    case 'email':
      return sendEmail(lead, options?.subject || 'New Message', content)

    case 'crm_note':
      // CRM notes are handled by the CRM adapter layer
      return { success: true, status: 'sent', channel: 'crm_note' }

    default:
      return { success: false, status: 'failed', error: `Unknown channel: ${channel}`, channel }
  }
}

export function selectBestChannel(lead: Lead, config?: { enableWhatsApp?: boolean; enableSMS?: boolean; enableEmail?: boolean }): Channel {
  const pref = lead.channel

  // Respect lead's existing channel preference first
  if (pref === 'whatsapp' && lead.phone) return 'whatsapp'
  if (pref === 'sms' && lead.phone) return 'sms'
  if (pref === 'email' && lead.email) return 'email'

  // Fallback to config-based selection
  if (config?.enableWhatsApp && lead.phone) return 'whatsapp'
  if (config?.enableSMS && lead.phone) return 'sms'
  if (config?.enableEmail && lead.email) return 'email'

  // Ultimate fallback
  if (lead.phone) return 'whatsapp'
  if (lead.email) return 'email'
  return 'email'
}
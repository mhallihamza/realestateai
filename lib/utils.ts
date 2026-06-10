import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import type { LeadStatus, LeadSource } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  try {
    return format(new Date(date), 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  } catch {
    return '—'
  }
}

export function getStatusColor(status: LeadStatus | string): string {
  const colors: Record<string, string> = {
    New: 'bg-blue-100 text-blue-700',
    Active: 'bg-green-100 text-green-700',
    'Follow-up': 'bg-yellow-100 text-yellow-700',
    Hot: 'bg-red-100 text-red-700',
    Cold: 'bg-gray-100 text-gray-600',
    Closed: 'bg-purple-100 text-purple-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-600'
}

export function getSourceIcon(source: LeadSource | string): string {
  const icons: Record<string, string> = {
    'Facebook Ads': '📘',
    Website: '🌐',
    WhatsApp: '💬',
    Referral: '🤝',
    Other: '📋',
  }
  return icons[source] || '📋'
}

export function generateTrackingToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function formatCurrency(value: string | null | undefined): string {
  if (!value) return '—'
  return value
}

export const LEAD_STATUSES: LeadStatus[] = ['New', 'Active', 'Follow-up', 'Hot', 'Cold', 'Closed']
export const LEAD_SOURCES: LeadSource[] = ['Facebook Ads', 'Website', 'WhatsApp', 'Referral', 'Other']
export const WRITING_TONES = ['professional', 'friendly', 'casual'] as const

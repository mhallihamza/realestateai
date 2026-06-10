import { cn } from '@/lib/utils'
import type { LeadStatus } from '@/types'

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  New: { label: 'New', className: 'bg-blue-100 text-blue-700' },
  Active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  'Follow-up': { label: 'Follow-up', className: 'bg-yellow-100 text-yellow-700' },
  Hot: { label: '🔥 Hot', className: 'bg-red-100 text-red-700' },
  Cold: { label: 'Cold', className: 'bg-gray-100 text-gray-600' },
  Closed: { label: 'Closed', className: 'bg-purple-100 text-purple-700' },
}

interface LeadStatusBadgeProps {
  status: LeadStatus | string
  className?: string
}

export default function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const config = statusConfig[status as LeadStatus] || { label: status, className: 'bg-gray-100 text-gray-600' }

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className, className)}>
      {config.label}
    </span>
  )
}

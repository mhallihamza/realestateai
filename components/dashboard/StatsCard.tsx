import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  trend?: {
    value: number
    positive: boolean
  }
  description?: string
}

export default function StatsCard({ label, value, icon: Icon, iconColor, iconBg, trend, description }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 card-shadow p-6 hover:border-blue-200 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
        {trend && (
          <span className={cn('text-xs font-medium px-2 py-1 rounded-full', trend.positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
            {trend.positive ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  )
}

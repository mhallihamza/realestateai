import type { Lead, LeadStatus } from '@/types'
import Link from 'next/link'
import { Eye, Trash2 } from 'lucide-react'
import LeadStatusBadge from './LeadStatusBadge'
import { formatRelativeDate, getSourceIcon } from '@/lib/utils'

interface LeadTableProps {
  leads: Lead[]
  onDelete?: (id: string) => void
}

export default function LeadTable({ leads, onDelete }: LeadTableProps) {
  if (leads.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 font-medium">No leads found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Lead</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Source</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last Contact</th>
            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{lead.name}</p>
                  <p className="text-xs text-gray-500">{lead.email}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <LeadStatusBadge status={lead.status as LeadStatus} />
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="text-sm text-gray-600">
                  {getSourceIcon(lead.source)} {lead.source}
                </span>
              </td>
              <td className="px-6 py-4 hidden lg:table-cell">
                <span className="text-sm text-gray-600">{formatRelativeDate(lead.lastContactedAt)}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(lead.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
import type { Lead, LeadStatus } from '@/types'
import Link from 'next/link'
import { Eye, Trash2 } from 'lucide-react'
import LeadStatusBadge from './LeadStatusBadge'
import { formatRelativeDate, getSourceIcon } from '@/lib/utils'

interface LeadTableProps {
  leads: Lead[]
  onDelete?: (id: string) => void
}

export default function LeadTable({ leads, onDelete }: LeadTableProps) {
  if (leads.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 font-medium">No leads found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Lead</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Source</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last Contact</th>
            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{lead.name}</p>
                  <p className="text-xs text-gray-500">{lead.email}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <LeadStatusBadge status={lead.status as LeadStatus} />
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="text-sm text-gray-600">
                  {getSourceIcon(lead.source)} {lead.source}
                </span>
              </td>
              <td className="px-6 py-4 hidden lg:table-cell">
                <span className="text-sm text-gray-600">{formatRelativeDate(lead.lastContactedAt)}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(lead.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Flame, ArrowRight } from 'lucide-react'
import type { Lead } from '@/types'

interface HotLeadAlertProps {
  leads: Lead[]
}

export default function HotLeadAlert({ leads }: HotLeadAlertProps) {
  if (leads.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 mb-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-0.5">🔥</div>
          <div>
            <p className="font-semibold text-white text-sm">
              {leads.length === 1
                ? `${leads[0].name} is highly engaged — Contact now!`
                : `${leads.length} hot leads are highly engaged — Contact them now!`}
            </p>
            {leads.length === 1 && (
              <p className="text-orange-100 text-xs mt-1">Lead score: {leads[0].score} • Ready to book a viewing</p>
            )}
            {leads.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {leads.slice(0, 3).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="text-xs bg-white/20 text-white px-2 py-1 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-1"
                  >
                    <Flame className="w-3 h-3" />
                    {lead.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        {leads.length === 1 && (
          <Link
            href={`/leads/${leads[0].id}`}
            className="flex items-center gap-1 text-xs bg-white text-orange-600 font-semibold px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors flex-shrink-0 ml-4"
          >
            View Lead
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  )
}

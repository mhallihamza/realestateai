import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Users, TrendingUp, Flame, CheckCircle } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import HotLeadAlert from '@/components/dashboard/HotLeadAlert'
import LeadStatusBadge from '@/components/leads/LeadStatusBadge'
import { formatRelativeDate, formatDate } from '@/lib/utils'
import { isHotLead } from '@/lib/scoring'
import Link from 'next/link'
import type { Lead, LeadStatus } from '@/types'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id

  const [allLeads, recentLeads] = await Promise.all([
    prisma.lead.findMany({
      where: { userId },
      select: { status: true, score: true },
    }),
    prisma.lead.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: { emailEvents: true },
    }),
  ])

  const stats = {
    totalLeads: allLeads.length,
    activeLeads: allLeads.filter((l) => l.status === 'Active').length,
    hotLeads: allLeads.filter((l) => l.status === 'Hot' || isHotLead(l.score)).length,
    closedDeals: allLeads.filter((l) => l.status === 'Closed').length,
  }

  const hotLeads = recentLeads.filter((l) => isHotLead(l.score) && l.status !== 'Closed')

  return (
    <div className="space-y-6">
      {hotLeads.length > 0 && (
        <HotLeadAlert leads={hotLeads as Lead[]} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatsCard
          label="Total Leads"
          value={stats.totalLeads}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatsCard
          label="Active Leads"
          value={stats.activeLeads}
          icon={TrendingUp}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatsCard
          label="Hot Leads"
          value={stats.hotLeads}
          icon={Flame}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatsCard
          label="Closed Deals"
          value={stats.closedDeals}
          icon={CheckCircle}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 card-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Leads</h2>
          <Link href="/leads" className="text-sm text-blue-600 hover:underline font-medium">
            View all
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No leads yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first lead to get started</p>
            <Link href="/leads" className="inline-block mt-4 text-sm text-blue-600 font-medium hover:underline">
              Add a lead →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Source</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Next Follow-up</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentLeads.map((lead) => (
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
                      <span className="text-sm text-gray-600">{lead.source}</span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{formatRelativeDate(lead.lastContactedAt)}</span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{formatDate(lead.nextFollowUpAt)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

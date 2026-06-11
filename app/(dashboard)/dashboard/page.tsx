import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Users, TrendingUp, Flame, CheckCircle } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import HotLeadAlert from '@/components/dashboard/HotLeadAlert'
import DashboardSplitView from '@/components/dashboard/DashboardSplitView'
import { isHotLead } from '@/lib/scoring'
import type { Lead } from '@/types'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const workspaceId = (session.user as any).workspaceId

  // 1. Fetch historical counter metrics on the server for speed
  const allLeads = await prisma.lead.findMany({
    where: { workspaceId },
    select: { status: true, score: true },
  })

  const stats = {
    totalLeads: allLeads.length,
    activeLeads: allLeads.filter((l) => l.status === 'Active').length,
    hotLeads: allLeads.filter((l) => l.status === 'Hot' || isHotLead(l.score)).length,
    closedDeals: allLeads.filter((l) => l.status === 'Closed').length,
  }

  // Pass along current hot leads to trigger the top banner alert if needed
  const sampleRecent = await prisma.lead.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })
  const hotLeads = sampleRecent.filter((l) => isHotLead(l.score) && l.status !== 'Closed')

  return (
    <div className="space-y-6 max-h-screen flex flex-col">
      {hotLeads.length > 0 && (
        <HotLeadAlert leads={hotLeads as Lead[]} />
      )}

      {/* Existing Stat Cards Layer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 flex-shrink-0">
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

      {/* New Interactive Split View Component */}
      <div className="flex-1 min-h-[600px] h-[calc(100vh-280px)] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <DashboardSplitView />
      </div>
    </div>
  )
}
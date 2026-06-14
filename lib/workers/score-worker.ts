import { prisma } from '@/lib/prisma'
import { calculateLeadScoreV2, isHotLead } from '@/lib/scoring'

export async function processScoreUpdateJob(payload: Record<string, unknown>): Promise<void> {
  const { leadId, workspaceId, event } = payload as any

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      emailEvents: { orderBy: { createdAt: 'desc' } },
      engagementEvents: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!lead) return

  const scoreBreakdown = calculateLeadScoreV2(
    lead.emailEvents as any,
    lead.engagementEvents as any,
    lead as any
  )

  const newScore = scoreBreakdown.total

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score: newScore,
      scoreBreakdown: JSON.stringify(scoreBreakdown),
      lastActivityAt: new Date(),
    },
  })

  // Check HOT detection
  const config = await prisma.agentConfig.findUnique({ where: { workspaceId } })
  if (config && isHotLead(newScore, config.hotScoreThreshold) && lead.status !== 'Hot') {
    const { evaluate } = await import('@/lib/decision-engine')
    await evaluate({
      lead: lead as any,
      config: config as any,
      trigger: 'score_threshold_hot',
    })
  }
}
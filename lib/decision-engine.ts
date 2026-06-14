import { prisma } from './prisma'
import { enqueueJob } from './queue'
import type { Lead, AgentConfig } from '@/types'

export type DecisionTrigger =
  | 'lead_created'
  | 'lead_replied'
  | 'lead_opened_email'
  | 'no_reply_24h'
  | 'no_reply_72h'
  | 'no_activity_30d'
  | 'score_threshold_hot'
  | 'score_threshold_auto_handoff'
  | 'budget_match'
  | 'qualified'
  | 'manual'
  | 'negative_sentiment'
  | 'booking_request'
  | 'whatsapp_received'
  | 'crm_sync_required'

export interface DecisionInput {
  lead: Lead
  config: AgentConfig
  trigger: DecisionTrigger
  inboundMessage?: string
  metadata?: Record<string, unknown>
}

export interface DecisionOutput {
  actions: DecisionAction[]
}

export interface DecisionAction {
  type: 'enqueue_ai_reply' | 'enqueue_followup' | 'trigger_handoff' | 'update_lead_status' | 'notify_agent' | 'reactivation_sequence' | 'score_update' | 'crm_sync'
  payload: Record<string, unknown>
  priority: number
}

export async function evaluate(input: DecisionInput): Promise<DecisionOutput> {
  const { lead, config, trigger, inboundMessage, metadata } = input
  const actions: DecisionAction[] = []

  switch (trigger) {
    case 'lead_created': {
      if (lead.aiAgentActive) {
        actions.push({
          type: 'enqueue_ai_reply',
          payload: { leadId: lead.id, workspaceId: lead.workspaceId, channel: lead.channel, isFirstContact: true },
          priority: 1,
        })
      }
      actions.push({
        type: 'score_update',
        payload: { leadId: lead.id, workspaceId: lead.workspaceId },
        priority: 5,
      })
      break
    }

    case 'lead_replied': {
      if (lead.aiAgentActive && !lead.humanTookOver && inboundMessage) {
        actions.push({
          type: 'enqueue_ai_reply',
          payload: { leadId: lead.id, workspaceId: lead.workspaceId, channel: lead.channel, inboundMessage },
          priority: 1,
        })
      }
      actions.push({
        type: 'score_update',
        payload: { leadId: lead.id, workspaceId: lead.workspaceId, event: 'reply' },
        priority: 2,
      })
      break
    }

    case 'lead_opened_email': {
      actions.push({
        type: 'score_update',
        payload: { leadId: lead.id, workspaceId: lead.workspaceId, event: 'email_opened' },
        priority: 3,
      })
      break
    }

    case 'no_reply_24h': {
      if (lead.aiAgentActive && !lead.humanTookOver) {
        actions.push({
          type: 'enqueue_followup',
          payload: { leadId: lead.id, workspaceId: lead.workspaceId, sequenceType: '24h_nudge', channel: lead.channel },
          priority: 3,
        })
      }
      break
    }

    case 'no_reply_72h': {
      if (lead.aiAgentActive && !lead.humanTookOver) {
        actions.push({
          type: 'enqueue_followup',
          payload: { leadId: lead.id, workspaceId: lead.workspaceId, sequenceType: '72h_followup', channel: lead.channel },
          priority: 4,
        })
      }
      break
    }

    case 'no_activity_30d': {
      if (config.reactivateDays30 && lead.aiAgentActive) {
        actions.push({
          type: 'reactivation_sequence',
          payload: { leadId: lead.id, workspaceId: lead.workspaceId },
          priority: 5,
        })
      }
      break
    }

    case 'score_threshold_hot': {
      actions.push({
        type: 'update_lead_status',
        payload: { leadId: lead.id, status: 'Hot' },
        priority: 1,
      })
      actions.push({
        type: 'notify_agent',
        payload: {
          workspaceId: lead.workspaceId,
          leadId: lead.id,
          message: `Lead ${lead.name} is now HOT with score ${lead.score}. Take action now.`,
          urgency: 'high',
        },
        priority: 1,
      })
      break
    }

    case 'score_threshold_auto_handoff': {
      actions.push({
        type: 'trigger_handoff',
        payload: {
          leadId: lead.id,
          workspaceId: lead.workspaceId,
          reason: `Auto-handoff: lead score reached ${lead.score} (threshold: ${config.autoHandoffScore})`,
        },
        priority: 1,
      })
      break
    }

    case 'budget_match': {
      actions.push({
        type: 'update_lead_status',
        payload: { leadId: lead.id, status: 'Hot' },
        priority: 1,
      })
      actions.push({
        type: 'notify_agent',
        payload: {
          workspaceId: lead.workspaceId,
          leadId: lead.id,
          message: `Lead ${lead.name} budget matches available properties. High priority.`,
          urgency: 'high',
        },
        priority: 1,
      })
      break
    }

    case 'qualified': {
      if (lead.score >= config.autoHandoffScore) {
        actions.push({
          type: 'trigger_handoff',
          payload: { leadId: lead.id, workspaceId: lead.workspaceId, reason: 'Lead fully qualified by AI' },
          priority: 1,
        })
      } else {
        actions.push({
          type: 'notify_agent',
          payload: {
            workspaceId: lead.workspaceId,
            leadId: lead.id,
            message: `Lead ${lead.name} is now qualified. Review and assign.`,
            urgency: 'medium',
          },
          priority: 2,
        })
      }
      break
    }

    // NEW TRIGGERS
    case 'negative_sentiment': {
      actions.push({
        type: 'trigger_handoff',
        payload: {
          leadId: lead.id,
          workspaceId: lead.workspaceId,
          reason: 'Negative sentiment detected in conversation. Human intervention recommended.',
        },
        priority: 1,
      })
      break
    }

    case 'booking_request': {
      actions.push({
        type: 'notify_agent',
        payload: {
          workspaceId: lead.workspaceId,
          leadId: lead.id,
          message: `Lead ${lead.name} is requesting to book a viewing. High priority.`,
          urgency: 'high',
        },
        priority: 1,
      })
      break
    }

    case 'whatsapp_received': {
      if (lead.aiAgentActive && !lead.humanTookOver && inboundMessage) {
        actions.push({
          type: 'enqueue_ai_reply',
          payload: { leadId: lead.id, workspaceId: lead.workspaceId, channel: 'whatsapp', inboundMessage },
          priority: 1,
        })
      }
      break
    }

    case 'crm_sync_required': {
      actions.push({
        type: 'crm_sync',
        payload: { leadId: lead.id, workspaceId: lead.workspaceId, syncType: 'update' },
        priority: 4,
      })
      break
    }
  }

  await dispatchActions(actions, lead.workspaceId)

  return { actions }
}

async function dispatchActions(actions: DecisionAction[], workspaceId: string) {
  for (const action of actions) {
    switch (action.type) {
      case 'enqueue_ai_reply':
        await enqueueJob({
          workspaceId,
          type: 'ai_reply',
          payload: action.payload,
          priority: action.priority,
          runAt: new Date(),
        })
        break

      case 'enqueue_followup':
        await enqueueJob({
          workspaceId,
          type: 'follow_up',
          payload: action.payload,
          priority: action.priority,
          runAt: new Date(),
        })
        break

      case 'reactivation_sequence':
        await enqueueJob({
          workspaceId,
          type: 'reactivation',
          payload: action.payload,
          priority: action.priority,
          runAt: new Date(),
        })
        break

      case 'trigger_handoff':
        await enqueueJob({
          workspaceId,
          type: 'handoff_notify',
          payload: action.payload,
          priority: action.priority,
          runAt: new Date(),
        })
        break

      case 'score_update':
        await enqueueJob({
          workspaceId,
          type: 'score_update',
          payload: action.payload,
          priority: action.priority,
          runAt: new Date(),
        })
        break

      case 'update_lead_status': {
        const { leadId, status } = action.payload as { leadId: string; status: string }
        await prisma.lead.update({ where: { id: leadId }, data: { status } })
        break
      }

      case 'notify_agent': {
        await enqueueJob({
          workspaceId,
          type: 'handoff_notify',
          payload: action.payload,
          priority: action.priority,
          runAt: new Date(),
        })
        break
      }

      case 'crm_sync':
        await enqueueJob({
          workspaceId,
          type: 'crm_sync',
          payload: action.payload,
          priority: action.priority,
          runAt: new Date(),
        })
        break
    }
  }
}

export async function evaluateAfterScoreUpdate(lead: Lead, config: AgentConfig) {
  if (lead.score >= config.autoHandoffScore && !lead.humanTookOver) {
    await evaluate({ lead, config, trigger: 'score_threshold_auto_handoff' })
  } else if (lead.score >= config.hotScoreThreshold && lead.status !== 'Hot') {
    await evaluate({ lead, config, trigger: 'score_threshold_hot' })
  }
}
 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only';
import { getRecord, insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { triggerN8nWebhook } from './n8n-client';
import { AUTOMATION_COLLECTIONS, } from '@/lib/models/automation';
import { logger } from '@/lib/logger';

/**
 * Automation Executor Service
 * Handles execution of automation rules, action invocation, and logging
 */










/**
 * Execute an automation rule
 * Evaluates trigger conditions, executes actions, and logs results
 */
export async function executeAutomationRule(
  rule,
  context
) {
  const executionStartTime = Date.now();
  const _executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info(`▶️ [Automation] Executing rule: ${rule.name} (${rule.id})`);

    // Check if rule is enabled
    if (!rule.enabled) {
      logger.warn(`⏸️ [Automation] Rule is disabled: ${rule.name}`);
      return false;
    }

    // Evaluate conditions (if present)
    if (!evaluateConditions(rule.conditions, context.triggeredByObject)) {
      logger.info(`⊘ [Automation] Conditions not met for rule: ${rule.name}`);
      return false;
    }

    // Execute actions
    const actionResults = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < rule.actions.length; i++) {
      const action = rule.actions[i];

      try {
        const actionSuccess = await executeAction(action, context, rule);

        actionResults.push({
          actionIndex: i,
          actionType: action.type,
          status: actionSuccess ? 'success' : 'failed',
          message: actionSuccess ? 'Action executed successfully' : 'Action failed',
          timestamp: new Date().toISOString(),
        });

        if (actionSuccess) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`❌ [Automation] Action ${i} failed:`, err);

        actionResults.push({
          actionIndex: i,
          actionType: action.type,
          status: 'failed',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        });

        failureCount++;
      }

      // Delay between actions if configured
      if (_optionalChain([rule, 'access', _ => _.executionSettings, 'optionalAccess', _2 => _2.delayBetweenActionsSeconds]) && i < rule.actions.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, rule.executionSettings.delayBetweenActionsSeconds * 1000)
        );
      }
    }

    const status = failureCount === 0 ? 'success' : failureCount === successCount ? 'failed' : 'partial_success';
    const durationMs = Date.now() - executionStartTime;

    // Log execution
    await logExecution({
      ruleId: rule.id,
      ruleName: rule.name,
      status,
      actionResults,
      durationMs,
      context,
      startedAt: new Date().toISOString(),
    });

    // Update rule stats
    await updateRuleStats(rule.id, status === 'success', status !== 'failed');

    const statusEmoji = status === 'success' ? '✓' : status === 'partial_success' ? '⚠️' : '❌';
    logger.info(
      `${statusEmoji} [Automation] Rule execution complete: ${rule.name} (${durationMs}ms, status: ${status})`
    );

    return status === 'success';
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`❌ [Automation] Rule execution failed: ${rule.name}`, err);

    // Log failed execution
    await logExecution({
      ruleId: rule.id,
      ruleName: rule.name,
      status: 'failed',
      actionResults: [],
      durationMs: Date.now() - executionStartTime,
      context,
      errorMessage,
      startedAt: new Date().toISOString(),
    });

    await updateRuleStats(rule.id, false, false);

    return false;
  }
}

/**
 * Execute a single action
 */
async function executeAction(
  action,
  context,
  rule
) {
  switch (action.type) {
    case 'send_email':
      return await sendEmailAction(action , context, rule);

    case 'send_whatsapp':
      return await sendWhatsAppAction(action , context, rule);

    case 'send_telegram':
      return await sendTelegramAction(action, context, rule);

    case 'send_sms':
      return await sendSMSAction(action, context, rule);

    case 'create_task':
      return await createTaskAction(action, context, rule);

    case 'update_status':
      return await updateStatusAction(action, context, rule);

    case 'add_note':
      return await addNoteAction(action, context, rule);

    case 'assign_agent':
      return await assignAgentAction(action, context, rule);

    default:
      logger.warn(`⚠️ [Automation] Unknown action type: ${action.type}`);
      return false;
  }
}

/**
 * Send email action
 */
async function sendEmailAction(
  action,
  context,
  _rule
) {
  try {
    // Trigger n8n workflow for email sending
    const success = await triggerN8nWebhook('send-email', {
      template: action.template,
      subject: action.subject,
      body: action.body,
      recipientField: action.recipientField,
      context,
      timestamp: new Date().toISOString(),
    });

    return success;
  } catch (err) {
    logger.error('Email action failed:', err);
    return false;
  }
}

/**
 * Send WhatsApp action
 */
async function sendWhatsAppAction(
  action,
  context,
  rule
) {
  try {
    // Trigger n8n workflow for WhatsApp messaging
    const success = await triggerN8nWebhook('send-whatsapp', {
      template: action.template,
      messageBody: action.messageBody,
      recipientField: action.recipientField,
      includePropertyDetails: action.includePropertyDetails,
      includeContactName: action.includeContactName,
      context,
      ruleId: rule.id,
      ruleName: rule.name,
      timestamp: new Date().toISOString(),
    });

    return success;
  } catch (err) {
    logger.error('WhatsApp action failed:', err);
    return false;
  }
}

/**
 * Send Telegram action
 */
async function sendTelegramAction(
  action,
  context,
  _rule
) {
  try {
    // Trigger n8n workflow for Telegram messaging
    const success = await triggerN8nWebhook('send-telegram', {
      template: action.template,
      messageBody: action.messageBody,
      recipientField: action.recipientField,
      context,
      timestamp: new Date().toISOString(),
    });

    return success;
  } catch (err) {
    logger.error('Telegram action failed:', err);
    return false;
  }
}

/**
 * Send SMS action
 */
async function sendSMSAction(
  action,
  context,
  _rule
) {
  try {
    // Trigger n8n workflow for SMS sending
    const success = await triggerN8nWebhook('send-sms', {
      messageBody: action.messageBody,
      recipientField: action.recipientField,
      context,
      timestamp: new Date().toISOString(),
    });

    return success;
  } catch (err) {
    logger.error('SMS action failed:', err);
    return false;
  }
}

/**
 * Create task action
 */
async function createTaskAction(
  action,
  context,
  _rule
) {
  try {
    await insertRecord('followups', {
      leadId: context.triggeredBy,
      type: 'other',
      title: action.title,
      notes: action.description,
      priority: action.priority,
      dueAt: new Date(Date.now() + (action.dueDaysFromNow || 0) * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: 'automation',
    });

    return true;
  } catch (err) {
    logger.error('Create task action failed:', err);
    return false;
  }
}

/**
 * Update status action
 */
async function updateStatusAction(
  action,
  context,
  _rule
) {
  try {
    if (!context.triggeredBy) return false;

    // Update the lead/unit status
    await updateRecord('leads', context.triggeredBy, {
        stage: action.newStatus,
        updatedAt: new Date().toISOString(),
      });

    return true;
  } catch (err) {
    logger.error('Update status action failed:', err);
    return false;
  }
}

/**
 * Add note action
 */
async function addNoteAction(
  action,
  context,
  _rule
) {
  try {
    if (!context.triggeredBy) return false;

    // Add a note to the lead
    await updateRecord('leads', context.triggeredBy, {
        notes: action.note,
        updatedAt: new Date().toISOString(),
      });

    return true;
  } catch (err) {
    logger.error('Add note action failed:', err);
    return false;
  }
}

/**
 * Assign agent action
 */
async function assignAgentAction(
  action,
  context,
  _rule
) {
  try {
    if (!context.triggeredBy) return false;

    let agentId = action.agentId;

    // If using round-robin strategy, pick the agent with least assignments
    if (action.assignmentStrategy === 'round_robin') {
      const agents = await listRecords('profiles', {
        where: [{ column: 'role', value: 'agent' }],
        select: 'id',
      });
      if (agents.length === 0) return false;

      // Simple round-robin: pick random agent
      agentId = agents[Math.floor(Math.random() * agents.length)].id;
    }

    // Assign agent to lead
    await updateRecord('leads', context.triggeredBy, {
        assignedTo: agentId,
        updatedAt: new Date().toISOString(),
      });

    return true;
  } catch (err) {
    logger.error('Assign agent action failed:', err);
    return false;
  }
}

/**
 * Evaluate rule conditions
 */
function evaluateConditions(
  conditions,
  triggeredByObject
) {
  if (!conditions) return true;
  if (!triggeredByObject) return true;

  // Evaluate min lead score
  if (conditions.minLeadScore !== undefined) {
    const score = _optionalChain([(triggeredByObject.aiProfiling ), 'optionalAccess', _3 => _3.score]) || 0;
    if (score < conditions.minLeadScore) return false;
  }

  // Evaluate property value range
  if (conditions.minPropertyValue !== undefined) {
    const price = _optionalChain([(triggeredByObject ), 'optionalAccess', _4 => _4.price]) || 0;
    if (price < conditions.minPropertyValue) return false;
  }

  if (conditions.maxPropertyValue !== undefined) {
    const price = _optionalChain([(triggeredByObject ), 'optionalAccess', _5 => _5.price]) || 0;
    if (price > conditions.maxPropertyValue) return false;
  }

  return true;
}

/**
 * Log execution
 */
async function logExecution(
  logData
) {
  try {
    // Firestore accepted whatever shape it was handed. Postgres rejects unknown
    // columns, so the trigger context is flattened onto the columns that exist
    // rather than written as a nested `context` blob.
    const { context, errorMessage, ...rest } = logData;
    await insertRecord(AUTOMATION_COLLECTIONS.executionLogs, {
      ...rest,
      triggerType: _nullishCoalesce(_optionalChain([context, 'optionalAccess', _6 => _6.triggerType]), () => ( null)),
      triggeredBy: _nullishCoalesce(_optionalChain([context, 'optionalAccess', _7 => _7.triggeredBy]), () => ( null)),
      triggeredByObject: _nullishCoalesce(_optionalChain([context, 'optionalAccess', _8 => _8.triggeredByObject]), () => ( {})),
      error: _nullishCoalesce(errorMessage, () => ( null)),
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to log execution:', err);
  }
}

/**
 * Update rule statistics
 */
async function updateRuleStats(ruleId, success, executed) {
  try {
    const rule = await getRecord(AUTOMATION_COLLECTIONS.rules, ruleId);
    if (!rule) return;

    // `stats` is one JSONB column, so the counters are read-merge-written rather
    // than addressed with Firestore's dotted paths. Two concurrent executions
    // can therefore lose a count; the rule stats are advisory, and the execution
    // log (one row per run) stays the authoritative record.
    const stats = _nullishCoalesce(rule.stats, () => ( ({} )));
    await updateRecord(AUTOMATION_COLLECTIONS.rules, ruleId, {
      stats: {
        ...stats,
        totalRuns: (stats.totalRuns || 0) + (executed ? 1 : 0),
        successCount: (stats.successCount || 0) + (success ? 1 : 0),
        failureCount: (stats.failureCount || 0) + (!success && executed ? 1 : 0),
        lastExecutedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error('Failed to update rule stats:', err);
  }
}

/**
 * Trigger a rule manually (for testing)
 */
export async function triggerRuleManually(ruleId, triggerData) {
  try {
    const rule = await getRecord(AUTOMATION_COLLECTIONS.rules, ruleId);

    if (!rule) {
      logger.error(`Rule not found: ${ruleId}`);
      return false;
    }

    return await executeAutomationRule(rule, {
      ruleId,
      ruleName: rule.name,
      triggerType: 'manual',
      triggeredByObject: triggerData,
    });
  } catch (err) {
    logger.error('Failed to trigger rule manually:', err);
    return false;
  }
}

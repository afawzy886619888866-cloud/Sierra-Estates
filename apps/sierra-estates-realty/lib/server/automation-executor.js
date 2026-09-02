 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only';
import { adminDb } from './firebase-admin';
import { triggerN8nWebhook } from './n8n-client';
import { AUTOMATION_COLLECTIONS, } from '@/lib/models/automation';
import { logger } from '@/lib/logger';
import { Timestamp } from 'firebase-admin/firestore';

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
          timestamp: Timestamp.now(),
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
          timestamp: Timestamp.now(),
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
      startedAt: Timestamp.now(),
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
      startedAt: Timestamp.now(),
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
    // Create a task in Firestore
    await adminDb.collection('followups').add({
      leadId: context.triggeredBy,
      type: 'other',
      title: action.title,
      notes: action.description,
      priority: action.priority,
      dueAt: Timestamp.fromDate(new Date(Date.now() + (action.dueDaysFromNow || 0) * 24 * 60 * 60 * 1000)),
      status: 'pending',
      createdAt: Timestamp.now(),
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
    await adminDb
      .collection('leads')
      .doc(context.triggeredBy)
      .update({
        stage: action.newStatus,
        updatedAt: Timestamp.now(),
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
    await adminDb
      .collection('leads')
      .doc(context.triggeredBy)
      .update({
        notes: action.note,
        updatedAt: Timestamp.now(),
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
      const agents = await adminDb.collection('users').where('role', '==', 'agent').get();
      if (agents.empty) return false;

      // Simple round-robin: pick random agent
      agentId = agents.docs[Math.floor(Math.random() * agents.size)].id;
    }

    // Assign agent to lead
    await adminDb
      .collection('leads')
      .doc(context.triggeredBy)
      .update({
        assignedTo: agentId,
        updatedAt: Timestamp.now(),
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
 * Log execution to Firestore
 */
async function logExecution(logData) {
  try {
    await adminDb.collection(AUTOMATION_COLLECTIONS.executionLogs).add({
      ...logData,
      completedAt: Timestamp.now(),
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
    const ruleRef = adminDb.collection(AUTOMATION_COLLECTIONS.rules).doc(ruleId);
    const ruleDoc = await ruleRef.get();

    if (!ruleDoc.exists) return;

    const rule = ruleDoc.data() ;

    await ruleRef.update({
      'stats.totalRuns': (rule.stats.totalRuns || 0) + (executed ? 1 : 0),
      'stats.successCount': (rule.stats.successCount || 0) + (success ? 1 : 0),
      'stats.failureCount': (rule.stats.failureCount || 0) + (!success && executed ? 1 : 0),
      'stats.lastExecutedAt': Timestamp.now(),
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
    const ruleDoc = await adminDb.collection(AUTOMATION_COLLECTIONS.rules).doc(ruleId).get();

    if (!ruleDoc.exists) {
      logger.error(`Rule not found: ${ruleId}`);
      return false;
    }

    const rule = { id: ruleDoc.id, ...ruleDoc.data() } ;

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

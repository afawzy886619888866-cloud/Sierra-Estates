/**
 * SIERRA ESTATES — STAGE 8: VIEWING & SITE INSPECTION ORCHESTRATOR
 * 
 * Manages site viewing scheduling, inspection checklists, stakeholder confirmations,
 * and lifecycle progression toward closing readiness.
 */

export interface ViewingScheduleRequest {
  leadId: string;
  leadName?: string;
  leadPhone?: string;
  unitId: string | number;
  unitTitle?: string;
  compound?: string;
  advisorId?: string;
  scheduledTime: Date | string;
  location?: string;
  notes?: string;
}

export interface ViewingRecord {
  id: string;
  leadId: string;
  unitId: string | number;
  advisorId: string;
  scheduledAt: string;
  location: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  reminderSent: boolean;
  notes?: string;
  inspectionChecklist: string[];
  createdAt: string;
}

export interface ViewingCompletionResult {
  viewingId: string;
  leadId: string;
  unitId: string | number;
  status: 'completed';
  outcome: 'interested_closing' | 'interested_negotiating' | 'passed' | 'revisit_requested';
  feedbackNotes: string;
  nextStep: string;
}

const DEFAULT_INSPECTION_CHECKLIST = [
  'Verify physical finishing status against listing claim',
  'Inspect natural lighting and compound view orientation (sea/garden/pool)',
  'Check dedicated parking slot and storage room availability',
  'Review utility connections (water, power, natural gas meters)',
  'Inspect clubhouse and compound facilities accessibility',
];

/**
 * Creates a verified viewing record.
 */
export function createViewingSchedule(request: ViewingScheduleRequest): ViewingRecord {
  const scheduledDate = new Date(request.scheduledTime);
  const viewingId = `VIEW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  return {
    id: viewingId,
    leadId: request.leadId,
    unitId: request.unitId,
    advisorId: request.advisorId || 'system_closer',
    scheduledAt: scheduledDate.toISOString(),
    location: request.location || (request.compound ? `${request.compound} Gate / Site Office` : 'New Cairo Site Office'),
    status: 'scheduled',
    reminderSent: false,
    notes: request.notes,
    inspectionChecklist: [...DEFAULT_INSPECTION_CHECKLIST],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Formats a WhatsApp or Telegram confirmation alert for the viewing.
 */
export function formatViewingAlert(viewing: ViewingRecord, leadName: string = 'Stakeholder', unitTitle: string = 'Signature Asset'): string {
  const dateFormatted = new Date(viewing.scheduledAt).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  });

  return [
    `🗓️ *Sierra Estates — Private Viewing Scheduled*`,
    `✦ *Client*: ${leadName}`,
    `✦ *Property*: ${unitTitle} (ID: ${viewing.unitId})`,
    `✦ *Time*: ${dateFormatted} (Cairo Time)`,
    `✦ *Location*: ${viewing.location}`,
    `✦ *Inspection Protocol*: Standard 5-point verification active`,
  ].join('\n');
}

/**
 * Completes a viewing and returns the strategic next step.
 */
export function completeViewingSession(
  viewing: ViewingRecord,
  outcome: 'interested_closing' | 'interested_negotiating' | 'passed' | 'revisit_requested',
  notes: string = ''
): ViewingCompletionResult {
  let nextStep: string;
  switch (outcome) {
    case 'interested_closing':
      nextStep = 'Transition to Stage 9: Closing & MOU (Form F) Ratification';
      break;
    case 'interested_negotiating':
      nextStep = 'Activate Stage 9: Arabic Price Negotiation & Installment Adjustment';
      break;
    case 'revisit_requested':
      nextStep = 'Schedule second inspection with architect/family members';
      break;
    case 'passed':
    default:
      nextStep = 'Capture specific objections for Neural Matching Engine re-calibration';
      break;
  }

  return {
    viewingId: viewing.id,
    leadId: viewing.leadId,
    unitId: viewing.unitId,
    status: 'completed',
    outcome,
    feedbackNotes: notes,
    nextStep,
  };
}

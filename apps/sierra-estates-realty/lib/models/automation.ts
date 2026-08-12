/**
 * AUTOMATION RULES & EXECUTION MODEL
 * Defines the structure for workflow automation rules, triggers, actions, and execution logs
 */

import { Timestamp, FieldValue } from 'firebase/firestore';
import { BaseDocument } from './schema';

// ─── Automation Triggers ─────────────────────────────────────────────
export type TriggerType =
  | 'lead_created'
  | 'property_viewed'
  | 'status_changed'
  | 'price_changed'
  | 'time_based'
  | 'manual';

export interface Trigger {
  type: TriggerType;

  // Trigger-specific config
  statusChangeFrom?: string;
  statusChangeTo?: string;
  priceThreshold?: number;
  delayMinutes?: number;        // for time_based
  recurringCron?: string;       // for recurring schedules (e.g., "0 9 * * MON")

  // Conditions
  minPrice?: number;
  maxPrice?: number;
  propertyTypes?: string[];
  locations?: string[];
  leadMinScore?: number;
}

// ─── Automation Actions ──────────────────────────────────────────────
export type ActionType =
  | 'send_email'
  | 'send_whatsapp'
  | 'send_telegram'
  | 'send_sms'
  | 'create_task'
  | 'update_status'
  | 'add_note'
  | 'assign_agent';

export interface EmailAction {
  type: 'send_email';
  template: string;           // Template name (e.g., 'welcome_email')
  subject: string;
  subject_ar?: string;
  body: string;
  body_ar?: string;
  recipientField: string;     // 'leadEmail' | 'agentEmail' | 'managerEmail'
}

export interface WhatsAppAction {
  type: 'send_whatsapp';
  template: string;           // Template name
  messageBody: string;
  messageBody_ar?: string;
  recipientField: string;     // 'leadPhone' | 'ownerPhone'
  includePropertyDetails?: boolean;
  includeContactName?: boolean;
}

export interface TelegramAction {
  type: 'send_telegram';
  template: string;
  messageBody: string;
  messageBody_ar?: string;
  recipientField: string;
  includePropertyDetails?: boolean;
}

export interface SMSAction {
  type: 'send_sms';
  messageBody: string;
  messageBody_ar?: string;
  recipientField: string;
}

export interface TaskAction {
  type: 'create_task';
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignToField: string;      // 'agentId' | 'managerId'
  dueDaysFromNow?: number;
}

export interface StatusChangeAction {
  type: 'update_status';
  newStatus: string;
  notes?: string;
}

export interface NoteAction {
  type: 'add_note';
  note: string;
  note_ar?: string;
}

export interface AssignAction {
  type: 'assign_agent';
  agentId?: string;           // Fixed agent, or...
  assignmentStrategy?: 'round_robin' | 'by_region' | 'random';
}

export type Action = EmailAction | WhatsAppAction | TelegramAction | SMSAction |
                    TaskAction | StatusChangeAction | NoteAction | AssignAction;

// ─── Automation Rule (Main Document) ─────────────────────────────────
export interface AutomationRule extends BaseDocument {
  // Metadata
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;

  // Template category (for quick-start templates)
  templateId?: string;        // 'welcome_email', 'big_deal_alert', etc.

  // Configuration
  trigger: Trigger;
  actions: Action[];
  enabled: boolean;

  // Conditions (optional: global constraints)
  conditions?: {
    minLeadScore?: number;
    minPropertyValue?: number;
    maxPropertyValue?: number;
    requiresApproval?: boolean;
  };

  // Execution Settings
  executionSettings?: {
    maxExecutionsPerDay?: number;
    delayBetweenActionsSeconds?: number;
    retryOnFailure?: boolean;
    maxRetries?: number;
  };

  // Statistics
  stats: {
    totalRuns: number;
    successCount: number;
    failureCount: number;
    lastExecutedAt?: Timestamp | FieldValue;
    nextScheduledAt?: Timestamp | FieldValue;
  };

  // Admin metadata
  createdBy?: string;
  updatedBy?: string;
  tags?: string[];
}

// ─── Execution Log Entry ──────────────────────────────────────────────
export interface ExecutionLog extends BaseDocument {
  ruleId: string;             // FK -> automationRules
  ruleName: string;

  // Trigger context
  triggerType: TriggerType;
  triggeredBy?: string;       // leadId, propertyId, etc.
  triggeredByObject?: Record<string, unknown>;

  // Execution details
  status: 'pending' | 'executing' | 'success' | 'partial_success' | 'failed';
  startedAt: Timestamp | FieldValue;
  completedAt?: Timestamp | FieldValue;
  durationMs?: number;

  // Actions executed
  actionResults: Array<{
    actionIndex: number;
    actionType: ActionType;
    status: 'success' | 'failed';
    message?: string;
    externalId?: string;       // e.g., email ID, message SID
    timestamp: Timestamp | FieldValue;
  }>;

  // Error handling
  errorMessage?: string;
  errorCode?: string;
  retryCount?: number;

  // Context data
  context?: Record<string, unknown>;

  // Metadata
  executedBy?: string;       // 'system' | userId
  manualTriggered?: boolean;
}

// ─── Automation Template (Pre-built Rules) ──────────────────────────
export type TemplateId =
  | 'welcome_email'
  | 'big_deal_alert'
  | 'property_alert'
  | 'deal_won'
  | 'lead_followup'
  | 'loan_approval'
  | 'document_reminder';

export interface AutomationTemplate {
  id: TemplateId;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  category: 'leads' | 'properties' | 'sales' | 'compliance';
  icon: string;
  defaultRule: Partial<AutomationRule>;
  variables?: Array<{
    key: string;
    label: string;
    description: string;
    defaultValue?: string;
  }>;
}

// ─── Collection Constants ────────────────────────────────────────────
export const AUTOMATION_COLLECTIONS = {
  rules: 'automation_rules',
  executionLogs: 'automation_execution_logs',
} as const;

// ─── Template Definitions (Built-in Templates) ──────────────────────
export const AUTOMATION_TEMPLATES: Record<TemplateId, AutomationTemplate> = {
  welcome_email: {
    id: 'welcome_email',
    name: 'Welcome Email',
    name_ar: 'بريد الترحيب',
    description: 'Send an automatic welcome email to new leads',
    description_ar: 'إرسال بريد ترحيب تلقائي للعملاء الجدد',
    category: 'leads',
    icon: 'envelope',
    defaultRule: {
      name: 'Welcome New Lead',
      description: 'Send welcome email to new investment stakeholders',
      trigger: {
        type: 'lead_created',
      },
      actions: [
        {
          type: 'send_email',
          template: 'welcome',
          subject: 'Welcome to Sierra Estates',
          body: 'Welcome to our luxury real estate platform. We are excited to help you find your perfect property.',
          recipientField: 'leadEmail',
        } as EmailAction,
      ],
      enabled: true,
      stats: {
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
      },
    },
  },

  big_deal_alert: {
    id: 'big_deal_alert',
    name: 'Big Deal Alert',
    name_ar: 'تنبيه الصفقات الكبيرة',
    description: 'Notify manager for high-value properties (>1M EGP)',
    description_ar: 'إخطار المدير بالعقارات عالية القيمة (> 1 مليون جنيه)',
    category: 'properties',
    icon: 'alert-circle',
    defaultRule: {
      name: 'High Value Property Alert',
      description: 'Alert managers when properties exceed 1M EGP',
      trigger: {
        type: 'property_viewed',
        minPrice: 1000000,
      },
      actions: [
        {
          type: 'send_email',
          template: 'big_deal_alert',
          subject: 'High Value Property - Manager Alert',
          body: 'A lead has viewed a high-value property. Details: {propertyDetails}',
          recipientField: 'managerEmail',
        } as EmailAction,
      ],
      enabled: true,
      stats: {
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
      },
    },
  },

  property_alert: {
    id: 'property_alert',
    name: 'Property Alert',
    name_ar: 'تنبيه العقارات',
    description: 'New listings in buyer\'s preference zone',
    description_ar: 'قوائم جديدة في منطقة تفضيل المشتري',
    category: 'properties',
    icon: 'home',
    defaultRule: {
      name: 'Buyer Preference Alert',
      description: 'Alert buyers when new properties match their preferences',
      trigger: {
        type: 'property_viewed',
      },
      actions: [
        {
          type: 'send_whatsapp',
          template: 'property_match',
          messageBody: 'We found a property matching your preferences! Check it out: {propertyLink}',
          recipientField: 'leadPhone',
          includePropertyDetails: true,
          includeContactName: true,
        } as WhatsAppAction,
      ],
      enabled: true,
      stats: {
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
      },
    },
  },

  deal_won: {
    id: 'deal_won',
    name: 'Deal Won',
    name_ar: 'الصفقة المربحة',
    description: 'Celebration email when property sells',
    description_ar: 'بريد احتفالي عند بيع العقار',
    category: 'sales',
    icon: 'check-circle',
    defaultRule: {
      name: 'Sale Celebration',
      description: 'Send celebration email when a deal closes',
      trigger: {
        type: 'status_changed',
        statusChangeTo: 'closed-won',
      },
      actions: [
        {
          type: 'send_email',
          template: 'deal_won',
          subject: 'Congratulations on Your New Property!',
          body: 'We are thrilled to congratulate you on closing your deal. Welcome to your new home!',
          recipientField: 'leadEmail',
        } as EmailAction,
      ],
      enabled: true,
      stats: {
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
      },
    },
  },

  lead_followup: {
    id: 'lead_followup',
    name: 'Lead Follow-up',
    name_ar: 'متابعة العملاء',
    description: 'Auto-sequence after viewing',
    description_ar: 'سلسلة تلقائية بعد الزيارة',
    category: 'leads',
    icon: 'send',
    defaultRule: {
      name: 'Viewing Follow-up',
      description: 'Send follow-up message 24h after property viewing',
      trigger: {
        type: 'time_based',
        delayMinutes: 1440,
      },
      actions: [
        {
          type: 'send_whatsapp',
          template: 'followup_viewing',
          messageBody: 'Hi {contactName}, how did you like the property? We would love to hear your thoughts!',
          recipientField: 'leadPhone',
          includeContactName: true,
        } as WhatsAppAction,
      ],
      enabled: true,
      stats: {
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
      },
    },
  },

  loan_approval: {
    id: 'loan_approval',
    name: 'Loan Approval',
    name_ar: 'موافقة القرض',
    description: 'Trigger when financing confirmed',
    description_ar: 'تفعيل عند تأكيد التمويل',
    category: 'leads',
    icon: 'credit-card',
    defaultRule: {
      name: 'Financing Confirmed',
      description: 'Notify agent when financing is approved',
      trigger: {
        type: 'status_changed',
        statusChangeTo: 'financing-approved',
      },
      actions: [
        {
          type: 'create_task',
          title: 'Prepare closing documents',
          description: 'Financing approved. Prepare closing documents and schedule final walkthrough.',
          priority: 'high',
          assignToField: 'agentId',
          dueDaysFromNow: 3,
        } as TaskAction,
      ],
      enabled: true,
      stats: {
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
      },
    },
  },

  document_reminder: {
    id: 'document_reminder',
    name: 'Document Reminder',
    name_ar: 'تذكير المستندات',
    description: 'Send required docs checklist',
    description_ar: 'إرسال قائمة المستندات المطلوبة',
    category: 'compliance',
    icon: 'file-text',
    defaultRule: {
      name: 'Document Checklist',
      description: 'Send document checklist reminder',
      trigger: {
        type: 'status_changed',
        statusChangeTo: 'contract-phase',
      },
      actions: [
        {
          type: 'send_email',
          template: 'document_checklist',
          subject: 'Required Documents Checklist',
          body: 'Please provide the following documents: ID, proof of address, proof of funds, and signed agreement.',
          recipientField: 'leadEmail',
        } as EmailAction,
      ],
      enabled: true,
      stats: {
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
      },
    },
  },
};

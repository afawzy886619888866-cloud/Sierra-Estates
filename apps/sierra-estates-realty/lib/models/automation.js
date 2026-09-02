







// ─── Automation Triggers ─────────────────────────────────────────────
 

























































































































































































































// ─── Collection Constants ────────────────────────────────────────────
export const AUTOMATION_COLLECTIONS = {
  rules: 'automation_rules',
  executionLogs: 'automation_execution_logs',
} ;

// ─── Template Definitions (Built-in Templates) ──────────────────────
export const AUTOMATION_TEMPLATES = {
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
        } ,
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
        } ,
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
        } ,
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
        } ,
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
        } ,
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
        } ,
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
        } ,
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

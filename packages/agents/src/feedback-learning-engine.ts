/**
 * SIERRA ESTATES — STAGE 10: FEEDBACK & LEARNING ENGINE
 * 
 * Captures stakeholder feedback, logs deal objections into the memory graph,
 * and generates automated pricing adjustment recommendations for listings.
 */

export interface StakeholderFeedback {
  leadId: string;
  unitId: string | number;
  action: 'pass' | 'interested' | 'offer_submitted';
  rating?: number; // 1-5
  reason?: string;
  timestamp: string;
}

export interface ObjectionAnalysis {
  category: 'price_too_high' | 'location_concern' | 'finishing_dissatisfaction' | 'layout_size' | 'other';
  rawReason: string;
  suggestedAction: string;
  recommendedPriceDropPct?: number;
}

export interface LearningEngineUpdate {
  leadId: string;
  newDislikesDiscovered: string[];
  objection: ObjectionAnalysis;
  alertMessage: string;
}

/**
 * Analyzes a stakeholder objection to extract root cause and tactical responses.
 */
export function analyzeObjection(reason: string, _currentPrice?: number): ObjectionAnalysis {
  const normalized = (reason || '').toLowerCase();

  if (
    normalized.includes('expensive') ||
    normalized.includes('overpriced') ||
    normalized.includes('high price') ||
    normalized.includes('سعر عالي') ||
    normalized.includes('غالي')
  ) {
    return {
      category: 'price_too_high',
      rawReason: reason,
      suggestedAction: 'Propose 5-8% price adjustment or renegotiate installment structure',
      recommendedPriceDropPct: 6,
    };
  }

  if (
    normalized.includes('location') ||
    normalized.includes('far') ||
    normalized.includes('noise') ||
    normalized.includes('بعيد') ||
    normalized.includes('موقع')
  ) {
    return {
      category: 'location_concern',
      rawReason: reason,
      suggestedAction: 'Pivot stakeholder to closer phase within the compound or adjacent compound',
    };
  }

  if (
    normalized.includes('finishing') ||
    normalized.includes('core') ||
    normalized.includes('shell') ||
    normalized.includes('تشطيب') ||
    normalized.includes('محارة')
  ) {
    return {
      category: 'finishing_dissatisfaction',
      rawReason: reason,
      suggestedAction: 'Offer Sierra turnkey architectural finishing package quotation',
    };
  }

  if (
    normalized.includes('small') ||
    normalized.includes('layout') ||
    normalized.includes('rooms') ||
    normalized.includes('مساحة') ||
    normalized.includes('صغير')
  ) {
    return {
      category: 'layout_size',
      rawReason: reason,
      suggestedAction: 'Filter inventory for higher net square meter ratio and larger floor plans',
    };
  }

  return {
    category: 'other',
    rawReason: reason,
    suggestedAction: 'Conduct 1-on-1 advisor briefing to clarify stakeholder expectations',
  };
}

/**
 * Processes stakeholder selection feedback and updates cognitive preferences.
 */
export function processSelectionFeedback(feedback: StakeholderFeedback): LearningEngineUpdate {
  const objection = analyzeObjection(feedback.reason || '');
  const newDislikes: string[] = [];

  const rawLower = (feedback.reason || '').toLowerCase();
  if (rawLower.includes('dark') || rawLower.includes('مظلم')) {
    newDislikes.push('dark units');
  }
  if (rawLower.includes('low floor') || rawLower.includes('دور ارضي')) {
    newDislikes.push('ground floor');
  }
  if (rawLower.includes('core and shell') || rawLower.includes('طوب احمر')) {
    newDislikes.push('unfinished units');
  }

  const alertMessage =
    feedback.action === 'interested'
      ? `🔥 High Intent: Stakeholder ${feedback.leadId} indicated active interest in Asset ${feedback.unitId}.`
      : `📝 Learning Updated: Stakeholder ${feedback.leadId} passed on Asset ${feedback.unitId}. Root: ${objection.category}.`;

  return {
    leadId: feedback.leadId,
    newDislikesDiscovered: newDislikes,
    objection,
    alertMessage,
  };
}

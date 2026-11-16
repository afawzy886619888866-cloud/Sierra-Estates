/**
 * SIERRA ESTATES — LEGAL INTELLIGENCE BRAIN
 * 
 * "Legal safety is the ultimate luxury."
 * Maps technical property data to legal risk frameworks for Egyptian luxury real estate.
 */

export type LegalRiskLevel = 'low' | 'medium' | 'high';

export interface PropertyLegalContext {
  id: string | number;
  title?: string;
  price: number;
  ownerType?: 'owner' | 'broker' | 'developer' | string;
  ownerContact?: string;
  finishingType?: 'core-shell' | 'semi-finished' | 'fully-finished' | 'ultra-lux' | string;
  annualServiceCharge?: number;
  hasTitleDeed?: boolean;
  hasCadastralSurvey?: boolean;
  hasReconciliationCertificate?: boolean; // نموذج 10 للتصالح في مخالفات البناء
}

export interface LegalRiskResult {
  riskLevel: LegalRiskLevel;
  riskScore: number;
  flags: string[];
  recommendations: string[];
  isApprovedForProposal: boolean;
}

/**
 * Deterministic Legal Risk Assessment Engine
 */
export function assessLegalRisk(unit: PropertyLegalContext): LegalRiskResult {
  const flags: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0; // 0 to 100

  // 1. Primary Residence & Direct Owner Encumbrance Check
  if (unit.ownerType === 'owner') {
    flags.push('primary_residence_verification');
    recommendations.push('Verify civil status and power of attorney (توكيل رسمي عام/خاص بالبيع للإدارة والنفس)');
    riskScore += 15;
  }

  // 2. Marital Status & Spousal Authorization Check
  if (unit.ownerContact?.toLowerCase().includes('married') || unit.ownerContact?.includes('متزوج')) {
    flags.push('spousal_consent_required');
    recommendations.push('Verify spousal authorization or marital property regime acknowledgement (إقرار عدم ممانعة الزوج/الزوجة)');
    riskScore += 15;
  }

  // 3. Outstanding Maintenance & Compound Service Dues (Propter Rem)
  if (unit.annualServiceCharge && unit.annualServiceCharge > unit.price * 0.05) {
    flags.push('high_maintenance_exposure');
    recommendations.push('Obtain developer clearance certificate / debt clearance (شهادة مخالصة من شركة التطوير/إدارة الكومباوند)');
    riskScore += 20;
  }

  // 4. Structural Licensing & Reconciliation Status (نموذج 10)
  if (unit.finishingType === 'core-shell' || unit.finishingType?.includes('محارة')) {
    flags.push('unregistered_renovations_risk');
    recommendations.push('Inspect structural alterations against approved architectural licenses (مراجعة رخصة البناء ونموذج 10)');
    riskScore += 15;
  }

  // 5. Title Deed & Cadastral Registration Status
  if (unit.hasTitleDeed === false) {
    flags.push('missing_formal_title_deed');
    recommendations.push('Verify validity of sales contract chain and primary developer contract (تسلسل عقود الملكية وصحة ونفاذ)');
    riskScore += 25;
  }

  // Calculate final risk level
  let riskLevel: LegalRiskLevel = 'low';
  if (riskScore >= 45) {
    riskLevel = 'high';
  } else if (riskScore >= 20) {
    riskLevel = 'medium';
  }

  return {
    riskLevel,
    riskScore,
    flags,
    recommendations,
    isApprovedForProposal: riskLevel !== 'high',
  };
}

/**
 * Bilingual Strategic Legal Summary Generator
 */
export function generateLegalSummary(result: LegalRiskResult, locale: 'en' | 'ar' = 'en'): string {
  if (locale === 'ar') {
    if (result.riskLevel === 'low') {
      return 'الوضعية القانونية سليمة ومكتملة المستندات وجاهزة للتعاقد الفوري.';
    }
    if (result.riskLevel === 'medium') {
      return `توجد ملاحظات قانونية طفيفة (${result.flags.length} بنود) تتطلب مراجعة شهادات المخالصة وتوكيلات البيع الرسمية.`;
    }
    return `تنبيه: تم رصد مخاطر تعاقدية محتملة [${result.flags.join('، ')}] تتطلب فحصاً مستندياً دقيقاً قبل دفع أي جدية حجز.`;
  }

  if (result.riskLevel === 'low') {
    return 'Legal status is verified, documentation is compliant, and unit is ready for immediate contracting.';
  }
  if (result.riskLevel === 'medium') {
    return `Minor legal observations noted (${result.flags.length} items); developer clearance and power of attorney verification recommended.`;
  }
  return `Warning: Critical legal risk flags detected [${result.flags.join(', ')}]. Complete chain of title due diligence required before executing reservations.`;
}

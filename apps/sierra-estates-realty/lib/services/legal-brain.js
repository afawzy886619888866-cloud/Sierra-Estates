 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }







 








/**
 * Deterministic Risk Assessment Engine
 * Based on the 'Leiloeiro Juridico' specialized skill protocols.
 */
export function assessLegalRisk(unit) {
  const flags = [];
  const recommendations = [];
  let riskScore = 0; // 0 to 100

  // 1. Homestead Protection Check (Bem de Família - Lei 8.009/90)
  if (unit.ownerType === 'owner') {
    // High risk if it's a primary residence being sold without due diligence
    flags.push('homestead_potential');
    recommendations.push('Verify if this is the owners primary residence (Lei 8.009/90)');
    riskScore += 20;
  }

  // 2. Marital Status & Spousal Notification (Art. 842 CPC)
  // Note: In a real system, this would be fueled by actual Document data
  if (_optionalChain([unit, 'access', _ => _.ownerContact, 'optionalAccess', _2 => _2.toLowerCase, 'call', _3 => _3(), 'access', _4 => _4.includes, 'call', _5 => _5('married')])) {
    flags.push('spousal_consent_required');
    recommendations.push('Ensure spousal notification is signed and notarized (Art. 842 CPC)');
    riskScore += 15;
  }

  // 3. Tax & Maintenance Exposure (IPTU/Condominio)
  if (unit.annualServiceCharge && unit.annualServiceCharge > (unit.price * 0.05)) {
    flags.push('high_maintenance_exposure');
    recommendations.push('Verify pending maintenance fees (Propter Rem debt risk)');
    riskScore += 10;
  }

  // 4. Documentation Status
  if (unit.finishingType === 'core-shell') {
    flags.push('unregistered_renovations_risk');
    recommendations.push('Verify if structural permits are cleared with local municipality');
    riskScore += 10;
  }

  // Calculate final risk level
  let riskLevel = 'low';
  if (riskScore > 40) riskLevel = 'high';
  else if (riskScore > 15) riskLevel = 'medium';

  return {
    riskLevel,
    flags,
    recommendations,
    isApprovedForProposal: riskLevel !== 'high', // Automically block high-risk assets from proposals
  };
}

/**
 * Strategic Summary Generator (Bilingual)
 */
export function generateLegalSummary(result, locale) {
  if (locale === 'ar') {
    if (result.riskLevel === 'low') return 'الوضعية القانونية سليمة وجاهزة للتعاقد الفوري.';
    if (result.riskLevel === 'medium') return 'توجد ملاحظات قانونية طفيفة تتطلب مراجعة المستندات الأصلية.';
    return 'تنبيه: توجد مخاطر قانونية محتملة تتطلب فحصاً دقيقاً قبل المضي قدماً.';
  }

  if (result.riskLevel === 'low') return 'Legal status is verified and ready for immediate contract.';
  if (result.riskLevel === 'medium') return 'Minor legal observations noted; document verification recommended.';
  return 'Warning: Potential legal risks detected. Due diligence required before proceeding.';
}

import assert from 'node:assert/strict';

// Import our TypeScript engines via tsx or compiled output, or test the logic directly
import {
  buildSierraCodeMetadata,
  generateSierraCode,
  parseSierraCode,
  normalizeLocationCode,
} from '../packages/agents/src/sierra-coding-engine.ts';

import {
  calcPricePerSqm,
  calcGrossYield,
  calcNetYield,
  calcCapitalAppreciation,
  calcROI,
  calcPaybackPeriod,
  calcAppraisedValue,
  computeFullMetrics,
  formatCompactEGP,
} from '../packages/agents/src/financial-metrics-engine.ts';

import { assessLegalRisk, generateLegalSummary } from '../packages/agents/src/legal-risk-engine.ts';
import { createViewingSchedule, completeViewingSession } from '../packages/agents/src/viewing-orchestrator.ts';
import { runClosingSimulation } from '../packages/agents/src/closing-simulator-engine.ts';
import { rankPropertiesForStakeholder } from '../packages/agents/src/neural-matching-engine.ts';
import { processSelectionFeedback } from '../packages/agents/src/feedback-learning-engine.ts';
import { validateMemorySafety, findPotentialSecrets } from '../packages/memory-engine/src/vault-sanitizer.ts';

console.log('🧪 Verifying Ported OpenClaw & ECC Engines in Sierra Estates...');

// 1. Sierra Coding Engine
const meta = buildSierraCodeMetadata({
  compound: 'Mivida',
  rooms: 3,
  furnishingStatus: 'fully furnished',
  price: 75000,
  currency: 'EGP',
  features: ['garden'],
});
assert.equal(meta.code, 'MVD-3F-75K+G');
assert.equal(meta.locationCode, 'MVD');
assert.equal(meta.rooms, 3);
assert.equal(meta.furnishingStatus, 'F');
assert.equal(meta.priceToken, '75K');

const parsed = parseSierraCode('VLT-4S-1.5M+P');
assert.equal(parsed.location, 'VLT');
assert.equal(parsed.rooms, 4);
assert.equal(parsed.furnishingStatus, 'S');
assert.equal(parsed.priceToken, '1.5M');
assert.deepEqual(parsed.features, ['P']);
console.log('✅ 1. Sierra Coding & Decoding Engine verified');

// 2. Financial Metrics Engine
assert.equal(calcPricePerSqm(10_000_000, 200), 50_000);
assert.equal(calcGrossYield(600_000, 10_000_000), 6.0);
assert.equal(calcNetYield(600_000, 50_000, 10_000_000), 5.5);
assert.equal(calcCapitalAppreciation(10_000_000, 14_000_000), 40.0);
assert.equal(calcPaybackPeriod(10_000_000, 1_000_000), 10.0);
assert.equal(formatCompactEGP(15_000_000), 'EGP 15M');

const metrics = computeFullMetrics(
  {
    purchasePrice: 10_000_000,
    currentMarketValue: 12_000_000,
    monthlyRent: 80_000,
    annualServiceCharge: 60_000,
  },
  250,
  { standard: 'luxury', condition: 'good', localityScore: 4 }
);
assert.equal(metrics.pricePerSqm, 40_000);
assert.equal(metrics.annualNetIncome, 900_000);
console.log('✅ 2. Financial Metrics & Appraised Value Engine verified');

// 3. Legal Risk Engine
const legalAuditHigh = assessLegalRisk({
  id: 'unit-audit-1',
  price: 20_000_000,
  hasTitleDeed: false,
  annualServiceCharge: 1_200_000,
  finishingType: 'core-shell',
});
assert.equal(legalAuditHigh.riskLevel, 'high');
assert.equal(legalAuditHigh.isApprovedForProposal, false);

const legalAuditClean = assessLegalRisk({
  id: 'unit-audit-2',
  price: 15_000_000,
  hasTitleDeed: true,
  annualServiceCharge: 80_000,
  finishingType: 'fully-finished',
});
assert.equal(legalAuditClean.riskLevel, 'low');
assert.equal(legalAuditClean.isApprovedForProposal, true);
console.log('✅ 3. Legal Intelligence & Risk Audit Engine verified');

// 4. Viewing Orchestrator
const viewing = createViewingSchedule({
  leadId: 'lead-vip-1',
  unitId: 'unit-mvd-10',
  compound: 'Mivida',
  scheduledTime: new Date().toISOString(),
});
assert.equal(viewing.status, 'scheduled');
const viewingDone = completeViewingSession(viewing, 'interested_closing');
assert.equal(viewingDone.outcome, 'interested_closing');
assert.ok(viewingDone.nextStep.includes('Stage 9'));
console.log('✅ 4. Viewing Orchestrator verified');

// 5. Closing Simulator Engine
const simulation = runClosingSimulation(
  {
    id: 'investor-88',
    name: 'Karim',
    capitalBudget: 30_000_000,
    negotiationLeverage: 0.95,
  },
  {
    id: 'unit-vlt-1',
    price: 25_000_000,
    hasTitleDeed: true,
  }
);
assert.equal(simulation.settlement.negotiatedPrice, 23_750_000);
assert.equal(simulation.settlement.discountAmount, 1_250_000);
assert.equal(simulation.verdict, 'PROCEED');
assert.equal(simulation.isActionable, true);
console.log('✅ 5. Closing Simulator & Settlement Engine verified');

// 6. Neural Matching Engine
const matches = rankPropertiesForStakeholder(
  {
    id: 'lead-sherif',
    name: 'Sherif',
    capitalBudget: 18_000_000,
    preferredLocations: ['Mivida', 'Villette'],
    preferredPropertyTypes: ['Apartment'],
    negativeSignals: ['ground floor', 'dark'],
  },
  [
    {
      id: 'prop-1',
      title: 'Mivida Panoramic Penthouse',
      compound: 'Mivida',
      propertyType: 'Apartment',
      price: 16_000_000,
      bedrooms: 3,
      features: ['roof', 'garden view'],
    },
    {
      id: 'prop-2',
      title: 'Mivida Ground Floor Unit',
      compound: 'Mivida',
      propertyType: 'Apartment',
      price: 12_000_000,
      bedrooms: 2,
    },
  ]
);
assert.equal(matches.length, 1);
assert.equal(matches[0].propertyId, 'prop-1');
assert.ok(matches[0].overallScore > 70);
console.log('✅ 6. Neural Wealth Matching Engine verified');

// 7. Feedback Learning Engine
const feedback = processSelectionFeedback({
  leadId: 'lead-pass-1',
  unitId: 'prop-xyz',
  action: 'pass',
  reason: 'The unit is overpriced and too dark',
  timestamp: new Date().toISOString(),
});
assert.equal(feedback.objection.category, 'price_too_high');
assert.ok(feedback.newDislikesDiscovered.includes('dark units'));
console.log('✅ 7. Feedback Learning & Objection Analysis verified');

// 8. ECC Memory Vault Sanitizer
const secretsDetected = findPotentialSecrets('Check key: sk-ant-api03-abcdefghijklmnop1234567890');
assert.ok(secretsDetected.length > 0);

const safeMemory = validateMemorySafety('Closing Runbook', 'Follow 4-step escrow closing protocol.');
assert.equal(safeMemory.isValid, true);
console.log('✅ 8. ECC Memory Vault Sanitizer verified');

console.log('\n🎉 ALL 8 PORTED ENGINES & COMPONENTS FULLY VERIFIED!');

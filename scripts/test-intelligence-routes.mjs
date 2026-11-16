import assert from 'node:assert/strict';
import { POST as codePost, GET as codeGet } from '../apps/sierra-estates-realty/app/api/intelligence/code/route.ts';
import { POST as valuationPost } from '../apps/sierra-estates-realty/app/api/intelligence/valuation/route.ts';
import { POST as legalAuditPost } from '../apps/sierra-estates-realty/app/api/intelligence/legal-audit/route.ts';
import { POST as closingSimulatorPost } from '../apps/sierra-estates-realty/app/api/intelligence/closing-simulator/route.ts';
import { POST as matchingPost } from '../apps/sierra-estates-realty/app/api/intelligence/matching/route.ts';

console.log('🧪 Testing Next.js App Router Intelligence Routes...');

// 1. Test /api/intelligence/code
const codeReq = new Request('http://localhost/api/intelligence/code', {
  method: 'POST',
  body: JSON.stringify({
    compound: 'Mivida',
    rooms: 3,
    furnishingStatus: 'fully furnished',
    price: 75000,
    features: ['garden'],
  }),
});
const codeRes = await codePost(codeReq);
const codeJson = await codeRes.json();
assert.equal(codeJson.success, true);
assert.equal(codeJson.code, 'MVD-3F-75K+G');
console.log('✅ /api/intelligence/code POST passed (Generated:', codeJson.code, ')');

// 2. Test /api/intelligence/valuation
const valReq = new Request('http://localhost/api/intelligence/valuation', {
  method: 'POST',
  body: JSON.stringify({
    purchasePrice: 10_000_000,
    areaSqm: 200,
    monthlyRent: 80_000,
  }),
});
const valRes = await valuationPost(valReq);
const valJson = await valRes.json();
assert.equal(valJson.success, true);
assert.equal(valJson.data.pricePerSqm, 50_000);
assert.equal(typeof valJson.data.netYield, 'number');
console.log('✅ /api/intelligence/valuation POST passed (Net Yield:', valJson.data.netYield, '%)');

// 3. Test /api/intelligence/legal-audit
const legalReq = new Request('http://localhost/api/intelligence/legal-audit', {
  method: 'POST',
  body: JSON.stringify({
    price: 15_000_000,
    ownerType: 'owner',
    hasTitleDeed: true,
  }),
});
const legalRes = await legalAuditPost(legalReq);
const legalJson = await legalRes.json();
assert.equal(legalJson.success, true);
assert.equal(legalJson.data.isApprovedForProposal, true);
console.log('✅ /api/intelligence/legal-audit POST passed (Risk Score:', legalJson.data.riskScore, ')');

// 4. Test /api/intelligence/closing-simulator
const closingReq = new Request('http://localhost/api/intelligence/closing-simulator', {
  method: 'POST',
  body: JSON.stringify({
    price: 10_000_000,
  }),
});
const closingRes = await closingSimulatorPost(closingReq);
const closingJson = await closingRes.json();
assert.equal(closingJson.success, true);
assert.equal(closingJson.simulation.breakdown.negotiatedPrice, 9_500_000);
console.log('✅ /api/intelligence/closing-simulator POST passed (Total Capital:', closingJson.simulation.breakdown.totalCapitalRequired, ')');

// 5. Test /api/intelligence/matching
const matchReq = new Request('http://localhost/api/intelligence/matching', {
  method: 'POST',
  body: JSON.stringify({
    profile: {
      budgetMax: 20_000_000,
      preferredCompounds: ['Mivida'],
      negativeSignals: ['ground floor'],
    },
    properties: [
      { id: 'p1', title: 'Ground Villa', compound: 'Mivida', price: 15_000_000, areaSqm: 250, description: 'Ground floor with garden' },
      { id: 'p2', title: 'Penthouse Skyline', compound: 'Mivida', price: 18_000_000, areaSqm: 220, description: 'Top floor penthouse with terrace' },
    ],
  }),
});
const matchRes = await matchingPost(matchReq);
const matchJson = await matchRes.json();
assert.equal(matchJson.success, true);
assert.equal(matchJson.matches.length, 1); // p1 should be filtered out by negative signal 'ground floor'
assert.equal(matchJson.matches[0].property.id, 'p2');
console.log('✅ /api/intelligence/matching POST passed (Matched top unit:', matchJson.matches[0].property.title, ')');

console.log('\n🎉 ALL 5 NEXT.JS APP ROUTER INTELLIGENCE ROUTES FULLY VERIFIED!');

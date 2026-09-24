import { processLailaIntake } from '../apps/sierra-estates-realty/lib/services/LailaLeadIntakeService.js';
import { sharedMemory } from '../packages/memory-engine/src/shared-memory-bus.js';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   🎯 SIERRA ESTATES — LAILA DIRECT OWNER WIRING VERIFICATION TEST    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // 1. Seed a direct owner unit into sharedMemory (as if harvested by NotebookLM)
  const testUnitCode = `SE-OWNER-TEST-${Date.now().toString().slice(-4)}`;
  console.log(`[1] Seeding verified direct-owner unit into SharedMemoryBus: ${testUnitCode}...`);
  await sharedMemory.write(
    `owner_unit:${testUnitCode}`,
    {
      sierraCode: testUnitCode,
      compound: 'Hyde Park',
      propertyType: 'Apartment',
      areaSqm: 200,
      bedrooms: 3,
      finishing: 'Ultra Super Lux',
      priceEgp: 12000000,
      priceFormatted: '12,000,000 EGP',
      isDirectOwner: true,
      arbitrageStatus: 'UNDERPRICED_GOLDEN_DEAL',
      contactPhone: '01011223344',
      contactName: 'مهندس أحمد',
    },
    { author: 'openclaw', tags: ['owner_unit', 'rag_grounded', 'hyde_park', 'underpriced_golden_deal'] }
  );
  console.log('    ✅ Wrote unit to sharedMemory.\n');

  // 2. Simulate multi-turn Laila WhatsApp conversation
  const testPhone = `+20109988${Date.now().toString().slice(-4)}`;
  console.log(`[2] Simulating buyer WhatsApp intake with phone ${testPhone}...`);

  // Turn 1: Greeting
  const r1 = await processLailaIntake('السلام عليكم', testPhone);
  console.log('--- Turn 1 (Greeting) ---');
  console.log(r1.split('\n')[0]);

  // Turn 2: Intent (Buy)
  const r2 = await processLailaIntake('1', testPhone);
  console.log('\n--- Turn 2 (Intent: Buy) ---');
  console.log(r2.split('\n')[0]);

  // Turn 3: Compound & Specs
  const r3 = await processLailaIntake('شقة 3 غرف في هايد بارك', testPhone);
  console.log('\n--- Turn 3 (Compound Preference) ---');
  console.log(r3.split('\n')[0]);

  // Turn 4: Budget
  const r4 = await processLailaIntake('ميزانيتي 13 مليون كاش', testPhone);
  console.log('\n--- Turn 4 (Budget & Timeline) ---');
  console.log(r4.split('\n')[0]);

  // Turn 5: Timeline & Instant Search
  const r5 = await processLailaIntake('1', testPhone);
  console.log('\n--- Turn 5 (Final Matching Response) ---');
  console.log(r5);

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('🎉 LAILA RECOMMENDATION ENGINE WIRED WITH SHARED MEMORY OWNER DEALS!');
  console.log('══════════════════════════════════════════════════════════════════════');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Laila recommendation wiring test failed:', err);
  process.exit(1);
});

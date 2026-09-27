import { SierraListingPipelineAgent } from '../packages/agents/src/sierra-listing-pipeline-agent';

async function test() {
  console.log('--- TESTING SIERRA LISTING PIPELINE AGENT ---');
  const agent = new SierraListingPipelineAgent();

  const test1 = agent.calibratePrice(35000, 'Rent', 'Madinaty furnished 140m');
  console.log('✓ Test 1 (Rent 35k):', test1);

  const test2 = agent.calibratePrice(8500000, 'Rent', 'Eastown resale villa');
  console.log('✓ Test 2 (8.5M in Rent -> flipped to Resale):', test2);

  const test3 = agent.calibratePrice(900, 'Rent', '$900 USD per month');
  console.log('✓ Test 3 (USD 900 -> EGP 45k):', test3);

  const test4 = agent.calibratePrice(40000, 'Resale', 'Rehab ground floor rent');
  console.log('✓ Test 4 (40k in Resale -> flipped to Rent):', test4);

  const sampleDrop = await agent.processGroupDrop({
    rawMessage: 'متاحة مدينتي شقة مفروشة 140م دور تالت سوبر لوكس للايجار 35000 شهري 01012345678',
    sender: '+201012345678',
    groupName: 'Owners August 2026',
    groupId: '120363044918239011@g.us',
    mediaUrls: ['https://sierra-estates.net/uploads/sample-unit.jpg']
  });

  console.log('\n✓ Full Drop Ingestion Result:');
  console.log('  Unit Code:', sampleDrop.unit.code);
  console.log('  Compound:', sampleDrop.unit.compound);
  console.log('  Deal Type:', sampleDrop.unit.dealType);
  console.log('  Price Display:', sampleDrop.unit.priceDisplay);
  console.log('  Action:', sampleDrop.action);
  console.log('  PF Ready:', sampleDrop.unit.pfReady);
  console.log('  Photo URLs:', sampleDrop.unit.photoUrls);
}

test().catch(console.error);

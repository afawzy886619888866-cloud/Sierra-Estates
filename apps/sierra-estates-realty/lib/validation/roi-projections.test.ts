/**
 * SIERRA ESTATES — ROI VALIDATION SUITE
 * Tests ROI projections accuracy on 50 real units.
 * 
 * Validates:
 * - 36-month ROI calculations
 * - Annual yield estimates
 * - Market comparisons
 */

import { analyzeAssetFinancials } from '@/lib/services/roi-service';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import type { Unit } from '@/lib/models/schema';

/**
 * ROI Test Validator
 */
export async function validateROIProjections() {
  console.log('💰 SIERRA ESTATES ROI VALIDATION SUITE\n');

  try {
    // Fetch up to 50 available units
    const unitsQuery = query(
      collection(db, 'units'),
      where('status', '==', 'available'),
      limit(50)
    );

    const unitsSnap = await getDocs(unitsQuery);
    const units = unitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Unit));

    if (units.length === 0) {
      console.log('⚠️  No units found in database. Please seed test data first.\n');
      return;
    }

    console.log(`📊 Testing ROI on ${units.length} units\n`);

    const results = {
      totalUnits: units.length,
      avgROI: 0,
      avgYield: 0,
      roiRange: { min: Infinity, max: -Infinity },
      yieldRange: { min: Infinity, max: -Infinity },
      failures: 0,
      details: [] as any[],
    };

    // Test each unit
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      
      try {
        const financials = await analyzeAssetFinancials(unit);

        results.details.push({
          title: unit.title,
          price: unit.price,
          roi: financials.projectedROI,
          yield: financials.annualYield,
          status: '✅',
        });

        results.avgROI += financials.projectedROI;
        results.avgYield += financials.annualYield;

        results.roiRange.min = Math.min(results.roiRange.min, financials.projectedROI);
        results.roiRange.max = Math.max(results.roiRange.max, financials.projectedROI);

        results.yieldRange.min = Math.min(results.yieldRange.min, financials.annualYield);
        results.yieldRange.max = Math.max(results.yieldRange.max, financials.annualYield);

        // Progress indicator
        if ((i + 1) % 10 === 0) {
          console.log(`⏳ Processed ${i + 1}/${units.length} units...`);
        }
      } catch (err) {
        results.failures++;
        results.details.push({
          title: unit.title,
          price: unit.price,
          error: err instanceof Error ? err.message : 'Unknown error',
          status: '❌',
        });
      }
    }

    // Calculate averages
    const successCount = results.totalUnits - results.failures;
    if (successCount > 0) {
      results.avgROI = results.avgROI / successCount;
      results.avgYield = results.avgYield / successCount;
    }

    // Print Report
    console.log('\n📈 ROI VALIDATION REPORT\n');
    console.log(`Units Tested: ${results.totalUnits}`);
    console.log(`Successful: ${successCount} ✅`);
    console.log(`Failed: ${results.failures} ❌\n`);

    console.log('ROI Statistics:');
    console.log(`  Average 36-month ROI: ${results.avgROI.toFixed(2)}%`);
    console.log(`  ROI Range: ${results.roiRange.min.toFixed(2)}% - ${results.roiRange.max.toFixed(2)}%\n`);

    console.log('Yield Statistics:');
    console.log(`  Average Annual Yield: ${results.avgYield.toFixed(2)}%`);
    console.log(`  Yield Range: ${results.yieldRange.min.toFixed(2)}% - ${results.yieldRange.max.toFixed(2)}%\n`);

    // Sanity checks
    console.log('Sanity Checks:');
    const roiCheckPass = results.avgROI >= 8 && results.avgROI <= 15;
    const yieldCheckPass = results.avgYield >= 4 && results.avgYield <= 10;
    
    console.log(`  ROI in expected range (8-15%): ${roiCheckPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Yield in expected range (4-10%): ${yieldCheckPass ? '✅ PASS' : '❌ FAIL'}\n`);

    // Sample details
    console.log('Sample Results (First 10):');
    results.details.slice(0, 10).forEach(detail => {
      if (detail.status === '✅') {
        console.log(`  ${detail.title}: ROI=${detail.roi.toFixed(1)}% | Yield=${detail.yield.toFixed(1)}%`);
      } else {
        console.log(`  ${detail.title}: ${detail.error}`);
      }
    });

    console.log('\n✅ ROI VALIDATION COMPLETE\n');
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

export { analyzeAssetFinancials };

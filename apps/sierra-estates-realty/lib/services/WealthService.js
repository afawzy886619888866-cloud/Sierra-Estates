





import { InventoryService } from './InventoryService';
import { analyzeAssetFinancials } from './roi-service';


export const WealthService = {
  /**
   * Fetches the top curated assets and runs a neural ROI analysis on each.
   */
  async getCuratedPortfolio(count = 6, _market) {
    const rawAssets = await InventoryService.getFeaturedListings(count);
    
    const enriched = await Promise.all(
      rawAssets.map(async (asset) => {
        // Cast to Unit for ROI engine compatibility
        const unit = {
          id: asset.id,
          title: asset.title,
          price: asset.price,
          location: asset.location || '',
          propertyType: asset.propertyType ,
          area: asset.area,
          status: asset.status ,
          finishingType: (asset.finishingType ) || "not-finished",
          category: 'residential',
          ownerType: 'broker',
          bedrooms: asset.bedrooms || 0,
          bathrooms: 0,
          amenities: [],
          images: []
        };

        try {
          const financials = await analyzeAssetFinancials(unit);
          return {
            id: asset.id,
            title: asset.title,
            location: asset.location || '',
            price: asset.price,
            roi: financials.projectedROI,
            yield: financials.annualYield,
            tags: [],
            intelligenceScore: 85,
            reasoning: financials.valuationAnalysis,
          };
        } catch (e) {
          console.error(`Wealth Intelligence failed for asset ${asset.id}`, e);
          return {
            id: asset.id,
            title: asset.title,
            location: asset.location || '',
            price: asset.price,
            roi: 0,
            yield: 0,
            tags: [],
            intelligenceScore: 0,
            reasoning: "Intelligence analysis temporarily unavailable.",
          };
        }
      })
    );

    return enriched;
  }
};

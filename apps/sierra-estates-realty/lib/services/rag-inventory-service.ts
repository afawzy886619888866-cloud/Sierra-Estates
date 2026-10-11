import { listRecords } from "@sierra-estates/db";
import { Unit } from "../models/schema";
import { GoogleSheetBridge } from "./GoogleSheetBridge";

export class RagInventoryService {
  /**
   * Performs a deterministic RAG query against the database master inventory,
   * falling back or augmenting with live Google Sheet inventory via GoogleSheetBridge.
   */
  static async getMatchedInventoryContext(
    budgetMax?: number,
    compound?: string,
    propertyType?: string
  ): Promise<string> {
    try {
      // Fetch a bounded page and filter in memory
      let units = await listRecords<Unit>("listings", {
        where: [{ column: "status", value: "available" }],
        limit: 50,
      }).catch(() => [] as Unit[]);

      // 1. Filter by Property Type (if strict)
      if (propertyType && propertyType.toLowerCase() !== 'any') {
        units = units.filter((u: Unit) => u.propertyType.toLowerCase() === propertyType.toLowerCase());
      }

      // 2. Filter by Compound (if specified and not 'any')
      if (compound && compound.toLowerCase() !== 'any') {
        const compoundLower = compound.toLowerCase();
        units = units.filter((u: Unit) => 
          (u.compound && u.compound.toLowerCase().includes(compoundLower)) ||
          (u.title && u.title.toLowerCase().includes(compoundLower)) ||
          (u.location && u.location.toLowerCase().includes(compoundLower))
        );
      }

      // 3. Filter by Budget (allow 20% margin for up-selling)
      if (budgetMax && budgetMax > 0) {
        const acceptableMax = budgetMax * 1.2;
        units = units.filter((u: Unit) => u.price <= acceptableMax);
      }

      // If database has few or no matches, fetch directly from live Google Sheet (tab 341562911)
      if (units.length < 3) {
        try {
          const sheetUnits = await GoogleSheetBridge.searchUnits({
            compound: compound && compound.toLowerCase() !== 'any' ? compound : undefined,
            maxPrice: budgetMax && budgetMax > 0 ? budgetMax * 1.2 : undefined,
            limit: 5,
          });

          for (const su of sheetUnits) {
            units.push({
              id: su.code || `SHEET-${Date.now()}`,
              title: `${su.propertyType || 'Unit'} in ${su.compound}`,
              compound: su.compound,
              location: su.compound,
              propertyType: (su.propertyType || 'apartment').toLowerCase() as any,
              area: Number(su.space) || 0,
              price: su.price || 0,
              status: 'available',
              mediaUrls: su.mediaUrls || [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as any);
          }
        } catch {}
      }

      // Sort by price descending (highest value that fits the budget) and take top 5
      units.sort((a: Unit, b: Unit) => b.price - a.price);
      const topMatches = units.slice(0, 5);

      if (topMatches.length === 0) {
        return "LIVE INVENTORY STATUS: No exact matches found for these specific criteria in the master inventory right now. Suggest alternative compounds or a slightly higher budget.";
      }

      // Format as a crisp Markdown list for Gemini's context window
      const formatted = topMatches.map((u: Unit) => {
        const photos = (u as any).mediaUrls?.length ? ` | Photos: ${(u as any).mediaUrls.join(', ')}` : '';
        return `- [UNIT ID: ${u.id}] ${u.title} | ${u.compound || u.location} | Type: ${u.propertyType} | Area: ${u.area} sqm | Price: ${u.price.toLocaleString()} EGP${photos}`;
      }).join("\n");

      return `LIVE AVAILABLE MASTER INVENTORY FOR THIS CLIENT:\n${formatted}\n\nINSTRUCTION: Actively recommend one or two of these exact units to the client. Quote the Area and Price accurately, and mention that photos are available.`;
    } catch (error) {
      console.error("❌ [RagInventoryService] Failed to query master inventory:", error);
      return "LIVE INVENTORY STATUS: Database temporarily unreachable. Offer to schedule a callback with a human broker.";
    }
  }
  }
}

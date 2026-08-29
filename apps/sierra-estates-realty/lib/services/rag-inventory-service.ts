import { adminDb } from "../server/firebase-admin";
import { Unit } from "../models/schema";

export class RagInventoryService {
  /**
   * Performs a deterministic RAG query against the Firestore master inventory.
   * Finds units that are available and optionally match the client's budget and compound.
   */
  static async getMatchedInventoryContext(
    budgetMax?: number,
    compound?: string,
    propertyType?: string
  ): Promise<string> {
    try {
      const query = adminDb.collection("units").where("status", "==", "available");

      // We cannot easily do multiple inequality/OR queries in Firestore without a compound index.
      // We will fetch up to 20 available units and filter them in-memory to keep it robust and fast.
      const snapshot = await query.limit(50).get();

      let units = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Unit));

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

      // Sort by price descending (highest value that fits the budget) and take top 5
      units.sort((a: Unit, b: Unit) => b.price - a.price);
      const topMatches = units.slice(0, 5);

      if (topMatches.length === 0) {
        return "LIVE INVENTORY STATUS: No exact matches found for these specific criteria in the master inventory right now. Suggest alternative compounds or a slightly higher budget.";
      }

      // Format as a crisp Markdown list for Gemini's context window
      const formatted = topMatches.map((u: Unit) => 
        `- [UNIT ID: ${u.id}] ${u.title} | ${u.compound || u.location} | Type: ${u.propertyType} | Area: ${u.area} sqm | Price: ${u.price.toLocaleString()} EGP`
      ).join("\n");

      return `LIVE AVAILABLE MASTER INVENTORY FOR THIS CLIENT:\n${formatted}\n\nINSTRUCTION: Actively recommend one or two of these exact units to the client. Quote the Area and Price accurately.`;
    } catch (error) {
      console.error("❌ [RagInventoryService] Failed to query master inventory:", error);
      return "LIVE INVENTORY STATUS: Database temporarily unreachable. Offer to schedule a callback with a human broker.";
    }
  }
}

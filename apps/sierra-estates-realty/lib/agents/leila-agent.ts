import { logger } from '@/lib/logger';

export interface ClientNeeds {
  budget: number;
  location: string[];
  propertyType: string;
  roiTarget?: number;
}

export interface MatchedUnit {
  id: string;
  title: string;
  price: number;
  projectedRoi?: number;
  matchScore: number;
}

export class LeilaAgent {
  constructor() {
  }

  /**
   * Stage 1: Interact with client and calculate matching properties.
   */
  async qualifyAndMatch(clientNeeds: ClientNeeds, allProperties: any[]): Promise<{
    intent: string;
    matchedUnits: MatchedUnit[];
  }> {
    logger.info(`Leila is analyzing client needs for budget: ${clientNeeds.budget}`);

    // Simulation of AI reading the Knowledge Base for rules
    const rules: any[] = [];
    const hasRoiRule = rules.some((r: any) => r.tags?.includes('roi-calculation'));

    // Calculate match scores
    const matchedUnits = allProperties
      .filter(p => p.price <= clientNeeds.budget && clientNeeds.location.includes(p.location))
      .map(p => {
        let score = 80; // Base score
        if (p.propertyType === clientNeeds.propertyType) score += 10;
        
        const projectedRoi = p.roi;
        if (hasRoiRule && clientNeeds.roiTarget && p.roi >= clientNeeds.roiTarget) {
          score += 10;
        }

        return {
          id: p.id,
          title: p.title,
          price: p.price,
          projectedRoi,
          matchScore: score
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Top 5 matches

    return {
      intent: 'Ready for Agent Handoff',
      matchedUnits
    };
  }

  /**
   * Stage 2: Hand off the client and the top 5 units to the human agent dashboard.
   */
  async handoffToAgent(clientId: string, matchedUnits: MatchedUnit[]) {
    // In a real DB, this would write to a `leads` collection
    logger.info(`[Leila Stage 2] Pushed Lead ${clientId} to Admin Dashboard with ${matchedUnits.length} matched units.`);
    
    return {
      success: true,
      handoffTimestamp: new Date(),
      leadStatus: 'Requires Agent Approval'
    };
  }
}

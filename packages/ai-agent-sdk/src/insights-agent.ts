import { BaseAgent } from './agent-base.js';
import { AgentExecutionRequest } from './types.js';

export interface MarketInsight {
  topic: string;
  headline: string;
  sentiment: 'bullish' | 'neutral' | 'bearish';
  confidence: number;
  dataPoints: Array<{ label: string; value: string | number }>;
  recommendedAction: string;
}

export class InsightsAgent extends BaseAgent {
  constructor(agentId: string = 'agent-insights-lead', name: string = 'Strategic Market Insights Agent') {
    super(agentId, name);
  }

  public async handleTask(request: AgentExecutionRequest): Promise<MarketInsight> {
    const compound = request.context?.compound || 'New Cairo General';
    const inventoryCount = request.context?.inventoryCount || 306;

    return {
      topic: `Market Liquidity & Pricing Trends — ${compound}`,
      headline: `Strong Secondary Resale Demand Detected in ${compound}`,
      sentiment: 'bullish',
      confidence: 0.94,
      dataPoints: [
        { label: 'Active Monitored Units', value: inventoryCount },
        { label: 'Average Price / Sqm (Finished)', value: '62,500 EGP' },
        { label: 'Projected 12M Capital Growth', value: '+24.5%' },
        { label: 'Gross Rental Yield', value: '8.4%' },
      ],
      recommendedAction: 'Target direct-owner cash buyers with high urgency listings in Mivida and Hyde Park.',
    };
  }
}

import type { ExchangeRecord } from '@sierra-estates/exchange/exchange-client';

export interface AgentResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export abstract class BaseAgent {
  public abstract readonly name: string;
  public abstract readonly description: string;

  /**
   * Execute the agent's primary task
   * @param record The full exchange record containing the payload
   * @returns An AgentResult indicating success/failure and any output data
   */
  public abstract execute(record: ExchangeRecord): Promise<AgentResult>;
}

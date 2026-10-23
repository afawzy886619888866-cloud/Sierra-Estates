/**
 * CRM domain types — investment-stakeholder pipeline (Kanban).
 * Phase keys must stay in sync with `phaseConfig` in components/CRM/CRMKanbanColumn.tsx.
 */

export type PipelinePhase =
  | 'PROSPECT'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED';

export type StrategicIntensity = 'hot' | 'warm' | 'cold';

export interface InvestmentStakeholder {
  id: string;
  name: string;
  phone: string;
  strategicIntensity: StrategicIntensity;
  phase: PipelinePhase;
  /** Deal size in USD; rendered as $X.XM on cards. */
  dealValue?: number;
  email?: string;
  notes?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
}

 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
 * sierra estatesE STRATEGIC PIPELINE MCP SERVER (PRODUCTION READY)
 * Handles Strategic Pipeline state management & orchestration logic.
 */

import { getRecord, insertRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS } from '../lib/models/schema';
import { logger } from '@/lib/logger';

export const mcp_sierra_deals = {
  name: 'sierra-strategic-pipeline',
  tools: [
    {
      name: 'create_pipeline_entry',
      async handler(args) {
        logger.info(`[StrategicPipelineMCP] Creating pipeline record for stakeholder: ${args.stakeholderId}`);
        const deal = await insertRecord(COLLECTIONS.strategicPipeline, {
          stakeholderId: args.stakeholderId,
          portfolioAssetCode: args.portfolioAssetCode,
          status: 'draft',
          stage: 'inbound',
          terms: args.terms,
        });
        return { success: true, pipelineId: deal.id };
      }
    },
    {
      name: 'update_pipeline_status',
      async handler(args) {
        logger.info(`[StrategicPipelineMCP] Transitioning Pipeline Entry ${args.pipelineId} to ${args.status}`);
        const updateData = { status: args.status };
        if (args.stage) updateData.stage = args.stage;

        await updateRecord(COLLECTIONS.strategicPipeline, args.pipelineId, updateData);
        return { success: true };
      }
    },
    {
      name: 'get_pipeline_summary',
      async handler(args) {
        const entry = await getRecord(COLLECTIONS.strategicPipeline, args.pipelineId);
        return _nullishCoalesce(entry, () => ( { error: 'Strategic Pipeline Entry not found' }));
      }
    }
  ]
};

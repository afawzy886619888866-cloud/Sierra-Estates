/**
 * sierra estatesE STRATEGIC PIPELINE MCP SERVER (PRODUCTION READY)
 * Handles Strategic Pipeline state management & orchestration logic.
 */

import { adminDb } from '../lib/server/firebase-admin';
import { COLLECTIONS } from '../lib/models/schema';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

export const mcp_sierra_deals = {
  name: 'sierra-strategic-pipeline',
  tools: [
    {
      name: 'create_pipeline_entry',
      async handler(args: { stakeholderId: string; portfolioAssetCode: string; terms: any }) {
        logger.info(`[StrategicPipelineMCP] Creating pipeline record for stakeholder: ${args.stakeholderId}`);
        const dealRef = await adminDb.collection(COLLECTIONS.strategicPipeline).add({
          stakeholderId: args.stakeholderId,
          portfolioAssetCode: args.portfolioAssetCode,
          status: 'draft',
          stage: 'inbound',
          terms: args.terms,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        return { success: true, pipelineId: dealRef.id };
      }
    },
    {
      name: 'update_pipeline_status',
      async handler(args: { pipelineId: string; status: string; stage?: string }) {
        logger.info(`[StrategicPipelineMCP] Transitioning Pipeline Entry ${args.pipelineId} to ${args.status}`);
        const updateData: any = {
          status: args.status,
          updatedAt: Timestamp.now()
        };
        if (args.stage) updateData.stage = args.stage;
        
        await adminDb.collection(COLLECTIONS.strategicPipeline).doc(args.pipelineId).update(updateData);
        return { success: true };
      }
    },
    {
      name: 'get_pipeline_summary',
      async handler(args: { pipelineId: string }) {
        const snap = await adminDb.collection(COLLECTIONS.strategicPipeline).doc(args.pipelineId).get();
        return snap.exists ? snap.data() : { error: 'Strategic Pipeline Entry not found' };
      }
    }
  ]
};

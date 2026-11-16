import 'server-only';
import { getRecord, insertRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';
import { runScribe } from '../agents/scribe';
import { runCurator } from '../agents/curator';
import { runMatchmaker } from '../agents/matchmaker';
import { runCloser } from '../agents/closer';
import { logger } from '@/lib/logger';

/** Inline Telegram alert — avoids loading the client-SDK telegram-controller in server context */
async function notifyTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch { /* non-critical */ }
}

/** The pipeline bookkeeping shared by every orchestrated table. */
interface StatefulRow {
  orchestrationState?: {
    stage?: OrchestrationStage;
    status?: string;
    [key: string]: unknown;
  } | null;
}

export type OrchestrationStage =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5'
  | 'S6' | 'S7' | 'S8' | 'S9' | 'S10';

export class OrchestratorService {
  /**
   * Runs the orchestration pipeline for a document.
   * Can be started from any stage.
   */
  static async runPipeline(docId: string, collection: keyof typeof COLLECTIONS, forceStage?: OrchestrationStage) {
    const table = COLLECTIONS[collection];
    const readRow = () => getRecord<StatefulRow>(table, docId);

    return instrumentAgent('orchestrator', 'pipeline', docId, async () => {
      // 0. Fetch initial state
      const row = await readRow();
      if (!row) throw new Error(`Document ${docId} not found in ${collection}`);

      let currentStage = forceStage || (row.orchestrationState?.stage || 'S1') as OrchestrationStage;
      logger.info(`🚀 Starting Sierra Estates Orchestration for ${docId} at stage ${currentStage}`);

      // --- STAGE EXECUTION LOOP WITH RETRY ---
      // Declared outside the try so the DLQ record below can report how many
      // attempts were burnt before the pipeline gave up.
      let attempts = 0;
      const maxAttempts = 3;

      try {

        while (attempts < maxAttempts) {
          try {
            // S1 & S2: SCRIBE (The Architect of Truth)
            if (currentStage === 'S1' || currentStage === 'S2') {
              await this.updateState(docId, collection, currentStage, 'processing');
              await runScribe(docId, collection, currentStage);

              const d = await readRow();
              currentStage = d?.orchestrationState?.stage || 'S3';
            }

            // S3, S4, S5: CURATOR (The Architect of Desire)
            if (['S3', 'S4', 'S5'].includes(currentStage)) {
              await this.updateState(docId, collection, currentStage, 'processing');
              await runCurator(docId, collection, currentStage);

              const d = await readRow();
              currentStage = d?.orchestrationState?.stage || 'S6';
            }

            // S6, S7, S8: MATCHMAKER (The Architect of Wealth)
            if (['S6', 'S7', 'S8'].includes(currentStage)) {
              // Check for Human Review Pause at S7.5
              const d = await readRow();
              if (currentStage === 'S8' && d?.orchestrationState?.status === 'waiting_agent_review') {
                logger.info(`🛑 Orchestration paused for ${docId}: Human Review Required.`);
                return;
              }

              await this.updateState(docId, collection, currentStage, 'processing');
              await runMatchmaker(docId, collection, currentStage);

              const d2 = await readRow();
              currentStage = d2?.orchestrationState?.stage || 'S9';
            }

            // S9, S10: CLOSER (The Architect of Success)
            if (['S9', 'S10'].includes(currentStage)) {
              await this.updateState(docId, collection, currentStage, 'processing');
              await runCloser(docId, collection, currentStage);

              const d = await readRow();
              currentStage = d?.orchestrationState?.stage || 'S10';
            }

            if (currentStage === 'S10') {
              await this.updateState(docId, collection, 'S10', 'completed');
            }

            break; // Exit loop if successful
          } catch (innerError: any) {
            attempts++;
            logger.warn(`[ORCHESTRATOR] Attempt ${attempts} failed for ${docId}: ${innerError.message}`);
            if (attempts >= maxAttempts) throw innerError;
            // Exponential backoff with jitter to avoid a synchronized retry
            // thundering-herd when a shared dependency (Gemini/Supabase) blips.
            const backoff = 2000 * attempts + Math.floor(Math.random() * 1000);
            await new Promise(resolve => setTimeout(resolve, backoff));
          }
        }

        logger.info(`✅ Orchestration complete for ${docId}`);

      } catch (error: any) {
        logger.error(`❌ Orchestration failed for ${docId}:`, error);
        await this.updateState(docId, collection, currentStage, 'failed', error.message);

        // DLQ: write to failed_orchestrations for manual intervention
        try {
          // The DLQ table stores the identifying fields in `payload`, so the
          // same table can hold failures from pipelines with different shapes.
          await insertRecord('failed_orchestrations', {
            pipeline: 'orchestrator',
            attempts,
            lastError: error.message || String(error),
            payload: { docId, collection, stage: currentStage },
          });
        } catch (dlqErr) {
          // DLQ itself is broken — don't let the failure vanish; escalate loudly.
          logger.error('[ORCHESTRATOR] DLQ write failed:', dlqErr);
          notifyTelegram(
            `🆘 <b>DLQ write FAILED</b> for <code>${docId}</code> (${collection}) — ` +
            `original error: <code>${error.message}</code>`,
          ).catch((tgErr) => logger.error('[ORCHESTRATOR] Telegram DLQ alert failed:', tgErr));
        }

        // Alert admin via Telegram
        const alertMsg =
          `🚨 <b>Orchestration Failure</b>\n` +
          `Doc: <code>${docId}</code>\n` +
          `Collection: <code>${collection}</code>\n` +
          `Stage: <b>${currentStage}</b>\n` +
          `Error: <code>${error.message}</code>`;
        notifyTelegram(alertMsg).catch((tgErr) => logger.error('[ORCHESTRATOR] Telegram alert failed:', tgErr));

        throw error;
      }
    });
  }

  /**
   * Resumes a paused pipeline (e.g. after S7.5 human review)
   */
  static async resumePipeline(docId: string, collection: keyof typeof COLLECTIONS) {
    const row = await getRecord<StatefulRow>(COLLECTIONS[collection], docId);
    if (!row) throw new Error("Document not found");

    const state = row.orchestrationState;
    if (state?.status !== 'waiting_agent_review') {
      throw new Error(`Pipeline is not in a resumeable state: ${state?.status}`);
    }

    // Set to processing and continue from current stage
    await this.updateState(docId, collection, state.stage as OrchestrationStage, 'processing');
    return this.runPipeline(docId, collection);
  }

  private static async updateState(
    docId: string,
    collection: keyof typeof COLLECTIONS,
    stage: OrchestrationStage,
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'waiting_agent_review',
    errorMessage?: string
  ) {
    const table = COLLECTIONS[collection];

    logger.info(`[ORCHESTRATOR] Updating ${docId} to ${stage} [${status}]`);

    // Firestore's set({ merge: true }) deep-merged into the nested map, so keys
    // this call doesn't name survived. PostgREST replaces a JSONB column
    // wholesale, so read the current object and merge here to keep that.
    const current = await getRecord<StatefulRow>(table, docId);
    await updateRecord(table, docId, {
      orchestrationState: {
        ...(current?.orchestrationState ?? {}),
        stage,
        status,
        lastTriggeredAt: new Date().toISOString(),
        engineVersion: '12.0.0-quiet-luxury',
        error: errorMessage || null,
      },
    });

    // History is an unbounded append log → its own table, not a JSONB array on
    // the parent row, so it can grow without bloating every read of that row.
    await insertRecord('orchestration_history', {
      parentTable: table,
      parentId: docId,
      stage,
      status,
      engineVersion: '12.0.0-quiet-luxury',
      details: { error: errorMessage ?? null },
    });
  }
}

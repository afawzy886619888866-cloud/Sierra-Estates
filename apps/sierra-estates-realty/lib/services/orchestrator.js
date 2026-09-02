 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only'; // gRPC dependency — server only
import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';
import { runScribe } from '../agents/scribe';
import { runCurator } from '../agents/curator';
import { runMatchmaker } from '../agents/matchmaker';
import { runCloser } from '../agents/closer';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

/** Inline Telegram alert — avoids loading the client-SDK telegram-controller in server context */
async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (e) { /* non-critical */ }
}

 



export class OrchestratorService {
  /**
   * Runs the orchestration pipeline for a document.
   * Can be started from any stage.
   */
  static async runPipeline(docId, collection, forceStage) {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);

    return instrumentAgent('orchestrator', 'pipeline', docId, async () => {
      // 0. Fetch initial state
      const doc = await docRef.get();
      if (!doc.exists) throw new Error(`Document ${docId} not found in ${collection}`);

      let currentStage = forceStage || (_optionalChain([doc, 'access', _ => _.data, 'call', _2 => _2(), 'optionalAccess', _3 => _3.orchestrationState, 'optionalAccess', _4 => _4.stage]) || 'S1') ;
      logger.info(`🚀 Starting Sierra Estates Orchestration for ${docId} at stage ${currentStage}`);

      try {
        // --- STAGE EXECUTION LOOP WITH RETRY ---
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            // S1 & S2: SCRIBE (The Architect of Truth)
            if (currentStage === 'S1' || currentStage === 'S2') {
              await this.updateState(docId, collection, currentStage, 'processing');
              await runScribe(docId, collection, currentStage);

              const d = await docRef.get();
              currentStage = _optionalChain([d, 'access', _5 => _5.data, 'call', _6 => _6(), 'optionalAccess', _7 => _7.orchestrationState, 'optionalAccess', _8 => _8.stage]) || 'S3';
            }

            // S3, S4, S5: CURATOR (The Architect of Desire)
            if (['S3', 'S4', 'S5'].includes(currentStage)) {
              await this.updateState(docId, collection, currentStage, 'processing');
              await runCurator(docId, collection, currentStage);

              const d = await docRef.get();
              currentStage = _optionalChain([d, 'access', _9 => _9.data, 'call', _10 => _10(), 'optionalAccess', _11 => _11.orchestrationState, 'optionalAccess', _12 => _12.stage]) || 'S6';
            }

            // S6, S7, S8: MATCHMAKER (The Architect of Wealth)
            if (['S6', 'S7', 'S8'].includes(currentStage)) {
              // Check for Human Review Pause at S7.5
              const d = await docRef.get();
              if (currentStage === 'S8' && _optionalChain([d, 'access', _13 => _13.data, 'call', _14 => _14(), 'optionalAccess', _15 => _15.orchestrationState, 'optionalAccess', _16 => _16.status]) === 'waiting_agent_review') {
                logger.info(`🛑 Orchestration paused for ${docId}: Human Review Required.`);
                return;
              }

              await this.updateState(docId, collection, currentStage, 'processing');
              await runMatchmaker(docId, collection, currentStage);

              const d2 = await docRef.get();
              currentStage = _optionalChain([d2, 'access', _17 => _17.data, 'call', _18 => _18(), 'optionalAccess', _19 => _19.orchestrationState, 'optionalAccess', _20 => _20.stage]) || 'S9';
            }

            // S9, S10: CLOSER (The Architect of Success)
            if (['S9', 'S10'].includes(currentStage)) {
              await this.updateState(docId, collection, currentStage, 'processing');
              await runCloser(docId, collection, currentStage);

              const d = await docRef.get();
              currentStage = _optionalChain([d, 'access', _21 => _21.data, 'call', _22 => _22(), 'optionalAccess', _23 => _23.orchestrationState, 'optionalAccess', _24 => _24.stage]) || 'S10';
            }

            if (currentStage === 'S10') {
              await this.updateState(docId, collection, 'S10', 'completed');
            }

            break; // Exit loop if successful
          } catch (innerError) {
            attempts++;
            logger.warn(`[ORCHESTRATOR] Attempt ${attempts} failed for ${docId}: ${innerError.message}`);
            if (attempts >= maxAttempts) throw innerError;
            // Exponential backoff with jitter to avoid a synchronized retry
            // thundering-herd when a shared dependency (Gemini/Firestore) blips.
            const backoff = 2000 * attempts + Math.floor(Math.random() * 1000);
            await new Promise(resolve => setTimeout(resolve, backoff));
          }
        }

        logger.info(`✅ Orchestration complete for ${docId}`);

      } catch (error) {
        logger.error(`❌ Orchestration failed for ${docId}:`, error);
        await this.updateState(docId, collection, currentStage, 'failed', error.message);

        // DLQ: write to failed_orchestrations for manual intervention
        try {
          await adminDb.collection('failed_orchestrations').add({
            docId,
            collection,
            stage: currentStage,
            error: error.message || String(error),
            timestamp: Timestamp.now(),
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
  static async resumePipeline(docId, collection) {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error("Document not found");

    const state = _optionalChain([doc, 'access', _25 => _25.data, 'call', _26 => _26(), 'optionalAccess', _27 => _27.orchestrationState]);
    if (_optionalChain([state, 'optionalAccess', _28 => _28.status]) !== 'waiting_agent_review') {
      throw new Error(`Pipeline is not in a resumeable state: ${_optionalChain([state, 'optionalAccess', _29 => _29.status])}`);
    }

    // Set to processing and continue from current stage
    await this.updateState(docId, collection, state.stage, 'processing');
    return this.runPipeline(docId, collection);
  }

   static async updateState(
    docId,
    collection,
    stage,
    status,
    errorMessage
  ) {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);

    const historyEntry = {
      stage,
      status,
      timestamp: Timestamp.now(),
      engineVersion: '12.0.0-quiet-luxury',
      error: errorMessage || null
    };

    logger.info(`[ORCHESTRATOR] Updating ${docId} to ${stage} [${status}]`);

    await docRef.set({
      orchestrationState: {
        stage,
        status,
        lastTriggeredAt: Timestamp.now(),
        engineVersion: '12.0.0-quiet-luxury',
        error: errorMessage || null
      },
    }, { merge: true });

    // History is an unbounded append log → subcollection, not a parent-doc array
    // (an arrayUnion would eventually exceed the 1 MB document-size limit).
    await docRef.collection('orchestrationHistory').add(historyEntry);
  }
}

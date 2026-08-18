import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

function getDb() {
  if (!getApps().length) {
    initializeApp();
  }
  return getFirestore();
}

// ── Health check (HTTP) ────────────────────────────────────
// `_req` is intentionally unused — Firebase's onRequest signature requires
// (req, res), but the health-check endpoint doesn't read the request.
export const api = onRequest((_req, res) => {
  res.json({ message: 'Sierra Estates API - Health check OK' });
});

// ── Scheduled health ping ──────────────────────────────────
export const healthCheck = onSchedule('0 * * * *', async () => {
  console.log('Health check running...');
});

// ── Batch processor (Pub/Sub) ──────────────────────────────
export const processBatch = onMessagePublished('batch-jobs', async (event) => {
  console.log('Processing batch job:', event.data.message.data);
});

// ── Data Collection Workflow ───────────────────────────────
export const collectData = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  try {
    const payload = req.body as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') {
      res.status(400).send('Invalid payload');
      return;
    }
    const docRef = await getDb().collection('rawScrapeData').add({
      ...payload,
      collectedAt: FieldValue.serverTimestamp(),
      status: 'raw_unprocessed',
    });
    console.log(`Raw data ingested: ${docRef.id}`);
    res.status(200).json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Data collection error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── Data Processing Workflow ───────────────────────────────
export const processDataForApp = onDocumentCreated('rawScrapeData/{docId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const rawData = snap.data();
  const docId = event.params.docId;
  console.log(`Processing raw document ${docId}...`);

  try {
    const processedData = {
      title: (rawData['title'] as string) || 'Untitled Property',
      price: parseFloat(rawData['price'] as string) || 0,
      location: (rawData['location'] as string) || 'Unknown',
      source: (rawData['source'] as string) || 'Scraper Bot',
      processedAt: FieldValue.serverTimestamp(),
      isAvailable: true,
    };
    await getDb().collection('processedData').doc(docId).set(processedData);
    await snap.ref.update({ status: 'processed_success' });
    console.log(`Document ${docId} processed and saved.`);
  } catch (error) {
    console.error(`Error processing document ${docId}:`, error);
    await snap.ref.update({ status: 'processed_error', error: String(error) });
  }
});


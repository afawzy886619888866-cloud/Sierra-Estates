"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScrapedData = exports.collectData = exports.processBatch = exports.healthCheck = exports.api = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const pubsub_1 = require("firebase-functions/v2/pubsub");
const firestore_2 = require("firebase-functions/v2/firestore");
(0, v2_1.setGlobalOptions)({ region: 'us-central1', maxInstances: 10 });
function getDb() {
    if (!(0, app_1.getApps)().length) {
        (0, app_1.initializeApp)();
    }
    return (0, firestore_1.getFirestore)();
}
// ── Health check (HTTP) ────────────────────────────────────
// `_req` is intentionally unused — Firebase's onRequest signature requires
// (req, res), but the health-check endpoint doesn't read the request.
exports.api = (0, https_1.onRequest)((_req, res) => {
    res.json({ message: 'Sierra Estates API - Health check OK' });
});
// ── Scheduled health ping ──────────────────────────────────
exports.healthCheck = (0, scheduler_1.onSchedule)('0 * * * *', async () => {
    console.log('Health check running...');
});
// ── Batch processor (Pub/Sub) ──────────────────────────────
exports.processBatch = (0, pubsub_1.onMessagePublished)('batch-jobs', async (event) => {
    console.log('Processing batch job:', event.data.message.data);
});
// ── Data Collection Workflow ───────────────────────────────
exports.collectData = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const payload = req.body;
        if (!payload || typeof payload !== 'object') {
            res.status(400).send('Invalid payload');
            return;
        }
        const docRef = await getDb().collection('rawScrapeData').add({
            ...payload,
            collectedAt: firestore_1.FieldValue.serverTimestamp(),
            status: 'raw_unprocessed',
        });
        console.log(`Raw data ingested: ${docRef.id}`);
        res.status(200).json({ success: true, id: docRef.id });
    }
    catch (error) {
        console.error('Data collection error:', error);
        res.status(500).json({ success: false, error: String(error) });
    }
});
// ── Data Processing Workflow ───────────────────────────────
exports.processScrapedData = (0, firestore_2.onDocumentCreated)('rawScrapeData/{docId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const rawData = snap.data();
    const docId = event.params.docId;
    console.log(`Processing raw document ${docId}...`);
    try {
        const processedData = {
            title: rawData['title'] || 'Untitled Property',
            price: parseFloat(rawData['price']) || 0,
            location: rawData['location'] || 'Unknown',
            source: rawData['source'] || 'Scraper Bot',
            processedAt: firestore_1.FieldValue.serverTimestamp(),
            isAvailable: true,
        };
        await getDb().collection('processedData').doc(docId).set(processedData);
        await snap.ref.update({ status: 'processed_success' });
        console.log(`Document ${docId} processed and saved.`);
    }
    catch (error) {
        console.error(`Error processing document ${docId}:`, error);
        await snap.ref.update({ status: 'processed_error', error: String(error) });
    }
});
//# sourceMappingURL=index.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDataForApp = exports.collectData = exports.processBatch = exports.healthCheck = exports.api = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const pubsub_1 = require("firebase-functions/v2/pubsub");
const firestore_1 = require("firebase-functions/v2/firestore");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
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
        const docRef = await db.collection('rawScrapeData').add({
            ...payload,
            collectedAt: admin.firestore.FieldValue.serverTimestamp(),
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
exports.processDataForApp = (0, firestore_1.onDocumentCreated)('rawScrapeData/{docId}', async (event) => {
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
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            isAvailable: true,
        };
        await db.collection('processedData').doc(docId).set(processedData);
        await snap.ref.update({ status: 'processed_success' });
        console.log(`Document ${docId} processed and saved.`);
    }
    catch (error) {
        console.error(`Error processing document ${docId}:`, error);
        await snap.ref.update({ status: 'processed_error', error: String(error) });
    }
});
//# sourceMappingURL=index.js.map
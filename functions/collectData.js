const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * 1️⃣ DATA COLLECTION WORKFLOW (Isolated)
 * HTTP endpoint used exclusively by scrapers.
 * The data is dumped into `rawScrapeData` collection.
 * The frontend (Sierra/Liela) has NO access to this collection.
 */
exports.collectData = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const payload = req.body;
        
        // Basic validation
        if (!payload || typeof payload !== 'object') {
            return res.status(400).send('Invalid payload');
        }

        // Store raw data with a timestamp and a "processed" flag
        const docRef = await db.collection('rawScrapeData').add({
            ...payload,
            collectedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'raw_unprocessed'
        });

        console.log(`Raw data ingested from scraper: ${docRef.id}`);
        return res.status(200).json({ success: true, id: docRef.id });

    } catch (error) {
        console.error('Data collection error:', error);
        return res.status(500).send('Internal Server Error');
    }
});

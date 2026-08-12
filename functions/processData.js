const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { normalizeProperty } = require('./transform');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * 2️⃣ DATA PROCESSING WORKFLOW (Sierra/Liela integration)
 * Listens for new documents in the `rawScrapeData` collection.
 * Cleans/formats the data and moves it to `processedData` (which the app CAN read).
 */
exports.processDataForApp = functions.firestore
    .document('rawScrapeData/{docId}')
    .onCreate(async (snap, context) => {
        const rawData = snap.data();
        const docId = context.params.docId;

        console.log(`Processing raw document ${docId}...`);

        try {
            // --- CLEANING & NORMALIZATION LOGIC ---
            // Standardize names, coerce values, and map to the Liela/Sierra
            // shape. The pure rules live in ./transform so they can be tested.
            const processedData = {
                ...normalizeProperty(rawData),
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                // Add specific fields required by your frontend
            };

            // Write to the collection that the frontend app actually uses
            await db.collection('processedData').doc(docId).set(processedData);

            // Update the raw document to mark it as processed
            await snap.ref.update({ status: 'processed_success' });

            console.log(`Successfully processed and moved ${docId} to processedData.`);

        } catch (error) {
            console.error(`Error processing document ${docId}:`, error);
            // Mark as failed in the raw collection so we know it didn't reach the app
            await snap.ref.update({ status: 'processed_error', error: error.message });
        }
    });

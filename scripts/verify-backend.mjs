import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

console.log("--- SIERRA BLU BACKEND VERIFICATION ---");

// Simple .env.local loader
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
    console.log("✅ Loaded .env.local");
  } else {
    console.log("⚠️ .env.local not found, using existing environment variables");
  }
}

loadEnv();

async function verifyGoogleAI() {
  console.log("\n--- Testing Google AI (Gemini) ---");
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error("❌ GOOGLE_AI_API_KEY is missing in .env.local");
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Using 'gemini-pro' for maximum compatibility in verification
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent("Say 'Sierra Blu Backend Operational'");
    const response = await result.response;
    console.log(`✅ Google AI Response: ${response.text().trim()}`);
  } catch (error) {
    console.error("❌ Google AI Error:", error.message);
    if (error.message.includes("not found")) {
      console.log("💡 Tip: Try changing the model ID in verify-backend.mjs to 'gemini-pro' or 'gemini-1.5-pro'");
    }
  }
}

async function verifyFirebase() {
  console.log("\n--- Testing Firebase Admin SDK ---");
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sierra-blu";
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  try {
    if (!admin.apps.length) {
      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccount)),
          projectId: projectId,
        });
        console.log("📡 Initialized with FIREBASE_SERVICE_ACCOUNT_JSON");
      } else {
        console.log("⚠️ No FIREBASE_SERVICE_ACCOUNT_JSON found. Attempting applicationDefault()...");
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: projectId,
        });
      }
    }
    
    const db = admin.firestore();
    // Use a simpler check that doesn't necessarily require top-level list permissions if restricted
    const snap = await db.collection('listings').limit(1).get();
    console.log(`✅ Firebase Firestore: Connected to project '${projectId}'`);
    console.log(`📡 'listings' collection accessible: ${!snap.empty ? 'Yes (contains data)' : 'Yes (empty)'}`);
  } catch (error) {
    console.error("❌ Firebase Error:", error.message);
    if (error.message.includes("Could not load the default credentials") || error.message.includes("Service account")) {
      console.log("\n--- 🔧 HOW TO FIX FIREBASE ISSUE ---");
      console.log("1. Go to Firebase Console -> Project Settings -> Service Accounts");
      console.log("2. Click 'Generate new private key'");
      console.log("3. Open the downloaded .json file");
      console.log("4. Copy the ENTIRE content of that file");
      console.log("5. Open .env.local and add:");
      console.log('   FIREBASE_SERVICE_ACCOUNT_JSON=\'{"type": "service_account", ...}\'');
      console.log("   (Make sure it's all on one line or wrapped in single quotes)");
      console.log("----------------------------------\n");
    }
  }
}

async function run() {
  await verifyGoogleAI();
  await verifyFirebase();
  process.exit(0);
}

run();

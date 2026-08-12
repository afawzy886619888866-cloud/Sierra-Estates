/**
 * Sierra Estates — Bulk Bot Agent Activator
 * --------------------------------------------------
 * Run this LOCALLY on your Windows machine (where the H:\Sierra-Estates-Final repo lives).
 *
 * Prereqs:
 *   1. Node.js 18+ installed
 *   2. In the script folder, run:  npm init -y && npm install firebase-admin
 *   3. Download a service account JSON from Firebase Console:
 *        - Go to https://console.firebase.google.com -> your project
 *        - Project settings (gear icon) -> Service accounts tab
 *        - Click "Generate new private key" -> save as service-account.json
 *        - PUT service-account.json IN THE SAME FOLDER AS THIS SCRIPT
 *   4. Edit CONFIG below to match your schema (collection name, field name, etc.)
 *
 * Usage:
 *   Dry run (just lists what would change — NO WRITES):
 *     node activate-agents.js
 *
 *   Actually activate:
 *     node activate-agents.js --apply
 *
 *   Activate a specific project (override default):
 *     node activate-agents.js --project sierra-estates --apply
 *
 * SECURITY: Never commit service-account.json to git. Never paste its contents into chat.
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// ============================================================================
// CONFIG — EDIT THESE TO MATCH YOUR SCHEMA
// ============================================================================
const CONFIG = {
  // Firebase project ID (NOT the display name).
  //   Display name: sierra-estates
  //   Project ID:   sierra-blu   ← this is what we use here
  // Override with --project flag if needed.
  projectId: "sierra-blu",

  // The Firestore collection (or subcollection) where bot agents are stored.
  // The script will try these in order and use the first one that has docs.
  candidateCollections: [
    "agents",
    "bots",
    "bot_agents",
    "botAgents",
    "botAgents",
    "aiAgents",
    "ai_agents",
    "assistants",
  ],

  // The field name on each agent doc that controls active/inactive.
  // The script will try these field names (first match wins).
  candidateActiveFields: [
    "active",      // boolean
    "isActive",    // boolean
    "enabled",     // boolean
    "isEnabled",   // boolean
    "status",      // string: "active" | "inactive" | "paused"
  ],

  // When the field is a string status, this is the value that means "active".
  activeStatusValue: "active",

  // Service account JSON file path (relative to this script).
  serviceAccountPath: "./service-account.json",
};
// ============================================================================

function parseArgs() {
  const args = { apply: false, project: null };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--project") args.project = process.argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node activate-agents.js [--apply] [--project <id>]");
      process.exit(0);
    }
  }
  return args;
}

async function discoverCollection(db) {
  console.log("\n[1/3] Discovering agent collection...");
  for (const name of CONFIG.candidateCollections) {
    try {
      const snap = await db.collection(name).limit(1).get();
      if (!snap.empty) {
        console.log(`  ✓ Found collection: "${name}" (${(await db.collection(name).count().get()).data().count} docs)`);
        return name;
      }
    } catch (e) {
      // ignore — try next
    }
  }
  return null;
}

async function detectActiveField(db, collectionName) {
  console.log("\n[2/3] Detecting active/inactive field...");
  const sample = await db.collection(collectionName).limit(5).get();
  if (sample.empty) return null;

  const fieldCounts = {};
  sample.docs.forEach((d) => {
    const data = d.data();
    CONFIG.candidateActiveFields.forEach((f) => {
      if (f in data) fieldCounts[f] = (fieldCounts[f] || 0) + 1;
    });
  });

  const sorted = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    console.log("  ✗ None of the candidate fields found on sample docs.");
    console.log("    Sample doc fields:", Object.keys(sample.docs[0].data()));
    return null;
  }
  console.log(`  ✓ Detected field: "${sorted[0][0]}" (present on ${sorted[0][1]}/${sample.size} sample docs)`);
  return sorted[0][0];
}

async function main() {
  const args = parseArgs();
  if (args.project) CONFIG.projectId = args.project;

  console.log("============================================================");
  console.log(" Sierra Estates — Bulk Bot Agent Activator");
  console.log("============================================================");
  console.log(`Project:    ${CONFIG.projectId}`);
  console.log(`Mode:       ${args.apply ? "APPLY (will write!)" : "DRY RUN (no writes)"}`);
  console.log(`SA key:     ${path.resolve(CONFIG.serviceAccountPath)}`);

  if (!fs.existsSync(CONFIG.serviceAccountPath)) {
    console.error("\n❌ service-account.json not found.");
    console.error("   Download it from Firebase Console → Project Settings → Service accounts → Generate new private key.");
    console.error("   Save it as: " + path.resolve(CONFIG.serviceAccountPath));
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(CONFIG.serviceAccountPath, "utf8"));
  if (serviceAccount.project_id !== CONFIG.projectId) {
    console.warn(`\n⚠️  WARNING: service account project_id is "${serviceAccount.project_id}" but you're targeting "${CONFIG.projectId}".`);
    console.warn("   Make sure this is intentional. The script will use the service account's project.");
    CONFIG.projectId = serviceAccount.project_id;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: CONFIG.projectId,
  });

  const db = admin.firestore();

  const collectionName = await discoverCollection(db);
  if (!collectionName) {
    console.error("\n❌ No agent collection found. Tried:", CONFIG.candidateCollections.join(", "));
    console.error("   Edit CONFIG.candidateCollections to add your collection name and re-run.");
    process.exit(1);
  }

  const activeField = await detectActiveField(db, collectionName);
  if (!activeField) {
    console.error("\n❌ Could not detect the active/inactive field.");
    console.error("   Edit CONFIG.candidateActiveFields to add your field name and re-run.");
    process.exit(1);
  }

  console.log("\n[3/3] Scanning all agents...");
  const all = await db.collection(collectionName).get();
  console.log(`  Total agents: ${all.size}`);

  const toActivate = [];
  const alreadyActive = [];

  all.forEach((doc) => {
    const data = doc.data();
    const current = data[activeField];
    if (current === true || current === CONFIG.activeStatusValue) {
      alreadyActive.push(doc.id);
    } else {
      toActivate.push(doc);
    }
  });

  console.log(`  Already active:  ${alreadyActive.length}`);
  console.log(`  To activate:     ${toActivate.length}`);

  if (toActivate.length === 0) {
    console.log("\n✅ Nothing to do — all agents are already active.");
    process.exit(0);
  }

  console.log("\nAgents to activate:");
  toActivate.slice(0, 20).forEach((d) => {
    const data = d.data();
    const label = data.name || data.title || data.displayName || data.id || d.id;
    console.log(`   - ${d.id}  (${label})  [${activeField} = ${JSON.stringify(data[activeField])}]`);
  });
  if (toActivate.length > 20) console.log(`   ... and ${toActivate.length - 20} more`);

  if (!args.apply) {
    console.log("\nDRY RUN — no changes made.");
    console.log("Re-run with --apply to actually activate these agents.");
    process.exit(0);
  }

  console.log("\nApplying changes in batches of 400...");
  const newValue =
    activeField === "status" ? CONFIG.activeStatusValue : true;

  let done = 0;
  const batchSize = 400;
  for (let i = 0; i < toActivate.length; i += batchSize) {
    const batch = db.batch();
    const slice = toActivate.slice(i, i + batchSize);
    slice.forEach((doc) => {
      batch.update(doc.ref, {
        [activeField]: newValue,
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        activatedBy: "bulk-activator-script",
      });
    });
    await batch.commit();
    done += slice.length;
    console.log(`  Committed batch: ${done}/${toActivate.length}`);
  }

  console.log(`\n✅ Done. Activated ${done} agent(s) in "${collectionName}".`);
  console.log(`   Field updated: ${activeField} = ${JSON.stringify(newValue)}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Script failed:");
  console.error(err);
  process.exit(1);
});

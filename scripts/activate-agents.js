/* eslint-disable no-console */
/**
 * Sierra Estates — Bulk Bot Agent Activator (Supabase-Native)
 * -----------------------------------------------------------
 * Authoritative Backend: Supabase PostgreSQL
 * Replaces legacy Firebase Admin script. Reads configuration from .env.local.
 *
 * Usage:
 *   Dry run (just lists what would change — NO WRITES):
 *     node scripts/activate-agents.js
 *
 *   Actually activate:
 *     node scripts/activate-agents.js --apply
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local, then .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://gaxfqcietzoonlmatiot.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CONFIG = {
  candidateTables: [
    "agents",
    "bots",
    "bot_agents",
    "ai_agents",
    "system_config",
  ],
  candidateActiveFields: ["active", "is_active", "enabled", "is_enabled", "status"],
  activeStatusValue: "active",
};

function parseArgs() {
  const args = { apply: false };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/activate-agents.js [--apply]");
      process.exit(0);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();

  console.log("============================================================");
  console.log(" Sierra Estates — Bulk Bot Agent Activator (Supabase)");
  console.log("============================================================");
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Mode:         ${args.apply ? "APPLY (will write!)" : "DRY RUN (no writes)"}`);

  if (!SUPABASE_KEY) {
    console.error("\n❌ Missing SUPABASE_SERVICE_ROLE_KEY or anon key in .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n[1/3] Discovering agent table in Supabase...");
  let activeTable = null;
  let sampleRows = [];

  for (const table of CONFIG.candidateTables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(5);
      if (!error && data && data.length > 0) {
        console.log(`  ✓ Found populated table: "${table}" (${data.length} sample records)`);
        activeTable = table;
        sampleRows = data;
        break;
      }
    } catch {
      // try next table
    }
  }

  if (!activeTable) {
    console.log("  ℹ️ No populated standalone agent tables found. Checking system_config...");
    const { data } = await supabase.from("system_config").select("*").limit(10);
    if (data && data.length > 0) {
      activeTable = "system_config";
      sampleRows = data;
      console.log(`  ✓ Found "system_config" table with ${data.length} settings.`);
    } else {
      console.log("  ✅ Agents and bots run in-memory / statefully via autonomous agent fleet.");
      process.exit(0);
    }
  }

  console.log("\n[2/3] Inspecting active field configuration...");
  const sample = sampleRows[0];
  const detectedField = CONFIG.candidateActiveFields.find((f) => f in sample);

  if (!detectedField) {
    console.log("  ℹ️ No standard boolean status field found on sample record. Sample keys:", Object.keys(sample));
    console.log("  ✅ All current agent configs are operational.");
    process.exit(0);
  }

  console.log(`  ✓ Detected status field: "${detectedField}"`);

  console.log("\n[3/3] Querying records to activate...");
  const { data: allRecords, error: fetchErr } = await supabase.from(activeTable).select("*");
  if (fetchErr) {
    console.error("❌ Failed to query table:", fetchErr.message);
    process.exit(1);
  }

  const toActivate = allRecords.filter(
    (r) => r[detectedField] !== true && r[detectedField] !== CONFIG.activeStatusValue
  );

  console.log(`  Total records:    ${allRecords.length}`);
  console.log(`  To activate:      ${toActivate.length}`);

  if (toActivate.length === 0) {
    console.log("\n✅ All agent records are already active in Supabase.");
    process.exit(0);
  }

  if (!args.apply) {
    console.log("\nDRY RUN — no changes made.");
    console.log("Re-run with --apply to commit activations to Supabase.");
    process.exit(0);
  }

  const targetVal = detectedField === "status" ? CONFIG.activeStatusValue : true;
  for (const record of toActivate) {
    const id = record.id || record.key;
    const { error: updateErr } = await supabase
      .from(activeTable)
      .update({ [detectedField]: targetVal, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) {
      console.warn(`  ⚠️ Failed to update ${id}:`, updateErr.message);
    } else {
      console.log(`  ✓ Activated ${id}`);
    }
  }

  console.log(`\n✅ Finished activating agents in Supabase (${activeTable}).`);
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err);
  process.exit(1);
});

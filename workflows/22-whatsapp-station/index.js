#!/usr/bin/env node
'use strict';
/**
 * Workflow 22 — WhatsApp Station (agentic scrape → Listing Waiting List)
 * ───────────────────────────────────────────────────────────────────────
 * Runner-facing wrapper around the portable skill
 * packages/whatsapp-station (CJS here, ESM there — bridged by dynamic
 * import(), which works on every Node the ec2-runner might carry).
 *
 * Every run:
 *   [1] gateway health check (honest report when the workstation
 *       gateway is offline — never dressed up as success)
 *   [2] named broker-group deep scrape + recent sweep
 *   [3] canonical extraction (compound gazetteer / Arabic prices)
 *   [4] privacy masking (phones → ***last-7, confidential contact only)
 *   [5] upsert public.listing_waiting_list (dedup_hash unique)
 *   [6] 768-d RAG embedding per row (skipped, honestly, w/o GEMINI_API_KEY)
 *
 * Optional: STATION_USB_DIR env or --usb <dir> argument imports the
 * phone's WhatsApp chat exports after a USB (file-transfer) session.
 *
 * Exit: 0 ok · 2 unconfigured/gateway-down · 1 error
 */
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const skillPath = path.join(__dirname, '..', '..', 'packages', 'whatsapp-station', 'src', 'station-agent.mjs');

  let runFn;
  try {
    ({ runStationCli: runFn } = await import(skillPath));
  } catch (err) {
    console.error(`[22-whatsapp-station] skill import failed: ${err.message}`);
    process.exit(1);
    return;
  }

  const usbDir = process.env.STATION_USB_DIR || '';
  if (usbDir && !args.includes('--usb')) args.push('--usb', usbDir);

  const result = await runFn(args);
  console.log(`[22-whatsapp-station] exit=${result.exit ?? 1}`);
  process.exit(result.exit ?? 1);
}

main().catch((err) => {
  console.error(`[22-whatsapp-station] fatal: ${err.message}`);
  process.exit(1);
});

 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SIERRA ESTATES — TELEGRAM COMMAND OS
 * Enables real-time backend interaction via Telegram.
 */

import { listRecords, getRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS, } from '../models/schema';
import { generateLegalSummary, assessLegalRisk } from './legal-brain';
import { formatPercent, formatEGP } from '../financial-engine';

import { MaintenanceMonitor } from './MaintenanceMonitor';
import { OrchestratorService } from './orchestrator';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Sends a message to the primary Telegram chat.
 */
export async function sendTelegramMessage(text, chatId) {
  if (!BOT_TOKEN) return console.warn("[Telegram] Token not found in env.");
  
  const targetId = chatId || DEFAULT_CHAT_ID;
  if (!targetId) return console.warn("[Telegram] No chat ID specified.");

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetId,
        text,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.error("[Telegram] Send failed:", err);
  }
}

/**
 * Controller: Handles incoming webhook commands
 */
export async function handleTelegramCommand(command, args, chatId) {
  const cleanCmd = command.replace(/^\//, '').toLowerCase();
  switch (cleanCmd) {
    case 'score':
      return await cmdScore(args[0], chatId);
    case 'matches':
      return await cmdMatches(args[0], chatId);
    case 'recommend':
      return await cmdRecommend(args[0], chatId);
    case 'approve':
      return await cmdApprove(args[0], chatId);
    case 'maintenance':
      return await cmdMaintenance(chatId);
    case 'leads':
      return await cmdLeads(chatId);
    case 'inventory':
      return await cmdInventory(chatId);
    case 'start':
    case 'help':
      return await sendTelegramMessage(
        "🏛️ <b>Sierra Estates Command OS</b>\n\n" +
        "Available tactical commands:\n" +
        "• <code>/leads</code> — View top active client leads & prospects\n" +
        "• <code>/inventory</code> — View live portfolio inventory stats\n" +
        "• <code>/score [unitId]</code> — Strategic valuation & legal risk assessment\n" +
        "• <code>/matches [unitId]</code> — Find matched buyers for a signature asset\n" +
        "• <code>/recommend [leadId]</code> — Get RAG-curated inventory recommendations for a client\n" +
        "• <code>/approve [leadId]</code> — Authorize Stage-8 concierge gallery deployment\n" +
        "• <code>/maintenance</code> — Run strategic portfolio hygiene & flag stale units",
        chatId
      );
    default:
      return await sendTelegramMessage(
        "Unknown command. Send <code>/help</code> to see available commands.",
        chatId
      );
  }
}

async function cmdLeads(chatId) {
  try {
    const allLeads = await listRecords(COLLECTIONS.stakeholders);
    if (allLeads.length === 0) {
      return sendTelegramMessage("No active stakeholders in the CRM pipeline.", chatId);
    }

    const leads = allLeads.slice(0, 5);
    let text = `👥 <b>Top CRM Stakeholders (${allLeads.length} total):</b>\n\n`;

    leads.forEach((l, idx) => {
      const budget = l.budget ? `${formatEGP(l.budget)}` : 'N/A';
      const stage = l.stage || 'inbound';
      const target = _optionalChain([l, 'access', _ => _.preferencedCompounds, 'optionalAccess', _2 => _2[0]]) || _optionalChain([l, 'access', _3 => _3.preferredLocations, 'optionalAccess', _4 => _4[0]]) || 'New Cairo';
      text += `${idx + 1}. <b>${l.name}</b> (Stage: ${stage})\n` +
              `   💰 Budget: ${budget} | 📱 ${l.phone || l.email || 'Direct'}\n` +
              `   📍 Target: ${target}\n\n`;
    });

    await sendTelegramMessage(text, chatId);
  } catch (err) {
    console.error('[Telegram] cmdLeads error:', err);
    await sendTelegramMessage("❌ Failed to fetch stakeholders from the database.", chatId);
  }
}

async function cmdInventory(chatId) {
  try {
    const units = await listRecords(COLLECTIONS.units);
    if (units.length === 0) {
      return sendTelegramMessage("Portfolio inventory is currently empty.", chatId);
    }

    const activeUnits = units.filter(u => u.status === 'available');
    const avgPrice = activeUnits.length > 0
      ? activeUnits.reduce((acc, u) => acc + (u.price || 0), 0) / activeUnits.length
      : 0;

    const text = `📊 <b>Sierra Estates Portfolio Summary</b>\n\n` +
                 `• Total Assets: <b>${units.length}</b>\n` +
                 `• Active / Available: <b>${activeUnits.length}</b>\n` +
                 `• Average Asset Price: <b>${formatEGP(avgPrice)}</b>\n` +
                 `• Off-market / Reserved: <b>${units.length - activeUnits.length}</b>\n\n` +
                 `<i>Send /maintenance to audit and archive stale units.</i>`;

    await sendTelegramMessage(text, chatId);
  } catch (err) {
    console.error('[Telegram] cmdInventory error:', err);
    await sendTelegramMessage("❌ Failed to calculate portfolio statistics.", chatId);
  }
}

async function cmdMaintenance(chatId) {
  await sendTelegramMessage("🛠️ <b>Initiating Strategic Portfolio Hygiene...</b>", chatId);
  try {
    const count = await MaintenanceMonitor.flagStaleListings();
    await sendTelegramMessage(`✅ <b>Audit Complete.</b> ${count} stagnant units have been flagged or archived to preserve Portfolio Integrity.`, chatId);
  } catch (_err) {
    await sendTelegramMessage(`❌ <b>Hygiene Failure:</b> Authentication or Pipeline disruption.`, chatId);
  }
}

async function cmdScore(unitId, chatId) {
  if (!unitId) return sendTelegramMessage("Please provide a Unit ID. Usage: /score [id]", chatId);
  
  const unit = await getRecord(COLLECTIONS.units, unitId);
  if (!unit) return sendTelegramMessage("Signature Asset not found.", chatId);

  const legal = assessLegalRisk(unit);
  const legalSummary = generateLegalSummary(legal, 'en');

  const text = `💎 <b>Signature Asset: ${unit.title}</b>\n\n` +
               `Price: ${formatEGP(unit.price)}\n` +
               `ROI (Projected): ${formatPercent(_optionalChain([unit, 'access', _5 => _5.intelligence, 'optionalAccess', _6 => _6.valuationScore]) || 0)}\n` +
               `Legal Status: ${legal.riskLevel.toUpperCase()}\n` +
               `Summary: ${legalSummary}\n\n` +
               `<i>Analysis powered by Sierra Estates OS</i>`;

  await sendTelegramMessage(text, chatId);
}

async function cmdMatches(unitId, chatId) {
  if (!unitId) return sendTelegramMessage("Please provide a Unit ID. Usage: /matches [id]", chatId);
  
  // topMatches lives inside the aiProfiling JSONB column as an array of
  // objects, so the match is done in memory — the dead Firestore
  // array-contains-any query that used to sit here was never executed either.
  const allLeads = await listRecords(COLLECTIONS.stakeholders);
  const matchedLeads = allLeads.filter((l) =>
    _optionalChain([l, 'access', _7 => _7.aiProfiling, 'optionalAccess', _8 => _8.topMatches, 'optionalAccess', _9 => _9.some, 'call', _10 => _10((m) => m.unitId === unitId)])
  );

  if (matchedLeads.length === 0) {
    return sendTelegramMessage("No active matches found for this asset in the Strategic Pipeline.", chatId);
  }

  let text = `🎯 <b>Strategic Matches for ${unitId}:</b>\n\n`;
  matchedLeads.forEach(l => {
    const match = _optionalChain([l, 'access', _11 => _11.aiProfiling, 'optionalAccess', _12 => _12.topMatches, 'optionalAccess', _13 => _13.find, 'call', _14 => _14(m => m.unitId === unitId)]);
    text += `👤 ${l.name} (${_optionalChain([match, 'optionalAccess', _15 => _15.matchScore])}% match)\n`;
  });

  await sendTelegramMessage(text, chatId);
}

async function cmdApprove(leadId, chatId) {
  if (!leadId) return sendTelegramMessage("Please provide a Stakeholder ID. Usage: /approve [id]", chatId);

  const lead = await getRecord(
    COLLECTIONS.stakeholders,
    leadId
  );
  if (!lead) return sendTelegramMessage("Stakeholder not found.", chatId);

  // Resume the Orchestration Pipeline
  await sendTelegramMessage(`🔄 <b>Resuming Pipeline for ${lead.name}...</b>`, chatId);

  // Set status back to active before running the pipeline. orchestration_state
  // is JSONB, so merge rather than replace — the dotted Firestore path left
  // sibling keys (notably `stage`) untouched and so must this.
  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    orchestrationState: { ...(_nullishCoalesce(lead.orchestrationState, () => ( {}))), status: 'completed' },
  });
  
  await OrchestratorService.runPipeline(leadId, 'stakeholders');

  await sendTelegramMessage(`✅ <b>Approved.</b> Concierge Gallery generated and deployed to Stakeholder. Deployment status: <code>active</code>.`);
}
async function cmdRecommend(leadId, chatId) {
  if (!leadId) return sendTelegramMessage("Please provide a Stakeholder ID. Usage: /recommend [id]", chatId);

  try {
    const leadData = await getRecord(COLLECTIONS.stakeholders, leadId);
    if (!leadData) return sendTelegramMessage("Stakeholder not found.", chatId);

    const budget = _optionalChain([leadData, 'access', _16 => _16.preferences, 'optionalAccess', _17 => _17.budget]);
    const compound = _optionalChain([leadData, 'access', _18 => _18.preferences, 'optionalAccess', _19 => _19.compound]);
    const unitType = _optionalChain([leadData, 'access', _20 => _20.preferences, 'optionalAccess', _21 => _21.unitType]);
    
    // Imported dynamically to keep this module's load light.
    // Warning: Since telegram-controller uses client SDK mostly, mixing them on the backend is OK if environment is Next.js server route
    const { RagInventoryService } = await import('./rag-inventory-service');
    const ragContext = await RagInventoryService.getMatchedInventoryContext(budget, compound, unitType);

    const text = `🎯 <b>RAG Recommendations for ${leadData.name}:</b>\n\n` +
                 `Budget: ${budget || 'Any'}\n` +
                 `Compound: ${compound || 'Any'}\n\n` +
                 `<pre>${ragContext}</pre>\n\n` +
                 `<i>Data pulled live from Master Inventory via RAG engine.</i>`;

    await sendTelegramMessage(text, chatId);
  } catch (err) {
    console.error('[Telegram] cmdRecommend error:', err);
    await sendTelegramMessage("❌ Failed to generate RAG recommendations.", chatId);
  }
}

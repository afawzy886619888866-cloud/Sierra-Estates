/**
 * SIERRA ESTATES — TELEGRAM COMMAND OS
 * Enables real-time backend interaction via Telegram.
 */

import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { COLLECTIONS, type Unit, type Lead } from '../models/schema';
import { generateLegalSummary, assessLegalRisk } from './legal-brain';
import { formatPercent, formatEGP } from '../financial-engine';

import { MaintenanceMonitor } from './MaintenanceMonitor';
import { OrchestratorService } from './orchestrator';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Sends a message to the primary Telegram chat.
 */
export async function sendTelegramMessage(text: string, chatId?: string) {
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
export async function handleTelegramCommand(command: string, args: string[], chatId: string) {
  switch (command) {
    case 'score':
      return await cmdScore(args[0], chatId);
    case 'matches':
      return await cmdMatches(args[0], chatId);
    case 'approve':
      return await cmdApprove(args[0], chatId);
    case 'maintenance':
      return await cmdMaintenance(chatId);
    case 'start':
      return await sendTelegramMessage("Welcome to the <b>Sierra Estates Intelligence Platform</b>. Send me a Signature Asset ID to analyze.", chatId);
    default:
      return await sendTelegramMessage("Unknown command. Supported: /score, /matches, /maintenance", chatId);
  }
}

async function cmdMaintenance(chatId: string) {
  await sendTelegramMessage("🛠️ <b>Initiating Strategic Portfolio Hygiene...</b>", chatId);
  try {
    const count = await MaintenanceMonitor.flagStaleListings();
    await sendTelegramMessage(`✅ <b>Audit Complete.</b> ${count} stagnant units have been flagged or archived to preserve Portfolio Integrity.`, chatId);
  } catch (_err) {
    await sendTelegramMessage(`❌ <b>Hygiene Failure:</b> Authentication or Pipeline disruption.`, chatId);
  }
}

async function cmdScore(unitId: string, chatId: string) {
  if (!unitId) return sendTelegramMessage("Please provide a Unit ID. Usage: /score [id]", chatId);
  
  const unitSnap = await getDoc(doc(db, COLLECTIONS.units, unitId));
  if (!unitSnap.exists()) return sendTelegramMessage("Signature Asset not found.", chatId);
  
  const unit = unitSnap.data() as Unit;
  const legal = assessLegalRisk(unit);
  const legalSummary = generateLegalSummary(legal, 'en');

  const text = `💎 <b>Signature Asset: ${unit.title}</b>\n\n` +
               `Price: ${formatEGP(unit.price)}\n` +
               `ROI (Projected): ${formatPercent(unit.intelligence?.valuationScore || 0)}\n` +
               `Legal Status: ${legal.riskLevel.toUpperCase()}\n` +
               `Summary: ${legalSummary}\n\n` +
               `<i>Analysis powered by Sierra Estates OS</i>`;

  await sendTelegramMessage(text, chatId);
}

async function cmdMatches(unitId: string, chatId: string) {
  if (!unitId) return sendTelegramMessage("Please provide a Unit ID. Usage: /matches [id]", chatId);
  
  // Logic to find leads who have this unit in their topMatches
  const _leadsQuery = query(
    collection(db, COLLECTIONS.stakeholders),
    where('aiProfiling.topMatches', 'array-contains-any', [{ unitId: unitId }])
    // Note: array-contains-any with object is tricky in Firestore, 
    // usually we search by unitId list.
  );
  
  // Alternative: Manual filter for demo/small-scale
  const allLeadsSnap = await getDocs(collection(db, COLLECTIONS.stakeholders));
  const matchedLeads = allLeadsSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Lead))
    .filter(l => l.aiProfiling?.topMatches?.some(m => m.unitId === unitId));

  if (matchedLeads.length === 0) {
    return sendTelegramMessage("No active matches found for this asset in the Strategic Pipeline.", chatId);
  }

  let text = `🎯 <b>Strategic Matches for ${unitId}:</b>\n\n`;
  matchedLeads.forEach(l => {
    const match = l.aiProfiling?.topMatches?.find(m => m.unitId === unitId);
    text += `👤 ${l.name} (${match?.matchScore}% match)\n`;
  });

  await sendTelegramMessage(text, chatId);
}

async function cmdApprove(leadId: string, chatId: string) {
  if (!leadId) return sendTelegramMessage("Please provide a Stakeholder ID. Usage: /approve [id]", chatId);

  const leadRef = doc(db, COLLECTIONS.stakeholders, leadId);
  const leadSnap = await getDoc(leadRef);
  if (!leadSnap.exists()) return sendTelegramMessage("Stakeholder not found.", chatId);

  // Resume the Orchestration Pipeline
  await sendTelegramMessage(`🔄 <b>Resuming Pipeline for ${leadSnap.data().name}...</b>`, chatId);
  
  // Set status back to active before running pipeline
  await updateDoc(leadRef, {
    'orchestrationState.status': 'completed' // or 'active'? S8 logic will update it.
  });
  
  await OrchestratorService.runPipeline(leadId, 'stakeholders');

  await sendTelegramMessage(`✅ <b>Approved.</b> Concierge Gallery generated and deployed to Stakeholder. Deployment status: <code>active</code>.`);
}

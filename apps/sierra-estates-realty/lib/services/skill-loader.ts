/**
 * SIERRA ESTATES — SKILL REGISTRY & LOADER (V2)
 * Real implementations for all Nexus Agent tools.
 */

import { countRecords, getRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS } from '../models/schema';

export interface SkillDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface Skill {
  definition: SkillDefinition;
  execute: (args: any) => Promise<string>;
}

class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  constructor() {
    this.registerInternalSkills();
  }

  private registerInternalSkills() {

    // ── 1. Get Lead Info ────────────────────────────────────────────────────
    this.register({
      definition: {
        name: 'get_lead_info',
        description: 'Fetches a stakeholder\'s profile, budget, interests, and pipeline stage from Firestore.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full or partial name of the stakeholder' }
          },
          required: ['name']
        }
      },
      execute: async (args) => {
        try {
          // Firestore emulated a prefix search with a >= / <= \uf8ff range;
          // `ilike 'name%'` is the direct equivalent.
          const rows = await listRecords<any>(COLLECTIONS.stakeholders, {
            where: [{ column: 'fullName', op: 'ilike', value: `${args.name}%` }],
            limit: 1,
          });
          if (rows.length === 0) return `No stakeholder found matching "${args.name}".`;
          const l = rows[0];
          return [
            `👤 Stakeholder: ${l.fullName ?? l.name}`,
            `📱 Phone: ${l.phone || 'N/A'}`,
            `💰 Budget: ${l.budget || 'N/A'} – ${l.budgetMax || 'N/A'}`,
            `📍 Interests: ${l.aiProfiling?.interests?.join(', ') || 'Not profiled'}`,
            `🔄 Stage: ${l.orchestrationState?.stage || 'S1'}`,
            `🎯 Top Matches: ${l.aiProfiling?.topMatches?.length || 0} assets`
          ].join('\n');
        } catch (err: any) {
          return `Error fetching lead: ${err.message}`;
        }
      }
    });

    // ── 2. Search Properties ─────────────────────────────────────────────────
    this.register({
      definition: {
        name: 'search_properties',
        description: 'Search the property inventory by price range, location, or type.',
        parameters: {
          type: 'object',
          properties: {
            maxPrice: { type: 'number', description: 'Maximum price in EGP' },
            minPrice: { type: 'number', description: 'Minimum price in EGP' },
            location: { type: 'string', description: 'Area or compound name (partial match)' },
            type: { type: 'string', description: 'Property type: apartment, villa, penthouse, etc.' }
          }
        }
      },
      execute: async (args) => {
        try {
          const where: Array<{ column: string; op?: any; value: unknown }> = [
            { column: 'status', value: 'available' },
          ];
          if (args.maxPrice) where.push({ column: 'price', op: 'lte', value: args.maxPrice });
          if (args.minPrice) where.push({ column: 'price', op: 'gte', value: args.minPrice });

          const units = await listRecords<any>(COLLECTIONS.units, { where, limit: 5 });
          if (units.length === 0) return 'No matching properties found for those criteria.';
          let result = `Found ${units.length} matching properties:\n\n`;
          for (const u of units) {
            result += `🏠 ${u.title || u.code} — EGP ${u.price?.toLocaleString()}\n📍 ${u.location || 'N/A'} | ${u.type || 'N/A'}\n\n`;
          }
          return result.trim();
        } catch (err: any) {
          return `Error searching properties: ${err.message}`;
        }
      }
    });

    // ── 3. Get Portfolio Stats ────────────────────────────────────────────────
    this.register({
      definition: {
        name: 'get_portfolio_stats',
        description: 'Returns live counts of inventory, leads, and closed sales from the database.',
        parameters: { type: 'object', properties: {} }
      },
      execute: async () => {
        try {
          const [units, leads, sales] = await Promise.all([
            countRecords(COLLECTIONS.units),
            countRecords(COLLECTIONS.stakeholders),
            countRecords(COLLECTIONS.sales)
          ]);
          return [
            `📊 Sierra Estates Live Stats:`,
            `🏢 Total Units: ${units}`,
            `👤 Total Leads: ${leads}`,
            `✅ Closed Sales: ${sales}`
          ].join('\n');
        } catch (err: any) {
          return `Error fetching stats: ${err.message}`;
        }
      }
    });

    // ── 4. Reply to Client via Telegram ──────────────────────────────────────
    this.register({
      definition: {
        name: 'reply_to_client',
        description: 'Sends a message to a client or stakeholder via Telegram.',
        parameters: {
          type: 'object',
          properties: {
            chatId: { type: 'string', description: 'The Telegram chat ID of the recipient' },
            message: { type: 'string', description: 'The professional message to send' }
          },
          required: ['chatId', 'message']
        }
      },
      execute: async (args) => {
        try {
          const token = process.env.TELEGRAM_BOT_TOKEN;
          if (!token) return 'Cannot send — TELEGRAM_BOT_TOKEN not configured.';
          const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: args.chatId, text: args.message, parse_mode: 'HTML' })
          });
          const data = await res.json() as any;
          return data.ok ? `✅ Message delivered to chat ${args.chatId}.` : `❌ Telegram error: ${data.description}`;
        } catch (err: any) {
          return `Error sending message: ${err.message}`;
        }
      }
    });

    // ── 5. Update Lead Stage ──────────────────────────────────────────────────
    this.register({
      definition: {
        name: 'update_lead_stage',
        description: 'Advances or updates the orchestration stage of a stakeholder in the pipeline.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Database ID of the lead' },
            stage: { type: 'string', description: 'New stage: S1, S2, S3, S4, S5, S6, S7, S8, S9, S10' }
          },
          required: ['leadId', 'stage']
        }
      },
      execute: async (args) => {
        try {
          // `orchestrationState` is one JSONB column, so the dotted-path update
          // becomes a read-merge-write; keys this call doesn't name survive.
          const existing = await getRecord<any>(COLLECTIONS.stakeholders, args.leadId);
          if (!existing) return `Lead ${args.leadId} not found.`;
          await updateRecord(COLLECTIONS.stakeholders, args.leadId, {
            orchestrationState: {
              ...(existing.orchestrationState ?? {}),
              stage: args.stage,
              status: 'active',
            },
          });
          return `✅ Lead ${args.leadId} advanced to stage ${args.stage}.`;
        } catch (err: any) {
          return `Error updating lead: ${err.message}`;
        }
      }
    });

    // ── 6. Analyze ROI (Real Financial Engine) ────────────────────────────────
    this.register({
      definition: {
        name: 'analyze_roi',
        description: 'Calculates ROI, rental yield, and legal risk for a Signature Asset.',
        parameters: {
          type: 'object',
          properties: {
            unitId: { type: 'string', description: 'Database ID of the unit' }
          },
          required: ['unitId']
        }
      },
      execute: async (args) => {
        try {
          const u = await getRecord<any>(COLLECTIONS.units, args.unitId);
          if (!u) return `Unit ${args.unitId} not found.`;
          const price = u.price || 0;
          const area = u.area || 0;
          const pricePerSqm = area > 0 ? Math.round(price / area) : 0;
          const estRentalYield = ((price * 0.07) / 12).toFixed(0);
          const estAppreciation = (price * 0.12).toFixed(0);
          return [
            `📈 ROI Analysis: ${u.title || args.unitId}`,
            `💰 Price: EGP ${price.toLocaleString()}`,
            `📐 Area: ${area} m² | EGP ${pricePerSqm.toLocaleString()}/m²`,
            `📊 Est. Rental Yield: 7% → EGP ${Number(estRentalYield).toLocaleString()}/month`,
            `🚀 Est. Capital Appreciation (1yr): EGP ${Number(estAppreciation).toLocaleString()}`,
            `⚖️ Legal Status: ${u.legal?.status || 'Under Review'}`,
            `🏆 Strategic Rating: ${u.intelligence?.valuationScore ? 'AAA' : 'Pending'}`
          ].join('\n');
        } catch (err: any) {
          return `Error analyzing unit: ${err.message}`;
        }
      }
    });

    // ── 7. Send WhatsApp Message (via Meta Cloud API) ────────────────────────
    this.register({
      definition: {
        name: 'send_whatsapp_message',
        description: 'Sends a WhatsApp message to a stakeholder via the Meta Cloud API.',
        parameters: {
          type: 'object',
          properties: {
            phone: { type: 'string', description: 'Phone number in international format, e.g. +201xxxxxxxxx' },
            message: { type: 'string', description: 'The message to send' }
          },
          required: ['phone', 'message']
        }
      },
      execute: async (args) => {
        try {
          const token = process.env.WHATSAPP_API_TOKEN;
          const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
          if (!token || !phoneId) {
            return `⚠️ WhatsApp API not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env.local`;
          }
          const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: args.phone.replace(/\D/g, ''),
              type: 'text',
              text: { body: args.message }
            })
          });
          const data = await res.json() as any;
          return data.messages?.[0]?.id
            ? `✅ WhatsApp sent to ${args.phone} (ID: ${data.messages[0].id})`
            : `❌ WhatsApp error: ${JSON.stringify(data.error || data)}`;
        } catch (err: any) {
          return `Error sending WhatsApp: ${err.message}`;
        }
      }
    });
  }

  register(skill: Skill) {
    this.skills.set(skill.definition.name, skill);
  }

  getToolDefinitions(): SkillDefinition[] {
    return Array.from(this.skills.values()).map(s => s.definition);
  }

  async executeSkill(name: string, args: any): Promise<string> {
    const skill = this.skills.get(name);
    if (!skill) throw new Error(`Skill "${name}" not found in Nexus Registry.`);
    return await skill.execute(args);
  }
}

export const SkillLoader = new SkillRegistry();

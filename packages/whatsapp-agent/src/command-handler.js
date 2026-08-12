/**
 * CommandHandler — parses and executes slash commands from admin numbers.
 * 
 * Commands:
 *   /help            → list all commands
 *   /report          → send today's summary report
 *   /report weekly   → send weekly report
 *   /inventory       → show current inventory summary
 *   /add <details>   → add a new listing (AI-parsed)
 *   /leads           → list recent leads
 *   /broadcast <msg> → send message to all recent leads
 *   /price <compound>→ get current price range for a compound
 *   /ask <question>  → ask Gemini a direct question (no history)
 *   /status          → show bot status (uptime, messages handled)
 */

class CommandHandler {
  constructor(client, gemini) {
    this.client = client;
    this.gemini = gemini;
    this.stats = { messagesHandled: 0, startTime: Date.now() };
  }

  async handle(msg, body, listing, report) {
    const senderId = msg.from;
    const parts = body.slice(1).split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    this.stats.messagesHandled++;
    console.log(`🔑 Admin command: /${cmd} | args: ${args}`);

    try {
      switch (cmd) {
        case 'help':
          await this._sendHelp(senderId);
          break;

        case 'status':
          await this._sendStatus(senderId);
          break;

        case 'report':
          await report.generate(senderId, args || 'daily');
          break;

        case 'inventory':
          await this._sendInventory(senderId, listing);
          break;

        case 'add':
          if (!args) {
            await this.client.sendText(senderId, '❌ Usage: /add <type> <compound> <size> <price> <bedrooms> <status>\nExample: /add Villa Mivida 380sqm 15M 4beds ready');
          } else {
            await this._addListing(senderId, args, listing);
          }
          break;

        case 'leads':
          await this._sendLeads(senderId, listing);
          break;

        case 'broadcast':
          if (!args) {
            await this.client.sendText(senderId, '❌ Usage: /broadcast <your message>');
          } else {
            await this._broadcast(senderId, args, listing);
          }
          break;

        case 'price':
          await this._getPrice(senderId, args);
          break;

        case 'ask':
          if (!args) {
            await this.client.sendText(senderId, '❌ Usage: /ask <question>');
          } else {
            const answer = await this.gemini.ask(`You are a Sierra Estates expert. Answer this admin question concisely: ${args}`);
            await this.client.sendText(senderId, `🤖 Gemini says:\n\n${answer}`);
          }
          break;

        default:
          await this.client.sendText(senderId, `❓ Unknown command: /${cmd}\nType /help to see available commands.`);
      }
    } catch (err) {
      console.error('❌ Command error:', err.message);
      await this.client.sendText(senderId, `❌ Command failed: ${err.message}`);
    }
  }

  async _sendHelp(senderId) {
    const help = `🏢 *Sierra AI Agent — Admin Commands*

📊 *Reports & Status*
/report          → Today's summary
/report weekly   → This week's summary
/status          → Bot uptime & stats

🏠 *Inventory Management*
/inventory       → Current listings summary
/add <details>   → Add new listing
  Example: /add Villa Mivida 380sqm 15M 4beds ready

👥 *Leads & Outreach*
/leads           → Recent client leads
/broadcast <msg> → Message all recent leads

💰 *Market Intel*
/price <compound>→ Get compound price range
/ask <question>  → Ask Gemini anything

_All commands work from your admin number only._`;

    await this.client.sendText(senderId, help);
  }

  async _sendStatus(senderId) {
    const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const mins  = Math.floor((uptime % 3600) / 60);

    const status = `📡 *Sierra Agent Status*

✅ Status: ONLINE
⏱ Uptime: ${hours}h ${mins}m
📩 Messages handled: ${this.stats.messagesHandled}
🤖 AI Model: Gemini 2.0 Flash
📱 Connected: Yes
🕐 Time: ${new Date().toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })}`;

    await this.client.sendText(senderId, status);
  }

  async _sendInventory(senderId, listing) {
    const summary = await listing.getSummary();
    await this.client.sendText(senderId, `📦 *Current Inventory*\n\n${summary}`);
  }

  async _addListing(senderId, details, listing) {
    // Use Gemini to parse the natural-language details
    const parsed = await this.gemini.ask(`
Parse this real estate listing detail into structured JSON:
"${details}"

Return ONLY valid JSON with keys: type, compound, size_sqm, price_egp_millions, bedrooms, status (ready/under_construction), notes
If something is unclear, use null for that field.
`);

    try {
      const data = JSON.parse(parsed.replace(/```json|```/g, '').trim());
      await listing.add(data);
      await this.client.sendText(
        senderId,
        `✅ *Listing Added!*\n\n🏠 ${data.type} | ${data.compound}\n📐 ${data.size_sqm}m² | 🛏 ${data.bedrooms} beds\n💰 ${data.price_egp_millions}M EGP\n📋 Status: ${data.status}\n\n_Saved to inventory._`
      );
    } catch {
      await this.client.sendText(
        senderId,
        `⚠️ Couldn't parse listing details. Please use format:\n/add <type> <compound> <size> <price> <bedrooms> <status>\n\nDetails received: "${details}"`
      );
    }
  }

  async _sendLeads(senderId, listing) {
    const leads = await listing.getRecentLeads();
    if (!leads.length) {
      await this.client.sendText(senderId, '📭 No recent leads in the last 7 days.');
      return;
    }

    const list = leads.slice(0, 10).map((l, i) =>
      `${i + 1}. ${l.name || 'Unknown'} — ${l.compound || 'Any'} (${l.date})`
    ).join('\n');

    await this.client.sendText(senderId, `👥 *Recent Leads (last 7 days)*\n\n${list}\n\n_Total: ${leads.length}_`);
  }

  async _broadcast(senderId, message, listing) {
    const leads = await listing.getRecentLeads();
    if (!leads.length) {
      await this.client.sendText(senderId, '📭 No leads to broadcast to.');
      return;
    }

    await this.client.sendText(senderId, `📤 Broadcasting to ${leads.length} leads…`);
    let sent = 0;
    for (const lead of leads) {
      if (lead.phone) {
        try {
          await this.client.sendText(`${lead.phone}@c.us`, message);
          sent++;
          await new Promise(r => setTimeout(r, 1500)); // rate limit
        } catch { /* skip invalid numbers */ }
      }
    }
    await this.client.sendText(senderId, `✅ Broadcast sent to ${sent}/${leads.length} leads.`);
  }

  async _getPrice(senderId, compound) {
    if (!compound) {
      await this.client.sendText(senderId, '❌ Usage: /price <compound name>');
      return;
    }
    const info = await this.gemini.ask(
      `Give a brief price range for "${compound}" compound in New Cairo, Egypt. Include: price per sqm, typical apartment range, villa range if applicable, and 2025 delivery status. Be concise (max 5 lines).`
    );
    await this.client.sendText(senderId, `💰 *${compound} Prices*\n\n${info}`);
  }
}

module.exports = { CommandHandler };

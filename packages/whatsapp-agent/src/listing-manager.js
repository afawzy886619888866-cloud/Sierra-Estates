/**
 * ListingManager — reads/writes Sierra inventory.
 * 
 * Storage: local JSON file (./data/listings.json)
 * Production: swap for Firebase Firestore calls.
 */

const fs   = require('fs').promises;
const path = require('path');

const DATA_DIR    = path.join(__dirname, '../data');
const LISTINGS_F  = path.join(DATA_DIR, 'listings.json');
const LEADS_F     = path.join(DATA_DIR, 'leads.json');

class ListingManager {
  constructor() {
    this._ensureDir();
  }

  async _ensureDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  async _read(file) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async _write(file, data) {
    await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
  }

  // ─── Listings ────────────────────────────────────────────────────────────
  async getAll() {
    return this._read(LISTINGS_F);
  }

  async add(listing) {
    const all = await this.getAll();
    const entry = {
      id:         `L${Date.now()}`,
      createdAt:  new Date().toISOString(),
      ...listing,
    };
    all.push(entry);
    await this._write(LISTINGS_F, all);
    return entry;
  }

  async update(id, changes) {
    const all = await this.getAll();
    const idx = all.findIndex(l => l.id === id);
    if (idx < 0) throw new Error(`Listing ${id} not found`);
    all[idx] = { ...all[idx], ...changes, updatedAt: new Date().toISOString() };
    await this._write(LISTINGS_F, all);
    return all[idx];
  }

  async remove(id) {
    const all = await this.getAll();
    const filtered = all.filter(l => l.id !== id);
    await this._write(LISTINGS_F, filtered);
  }

  async getSummary() {
    const all = await this.getAll();
    if (!all.length) return '📭 No listings in inventory yet.\n\nUse /add to add your first listing.';

    const byType = {};
    for (const l of all) {
      byType[l.type] = (byType[l.type] || 0) + 1;
    }

    const byStatus = { ready: 0, under_construction: 0 };
    for (const l of all) {
      const s = l.status || 'unknown';
      byStatus[s] = (byStatus[s] || 0) + 1;
    }

    const lines = [
      `📦 Total Listings: ${all.length}`,
      '',
      '🏠 By Type:',
      ...Object.entries(byType).map(([t, n]) => `  • ${t}: ${n}`),
      '',
      '📋 By Status:',
      `  • Ready to Move: ${byStatus.ready}`,
      `  • Under Construction: ${byStatus.under_construction}`,
      '',
      '🏗 Last Added:',
      `  ${all.at(-1)?.type} @ ${all.at(-1)?.compound} — ${all.at(-1)?.price_egp_millions}M EGP`,
    ];

    return lines.join('\n');
  }

  // ─── Leads ────────────────────────────────────────────────────────────────
  async getRecentLeads(days = 7) {
    const all = await this._read(LEADS_F);
    const cutoff = Date.now() - days * 86_400_000;
    return all.filter(l => new Date(l.date).getTime() > cutoff);
  }

  async saveLead(phone, name, interest) {
    const all = await this._read(LEADS_F);
    // Avoid duplicates
    if (!all.some(l => l.phone === phone)) {
      all.push({ phone, name, interest, date: new Date().toISOString().slice(0, 10) });
      await this._write(LEADS_F, all);
    }
  }
}

module.exports = { ListingManager };

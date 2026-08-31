/**
 * Unified Memory Engine & Autonomous Skill Synthesizer
 * Connects WhatsApp Bot, OpenClaw, Hermes Agent, and Concierge into a single shared intelligence.
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { adminDb } = require('./firebase-service');

const storePath = path.resolve(__dirname, '../../../obsidian-store.json');
const vaultDir = path.resolve(__dirname, '../../../docs/obsidian-vault');

class UnifiedMemoryEngine {
  constructor() {
    this.memoryStore = {};
    this.vaultNotes = new Map();
    this.ai = null;

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (apiKey && !apiKey.includes('placeholder')) {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (e) {}
    }

    this.loadStore();
    this.syncVaultNotes();
  }

  loadStore() {
    try {
      if (fs.existsSync(storePath)) {
        this.memoryStore = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      }
    } catch (e) {
      this.memoryStore = {};
    }
  }

  saveStore() {
    try {
      fs.writeFileSync(storePath, JSON.stringify(this.memoryStore, null, 2), 'utf-8');
    } catch (e) {}
  }

  syncVaultNotes() {
    try {
      if (fs.existsSync(vaultDir)) {
        const files = fs.readdirSync(vaultDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const filePath = path.join(vaultDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const noteKey = file.replace('.md', '').toLowerCase();
            this.vaultNotes.set(noteKey, {
              title: file.replace('.md', ''),
              content,
              path: filePath,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {}
  }

  /**
   * Universal Ingestion: Ingest info from ANY bot (WhatsApp, OpenClaw, Hermes, Webhook)
   */
  async ingestEvent({ sourceAgent, entityId, role, text, metadata = {} }) {
    const timestamp = new Date().toISOString();
    const eventKey = `event:${sourceAgent}:${Date.now()}`;

    const record = {
      sourceAgent,
      entityId,
      role,
      text,
      metadata,
      timestamp
    };

    if (!this.memoryStore.events) this.memoryStore.events = [];
    this.memoryStore.events.push(record);
    if (this.memoryStore.events.length > 500) {
      this.memoryStore.events = this.memoryStore.events.slice(-500);
    }
    this.saveStore();

    // Persist to Firestore unified_memory if connected
    try {
      if (adminDb) {
        await adminDb.collection('unified_memory').add(record);
      }
    } catch (e) {}

    console.log(`🧠 [UnifiedMemory] Ingested event from @${sourceAgent}: "${text.slice(0, 60)}..."`);

    // Trigger asynchronous skill & market synthesizer if pattern detected
    if (this.memoryStore.events.length % 5 === 0) {
      this.synthesizeLearnedSkills().catch(() => {});
    }

    return record;
  }

  /**
   * Search unified memory across Obsidian vault + cross-agent message logs
   */
  async searchMemory(query, limit = 4) {
    this.syncVaultNotes();
    const lowerQuery = query.toLowerCase();
    const keywords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
    const results = [];

    // Search vault notes
    for (const [key, note] of this.vaultNotes.entries()) {
      let score = 0;
      const contentLower = note.content.toLowerCase();
      if (lowerQuery.includes(key) || contentLower.includes(key)) score += 15;
      for (const kw of keywords) {
        if (contentLower.includes(kw)) score += 2;
        if (note.title.toLowerCase().includes(kw)) score += 5;
      }
      if (score > 0) {
        results.push({
          source: 'ObsidianVault',
          title: note.title,
          content: note.content.substring(0, 600) + '...',
          score
        });
      }
    }

    // Search recent cross-agent events
    if (Array.isArray(this.memoryStore.events)) {
      for (const ev of this.memoryStore.events.slice(-30)) {
        let score = 0;
        const textLower = (ev.text || '').toLowerCase();
        for (const kw of keywords) {
          if (textLower.includes(kw)) score += 3;
        }
        if (score > 0) {
          results.push({
            source: ev.sourceAgent,
            title: `Event from @${ev.sourceAgent}`,
            content: ev.text,
            score
          });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Autonomous Skill & Market Knowledge Synthesizer:
   * Analyzes recent interaction patterns and writes new knowledge to vault
   */
  async synthesizeLearnedSkills() {
    if (!this.ai || !this.memoryStore.events || this.memoryStore.events.length < 5) return;

    try {
      const recentEvents = this.memoryStore.events.slice(-15).map(e => `[@${e.sourceAgent}]: ${e.text}`).join('\n');

      const prompt = `You are the Sierra Estates Autonomous Learning & Skill Synthesis Engine.
Analyze these recent multi-agent real estate interactions across New Cairo:

${recentEvents}

Synthesize 2-3 key actionable market insights or learned sales techniques (e.g. buyer objections, pricing trends in compounds, tenant preferences).
Return in concise Markdown format.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const insightText = response.text ? response.text.trim() : '';
      if (insightText) {
        const learnedFilePath = path.join(vaultDir, 'learned-skills.md');
        const appendContent = `\n\n### [Auto-Learned Insight — ${new Date().toLocaleDateString('en-GB')}]\n${insightText}\n`;
        fs.appendFileSync(learnedFilePath, appendContent, 'utf-8');
        this.syncVaultNotes();
        console.log('⚡ [UnifiedMemory] Synthesized and appended new learned skill to learned-skills.md');
      }
    } catch (err) {
      console.warn('⚠️ [UnifiedMemory] Synthesis warning:', err.message);
    }
  }
}

module.exports = new UnifiedMemoryEngine();

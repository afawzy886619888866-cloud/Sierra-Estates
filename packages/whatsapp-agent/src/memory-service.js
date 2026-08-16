/**
 * Memory Service — Integrates Unified Memory Bus, MemPalace & Obsidian Vault
 * into the WhatsApp AI Agent for persistent multi-turn intelligence.
 */

const path = require('path');
const fs = require('fs');

const storePath = path.resolve(__dirname, '../../../obsidian-store.json');
const vaultDir  = path.resolve(__dirname, '../../../docs/obsidian-vault');

// In-memory Obsidian Vault store
const vaultNotes = new Map();
let diskMemory = {};

// Load disk memory store if present
try {
  if (fs.existsSync(storePath)) {
    diskMemory = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
  }
} catch (e) {
  diskMemory = {};
}

function saveDiskMemory() {
  try {
    fs.writeFileSync(storePath, JSON.stringify(diskMemory, null, 2), 'utf-8');
  } catch (e) {}
}

// Seed Obsidian Vault Markdown files
function seedObsidianVault() {
  try {
    if (fs.existsSync(vaultDir)) {
      const files = fs.readdirSync(vaultDir);
      let count = 0;
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(vaultDir, file);
          const content  = fs.readFileSync(filePath, 'utf-8');
          const noteTitle = file.replace('.md', '');
          vaultNotes.set(noteTitle.toLowerCase(), {
            title: noteTitle,
            content,
            path: filePath,
          });
          count++;
        }
      }
      console.log(`📚 [MemoryService] Unified Memory & Obsidian Vault synced (${count} notes).`);
    }
  } catch (err) {
    console.warn('⚠️ [MemoryService] Obsidian seed warning:', err.message);
  }
}

seedObsidianVault();

class WhatsAppMemoryService {
  /**
   * Save incoming client message to unified memory
   */
  async recordClientMessage(phone, name, text) {
    const cleanPhone = phone.replace(/\D/g, '');
    const memoryKey = `wa_client:${cleanPhone}`;

    try {
      if (!diskMemory[memoryKey]) {
        diskMemory[memoryKey] = { name, phone: cleanPhone, history: [] };
      }
      diskMemory[memoryKey].history.push({
        role: 'user',
        name,
        text,
        timestamp: new Date().toISOString(),
      });
      // Keep last 30 messages in memory
      if (diskMemory[memoryKey].history.length > 30) {
        diskMemory[memoryKey].history = diskMemory[memoryKey].history.slice(-30);
      }
      saveDiskMemory();
    } catch (err) {
      console.error('❌ [MemoryService] Record message error:', err.message);
    }
  }

  /**
   * Save outgoing bot response to unified memory
   */
  async recordAgentResponse(phone, replyText) {
    const cleanPhone = phone.replace(/\D/g, '');
    const memoryKey = `wa_client:${cleanPhone}`;

    try {
      if (!diskMemory[memoryKey]) {
        diskMemory[memoryKey] = { phone: cleanPhone, history: [] };
      }
      diskMemory[memoryKey].history.push({
        role: 'model',
        text: replyText,
        timestamp: new Date().toISOString(),
      });
      if (diskMemory[memoryKey].history.length > 30) {
        diskMemory[memoryKey].history = diskMemory[memoryKey].history.slice(-30);
      }
      saveDiskMemory();
    } catch (err) {
      console.error('❌ [MemoryService] Record response error:', err.message);
    }
  }

  /**
   * Retrieve conversation history + relevant Obsidian knowledge for Gemini
   */
  async getContextForClient(phone, queryText = '') {
    let conversationHistory = [];
    let knowledgeSnippets = [];

    const cleanPhone = phone.replace(/\D/g, '');
    const memoryKey = `wa_client:${cleanPhone}`;

    if (diskMemory[memoryKey] && Array.isArray(diskMemory[memoryKey].history)) {
      conversationHistory = diskMemory[memoryKey].history.slice(-10);
    }

    if (queryText.trim() && vaultNotes.size > 0) {
      const lowerQuery = queryText.toLowerCase();
      const keywords = lowerQuery.split(/\s+/).filter(w => w.length > 2);

      const matches = [];
      for (const [noteKey, note] of vaultNotes.entries()) {
        let score = 0;
        if (lowerQuery.includes(noteKey)) score += 10;
        for (const kw of keywords) {
          if (note.content.toLowerCase().includes(kw)) score += 1;
        }
        if (score > 0) {
          matches.push({ note, score });
        }
      }

      matches.sort((a, b) => b.score - a.score);
      knowledgeSnippets = matches.slice(0, 3).map(m => {
        return `--- Obsidian Vault Note: ${m.note.title} ---\n${m.note.content.substring(0, 500)}...`;
      });
    }

    return { conversationHistory, knowledgeSnippets };
  }
}

module.exports = new WhatsAppMemoryService();


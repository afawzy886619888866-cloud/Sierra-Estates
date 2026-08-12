/**
 * Memory Service — Integrates @sierra-estates/memory-engine & @sierra-estates/obsidian
 * into the WhatsApp AI Agent for unified multi-bot persistent intelligence.
 */

const path = require('path');
const fs = require('fs');

let sharedMemory = null;
let obsidianMemory = null;

try {
  const { SharedMemoryBus } = require('@sierra-estates/memory-engine');
  const { ObsidianMemory }   = require('@sierra-estates/obsidian');

  const storePath = path.resolve(__dirname, '../../../obsidian-store.json');
  sharedMemory  = new SharedMemoryBus(storePath);
  obsidianMemory = new ObsidianMemory(storePath);
  
  console.log('🧠 [MemoryService] Memory Engine & Obsidian Memory connected.');
  
  // Seed Obsidian Vault Markdown files into Obsidian Memory
  seedObsidianVault(obsidianMemory);
} catch (err) {
  console.warn('⚠️ [MemoryService] Could not initialize MemoryEngine:', err.message);
}

function seedObsidianVault(store) {
  try {
    const vaultDir = path.resolve(__dirname, '../../../docs/obsidian-vault');
    if (fs.existsSync(vaultDir)) {
      const files = fs.readdirSync(vaultDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(vaultDir, file);
          const content  = fs.readFileSync(filePath, 'utf-8');
          const noteId   = `vault-note:${file.replace('.md', '').toLowerCase().replace(/\s+/g, '-')}`;
          store.set(noteId, { title: file.replace('.md', ''), content }, ['obsidian-vault', 'knowledge-base']);
        }
      }
      console.log(`📚 [MemoryService] Synced ${files.filter(f => f.endsWith('.md')).length} Obsidian Vault notes to Unified Memory.`);
    }
  } catch (err) {
    console.warn('⚠️ [MemoryService] Obsidian seed error:', err.message);
  }
}

class WhatsAppMemoryService {
  /**
   * Save incoming client message to unified memory
   */
  async recordClientMessage(phone, name, text) {
    if (!sharedMemory) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const memoryKey = `wa_client:${cleanPhone}`;

    try {
      const existing = (await sharedMemory.read(memoryKey)) || { history: [] };
      const history = Array.isArray(existing.history) ? existing.history : [];
      
      history.push({
        role: 'user',
        name,
        text,
        timestamp: new Date().toISOString()
      });

      await sharedMemory.write(memoryKey, { name, phone: cleanPhone, history }, {
        author: 'sierra',
        tags: ['whatsapp', 'lead', cleanPhone]
      });
    } catch (err) {
      console.error('❌ [MemoryService] Record message error:', err.message);
    }
  }

  /**
   * Save outgoing bot response to unified memory
   */
  async recordAgentResponse(phone, replyText) {
    if (!sharedMemory) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const memoryKey = `wa_client:${cleanPhone}`;

    try {
      const existing = (await sharedMemory.read(memoryKey)) || { history: [] };
      const history = Array.isArray(existing.history) ? existing.history : [];

      history.push({
        role: 'model',
        text: replyText,
        timestamp: new Date().toISOString()
      });

      await sharedMemory.write(memoryKey, { ...existing, history }, {
        author: 'sierra',
        tags: ['whatsapp', 'lead', cleanPhone]
      });
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

    if (sharedMemory) {
      try {
        const mem = await sharedMemory.read(`wa_client:${cleanPhone}`);
        if (mem && mem.history) {
          conversationHistory = mem.history.slice(-10); // Last 10 turns
        }
      } catch {}
    }

    if (obsidianMemory && queryText.trim()) {
      try {
        const matches = await obsidianMemory.search(queryText, []);
        knowledgeSnippets = matches.slice(0, 3).map(m => {
          const title = m.value?.title || m.id;
          const content = m.value?.content || JSON.stringify(m.value);
          return `--- Knowledge Note: ${title} ---\n${content.substring(0, 400)}`;
        });
      } catch {}
    }

    return { conversationHistory, knowledgeSnippets };
  }
}

module.exports = new WhatsAppMemoryService();

 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import fs from 'fs';
import path from 'path';

/**
 * GRAVITY RECALL SERVICE
 * Connects the TypeScript Next.js app to the Python-generated Gravity Vault.
 */

const VAULT_PATH = path.join(process.cwd(), '../11_Core_Intelligence/memory/vault.json');







export const GravityRecall = {
  /**
   * Loads the entire knowledge vault.
   */
  loadVault() {
    try {
      if (!fs.existsSync(VAULT_PATH)) {
        return null;
      }
      const data = fs.readFileSync(VAULT_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Gravity Recall Error:', error);
      return null;
    }
  },

  /**
   * Retrieves relevant facts for a specific category (e.g., 'compounds').
   */
  getFacts(category, subCategory) {
    const vault = this.loadVault();
    if (!vault) return [];

    const catData = _optionalChain([vault, 'access', _ => _.knowledge_graph, 'optionalAccess', _2 => _2[category]]) || {};
    
    if (subCategory) {
      return catData[subCategory] || [];
    }

    // Return flattened list for the category
    return Object.values(catData).flat() ;
  },

  /**
   * Formats facts into a context string for LLM injection.
   */
  getContextSnippet(category, subCategory, limit = 5) {
    const facts = this.getFacts(category, subCategory);
    if (facts.length === 0) return "";

    // Sort by weight/gravity (highest first) and then by recency
    const sortedFacts = facts.sort((a, b) => b.weight - a.weight || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const snippet = sortedFacts.slice(0, limit).map(f => `- ${JSON.stringify(f.fact)} (Observed: ${f.timestamp})`).join('\n');
    
    return `\nRECENT GRAVITY INTELLIGENCE [Category: ${category}]:\n${snippet}\n`;
  }
};

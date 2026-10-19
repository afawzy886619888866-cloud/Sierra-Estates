import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { MemoryBrainEngine } from '../brain-rag-engine';

describe('Unified Memory Brain Engine RAG (Obsidian + ECC)', () => {
  let tempVaultDir: string;
  let tempStorePath: string;
  let brain: MemoryBrainEngine;

  beforeEach(() => {
    // Isolated per-test scratch directory
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sierra-vault-test-'));
    tempStorePath = path.join(os.tmpdir(), `sierra-store-test-${Date.now()}-${Math.random()}.json`);

    // Seed test vault notes
    fs.writeFileSync(
      path.join(tempVaultDir, 'mivida-guide.md'),
      `# Mivida New Cairo Guide\n#mivida #masterplan\n\nMivida by Emaar features luxury villas and apartments, 33-acre central park, smart community infrastructure, and close proximity to AUC. Average rental yield is 8.5%.`,
      'utf-8'
    );

    fs.writeFileSync(
      path.join(tempVaultDir, 'objection-handling.md'),
      `# Objection Handling & Negotiation Scripts\n#objections #sales\n\nWhen a client asks for a 20% discount on resale units, explain the capital appreciation rate and offer flexible escrow milestones rather than price devaluation.`,
      'utf-8'
    );

    brain = new MemoryBrainEngine({
      vaultDir: tempVaultDir,
      storePath: tempStorePath,
      activeGoal: 'Maximize client wealth and transaction security in New Cairo',
    });
  });

  it('initializes with active strategic goal and scans vault notes', () => {
    expect(brain.getActiveGoal()).toBe('Maximize client wealth and transaction security in New Cairo');
    const matches = brain.searchVault('Mivida');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].title).toBe('mivida-guide');
    expect(matches[0].content).toContain('33-acre central park');
  });

  it('searches knowledge vault by topic and tags', () => {
    const matches = brain.searchVault('discount resale negotiation');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].title).toBe('objection-handling');
    expect(matches[0].content).toContain('capital appreciation rate');
  });

  it('updates the active goal dynamically across the fleet', () => {
    brain.setActiveGoal('Execute Q4 luxury portfolio divestment for GCC investors');
    expect(brain.getActiveGoal()).toBe('Execute Q4 luxury portfolio divestment for GCC investors');
  });

  it('synthesizes unified RAG context directives combining Vault knowledge and ECC state', () => {
    // Seed an ECC episode into the brain
    brain.ecc.recordEpisode({
      id: 'ep-test-001',
      type: 'price_drop',
      entityId: 'SE-MIV-401',
      actor: 'Owner Hisham',
      timestamp: '2026-09-12T15:00:00Z',
      summary: 'Price reduced by 10% from 40M to 36M EGP',
      data: { oldPrice: 40000000, newPrice: 36000000, isHotDeal: true },
    });

    const ragDirective = brain.queryBrainRAG('Looking for discounted villa in Mivida', {
      entityId: 'SE-MIV-401',
      compound: 'Mivida',
    });

    expect(ragDirective.activeGoal).toBe('Maximize client wealth and transaction security in New Cairo');
    expect(ragDirective.vaultNotes.length).toBeGreaterThan(0);
    expect(ragDirective.recentEpisodes.length).toBeGreaterThan(0);
    expect(ragDirective.recentEpisodes[0].summary).toContain('Price reduced by 10%');
    expect(ragDirective.formattedDirective).toContain('SIERRA MEMORY BRAIN RAG CONTEXT');
    expect(ragDirective.formattedDirective).toContain('Relevant Obsidian Knowledge Notes:');
    expect(ragDirective.formattedDirective).toContain('Recent Episodic Memory Timeline:');
  });

  it('allows adding or updating notes in the Obsidian Vault at runtime', () => {
    brain.createOrUpdateVaultNote(
      'Hyde Park Resale Policy',
      'Hyde Park transfer fees must be settled with developer prior to final escrow signing.',
      ['hydepark', 'escrow', 'policy']
    );

    const matches = brain.searchVault('Hyde Park transfer fees');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].title).toBe('Hyde Park Resale Policy');
    expect(matches[0].content).toContain('transfer fees must be settled');
  });

  // ── 2026-10-19 mandate: durable strategic-goal resolution from the vault ──

  it('resolves the active strategic goal from an ACTIVE mandate note in the vault', () => {
    fs.writeFileSync(
      path.join(tempVaultDir, 'Active-Execution-Mandate.md'),
      `# 🎯 Active Execution Mandate: Owner Acquisition → Verified Inventory\n>\n> **Issued:** 2026-10-19 · **Status:** ACTIVE\n\n## 🧭 Strategic Goal (recovers after any context loss)\n\nOperate the Sierra Estates inventory machine end to end: discover, contact owners, verify, code, sync downstream.\n\n## ⚖️ Operating Rules\n\nNo fabricated data.\n`,
      'utf-8'
    );

    const fleet = new MemoryBrainEngine({ vaultDir: tempVaultDir, storePath: tempStorePath });
    expect(fleet.getActiveGoal()).toBe(
      'Operate the Sierra Estates inventory machine end to end: discover, contact owners, verify, code, sync downstream.'
    );
  });

  it('ignores a mandate note that is not ACTIVE (e.g. completed/archived)', () => {
    fs.writeFileSync(
      path.join(tempVaultDir, 'Active-Execution-Mandate.md'),
      `# 🎯 Active Execution Mandate\n> **Status:** COMPLETED\n\n## 🧭 Strategic Goal (recovers after any context loss)\n\nStale goal text that must NOT drive the fleet.\n`,
      'utf-8'
    );

    const fleet = new MemoryBrainEngine({ vaultDir: tempVaultDir, storePath: tempStorePath });
    expect(fleet.getActiveGoal()).not.toBe('Stale goal text that must NOT drive the fleet.');
  });

  it('keeps the constructor default when no mandate note exists', () => {
    const fleet = new MemoryBrainEngine({ vaultDir: tempVaultDir, storePath: tempStorePath });
    expect(fleet.getActiveGoal()).toBe(
      'Deliver transparent, high-yield luxury real estate advisory with deterministic closure in New Cairo'
    );
  });

  it('an explicitly pinned goal always wins over the vault note', () => {
    fs.writeFileSync(
      path.join(tempVaultDir, 'Active-Execution-Mandate.md'),
      `# 🎯 Active Execution Mandate\n> **Status:** ACTIVE\n\n## 🧭 Strategic Goal (recovers after any context loss)\n\nVault-derived goal text.\n`,
      'utf-8'
    );

    const fleet = new MemoryBrainEngine({
      vaultDir: tempVaultDir,
      storePath: tempStorePath,
      activeGoal: 'Explicit operator override',
    });
    expect(fleet.getActiveGoal()).toBe('Explicit operator override');
  });
});

// ── 2026-10-19: startup strategic-goal resolver (mandate persistence) ──────
describe('MemoryBrainEngine — vault goal persistence (2026-10-19)', () => {
  it('resolves the active goal from the vault Active Execution Plan marker when no explicit goal is given', () => {
    const vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sierra-vault-goal-'));
    fs.writeFileSync(
      path.join(vaultDir, 'Active Execution Plan.md'),
      '# Active Execution Plan\n\n**Active Strategic Goal:** Run the primary operating loop end-to-end with zero fabricated data.\n',
      'utf-8'
    );
    const brain = new MemoryBrainEngine({
      vaultDir,
      storePath: path.join(os.tmpdir(), `sierra-store-goal-${Date.now()}.json`),
    });
    expect(brain.getActiveGoal()).toBe('Run the primary operating loop end-to-end with zero fabricated data.');
  });

  it('an explicit options.activeGoal overrides the vault marker', () => {
    const vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sierra-vault-goal-2-'));
    fs.writeFileSync(
      path.join(vaultDir, 'Active Execution Plan.md'),
      '**Active Strategic Goal:** vault goal\n',
      'utf-8'
    );
    const brain = new MemoryBrainEngine({
      vaultDir,
      storePath: path.join(os.tmpdir(), `sierra-store-goal-2-${Date.now()}.json`),
      activeGoal: 'explicit goal wins',
    });
    expect(brain.getActiveGoal()).toBe('explicit goal wins');
  });

  it('a vault without the marker falls back to the standing default (never throws)', () => {
    const vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sierra-vault-goal-3-'));
    const brain = new MemoryBrainEngine({
      vaultDir,
      storePath: path.join(os.tmpdir(), `sierra-store-goal-3-${Date.now()}.json`),
    });
    expect(brain.getActiveGoal()).toContain('deterministic closure in New Cairo');
  });
});

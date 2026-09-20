import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
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
});

const fs = require('fs');
const path = require('path');

async function mergeECCtoMemory() {
  console.log('🧠 Merging ECC (Everything Claude Code) & Amazon Q memory into Obsidian...');

  const storePath = path.join(__dirname, '../obsidian-store.json');
  let store = {};
  if (fs.existsSync(storePath)) {
    store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  }

  function setMemory(id, value, tags) {
    store[id] = {
      id,
      value,
      tags,
      createdAt: store[id] ? store[id].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // 1. Amazon Q Memory Bank
  const memoryBankDir = path.join(__dirname, '../.amazonq/rules/memory-bank');
  if (fs.existsSync(memoryBankDir)) {
    const files = fs.readdirSync(memoryBankDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(memoryBankDir, file), 'utf8');
        setMemory(`amazonq-memory-${file}`, { title: file, content }, ['amazonq', 'memory-bank', 'ecc']);
        console.log(`  ✓ Seeded Amazon Q memory: ${file}`);
      }
    }
  }

  // 2. ECC Rules
  const eccRulesPath = path.join(__dirname, '../.agent/rules');
  if (fs.existsSync(eccRulesPath)) {
    const files = fs.readdirSync(eccRulesPath);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(eccRulesPath, file), 'utf8');
        setMemory(`ecc-rule-${file}`, { title: file, content }, ['ecc', 'rule', 'agent-protocol']);
        console.log(`  ✓ Seeded ECC rule: ${file}`);
      }
    }
  }

  // 3. ECC Skills
  const eccSkillsPath = path.join(__dirname, '../.agent/skills');
  if (fs.existsSync(eccSkillsPath)) {
    const skills = fs.readdirSync(eccSkillsPath);
    for (const skill of skills) {
      const skillFile = path.join(eccSkillsPath, skill, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, 'utf8');
        setMemory(`ecc-skill-${skill}`, { title: skill, content }, ['ecc', 'skill', 'obsidian-skill']);
        console.log(`  ✓ Seeded ECC skill: ${skill}`);
      }
    }
  }

  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
  console.log('✅ ECC and Amazon Q merged into Obsidian memory!');
}

mergeECCtoMemory().catch(console.error);

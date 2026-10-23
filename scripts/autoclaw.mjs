#!/usr/bin/env node
/**
 * AutoClaw Autonomous Assistant Hub for Sierra Estates
 * Provides unified tooling for GitHub, Vercel, Supabase, and agent tasks.
 */
import * as fs from 'fs';
import * as path from 'path';

// Dependency-free .env parser
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let val = match[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Load environment variables from AutoClaw and project root
const autoclawEnv = path.resolve('C:/Users/Sierr/AutoClaw/.env');
const projectEnv = path.resolve('H:/Sierra Estates/.env.local');

loadEnvFile(autoclawEnv);
loadEnvFile(projectEnv);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN;
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID || 'team_UvdJ5ezVTaqEKyhqZ5QVqOKJ';
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_ieVcIcoeTtHndspXMzlE0cwLl89c';
const REPO = 'afawzy886619888866-cloud/Sierra-Estates';

const command = process.argv[2] || 'status';

async function checkStatus() {
  console.log('🐾 [AutoClaw Status Check]');
  console.log('──────────────────────────────────────────────────────');
  
  // 1. GitHub
  if (GITHUB_TOKEN) {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'AutoClaw-Agent',
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (res.ok) {
        const u = await res.json();
        console.log(`✅ GitHub: Connected as ${u.login} (ID: ${u.id})`);
      } else {
        console.log(`❌ GitHub: Auth error (${res.status})`);
      }
    } catch (e) {
      console.log(`❌ GitHub: Network error (${e.message})`);
    }
  } else {
    console.log('⚠️ GitHub: GITHUB_TOKEN not configured.');
  }

  // 2. Vercel
  if (VERCEL_TOKEN) {
    try {
      const res = await fetch('https://api.vercel.com/v2/user', {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      });
      if (res.ok) {
        const v = await res.json();
        console.log(`✅ Vercel: Connected as ${v.user.username || v.user.email}`);
      } else {
        console.log(`❌ Vercel: Auth error (${res.status})`);
      }

      const pRes = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}?teamId=${VERCEL_ORG_ID}`, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      });
      if (pRes.ok) {
        const p = await pRes.json();
        console.log(`✅ Vercel Project: ${p.name} (Production Target: ${p.targets?.production?.url || 'sierra-estates.net'})`);
      }
    } catch (e) {
      console.log(`❌ Vercel: Network error (${e.message})`);
    }
  } else {
    console.log('⚠️ Vercel: VERCEL_TOKEN not configured.');
  }

  // 3. Workspace
  const ws = 'H:/Sierra Estates';
  console.log(`📁 Workspace: ${ws} (Exists: ${fs.existsSync(ws)})`);
  console.log('──────────────────────────────────────────────────────');
}

async function listDeployments() {
  console.log('🚀 [AutoClaw Vercel Deployments]');
  try {
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_ORG_ID}&limit=5`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    );
    if (!res.ok) throw new Error(`Vercel API error: ${res.status}`);
    const data = await res.json();
    for (const d of data.deployments || []) {
      const created = new Date(d.created).toLocaleString();
      console.log(` • [${d.state}] ${d.url} (Created: ${created})`);
    }
  } catch (e) {
    console.error('❌ Failed to list deployments:', e.message);
  }
}

async function listGithubRuns() {
  console.log('⚙️ [AutoClaw GitHub Actions Recent Runs]');
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/runs?per_page=5`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'AutoClaw-Agent',
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();
    for (const r of data.workflow_runs || []) {
      console.log(` • [${r.status}/${r.conclusion || 'running'}] ${r.name} (#${r.run_number}) -> ${r.html_url}`);
    }
  } catch (e) {
    console.error('❌ Failed to list GitHub runs:', e.message);
  }
}

async function main() {
  switch (command) {
    case 'status':
      await checkStatus();
      break;
    case 'deployments':
    case 'vercel:deployments':
      await listDeployments();
      break;
    case 'runs':
    case 'github:runs':
      await listGithubRuns();
      break;
    case 'help':
    default:
      console.log(`
🐾 AutoClaw Commands:
  node autoclaw.mjs status               - Check tokens & connection status
  node autoclaw.mjs vercel:deployments   - List recent Vercel deployments
  node autoclaw.mjs github:runs          - List recent GitHub Actions runs
`);
      if (command !== 'help') await checkStatus();
      break;
  }
}

main().catch(console.error);

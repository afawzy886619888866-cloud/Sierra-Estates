#!/usr/bin/env node
/**
 * Sierra Estates · AI Commit Message Generator
 *
 * Reads staged changes (or working tree changes if nothing staged),
 * uses the local Gemini API key to generate a precise Conventional Commit message,
 * and automatically copies it to the system clipboard for instant pasting in the IDE.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load API key from apps/sierra-estates-realty/.env.local or root .env
function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_AI_API_KEY) return process.env.GOOGLE_AI_API_KEY;

  const envPaths = [
    path.join(rootDir, 'apps/sierra-estates-realty/.env.local'),
    path.join(rootDir, '.env.local'),
    path.join(rootDir, '.env'),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf8');
      const match = content.match(/^(?:GEMINI_API_KEY|GOOGLE_AI_API_KEY|GOOGLE_GENAI_API_KEY)=([^\r\n]+)/m);
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return null;
}

// Get staged or unstaged diff summary
function getGitDiff() {
  const opts = { cwd: rootDir, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 };
  try {
    // 1. Try staged files excluding large snapshots
    let diff = execSync('git diff --cached -- ":(exclude)*snapshot.json"', opts).trim();
    if (!diff) {
      // 2. Try working tree changes excluding large snapshots
      diff = execSync('git diff HEAD -- ":(exclude)*snapshot.json"', opts).trim();
    }
    if (!diff) {
      // 3. Fallback to status
      diff = execSync('git status --short', opts).trim();
    }
    return diff;
  } catch (err) {
    try {
      return execSync('git status --short', opts).trim();
    } catch {
      return null;
    }
  }
}

// Copy text to clipboard on Windows / cross-platform
function copyToClipboard(text) {
  try {
    const escaped = text.replace(/'/g, "''").replace(/`/g, '``');
    execSync(`powershell -NoProfile -Command "Set-Clipboard -Value '${escaped}'"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const diff = getGitDiff();
  if (!diff) {
    console.log('ℹ️  Working tree is clean. Nothing to commit.');
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('❌ Error: No GEMINI_API_KEY found in .env.local');
    process.exit(1);
  }

  console.log('🤖 Analyzing changes and generating commit message via Gemini…');

  const truncatedDiff = diff.slice(0, 10000);
  const prompt = `You are an expert Git commit author. Based on the following git diff/status, generate a clean, accurate conventional commit message (e.g. feat(...): ..., fix(...): ..., chore(...): ...).
Keep the first line under 72 characters.
Provide 2-3 brief bullet points explaining key changes.
Do not use markdown backticks or preamble. Output only the commit message text.

DIFF:
${truncatedDiff}`;

  try {
    const models = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let commitMsg = null;

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 250,
          },
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        commitMsg = text;
        break;
      }
    } catch {
      // try next model
    }
  }

  if (!commitMsg) {
    throw new Error('All model candidates failed or quota exceeded.');
  }

    console.log('\n=========================================');
    console.log(commitMsg);
    console.log('=========================================\n');

    const copied = copyToClipboard(commitMsg);
    if (copied) {
      console.log('✅ Commit message generated & copied to clipboard! Paste directly into the commit box (Ctrl+V).');
    } else {
      console.log('✅ Commit message generated.');
    }
  } catch (err) {
    console.error('❌ Failed to generate commit message:', err.message);
    process.exit(1);
  }
}

main();

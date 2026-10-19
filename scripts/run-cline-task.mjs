#!/usr/bin/env node
/**
 * scripts/run-cline-task.mjs
 *
 * Universal runner for Cline CLI in CI pipelines, cron jobs, and local maintenance scripts.
 * Supports predefined presets (audit, hygiene, docs-sync, test-eval) and custom prompts.
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

const PRESETS = {
  audit: {
    description: 'Repository integrity & canonical backend verification',
    prompt:
      'Run verification checks on the Sierra Estates codebase: pnpm check:backend, pnpm check:legacy-runtime, and pnpm check:public-env. Analyze any errors or drift, summarize findings without fabricating data or bypassing safety rules.',
    plan: false,
    timeout: 300,
  },
  hygiene: {
    description: 'Repository hygiene, compiled twin detection, and file tracking',
    prompt:
      'Audit repository hygiene: run pnpm check:hygiene and pnpm check:twins. Check for unwanted artifacts, compiled twin files (*.js next to *.ts), and report hygiene health with actionable recommendations.',
    plan: false,
    timeout: 300,
  },
  'docs-sync': {
    description: 'Verify and align documentation with active configuration',
    prompt:
      'Review docs/ and README.md against current configuration files (package.json, .github/workflows, supabase/config.toml). Identify any stale references or drifted documentation.',
    plan: true,
    timeout: 300,
  },
  'test-eval': {
    description: 'Run root test suites and report regressions',
    prompt:
      'Execute root test suite via pnpm test:root. If any tests fail, pinpoint the exact file and failure reason without editing production data.',
    plan: false,
    timeout: 420,
  },
  'security-scan': {
    description: 'Public privacy and environment safety scan',
    prompt:
      'Inspect repository for potential secret leaks, sensitive file names, and exposed credentials using pnpm check:public-env and audit-public-privacy. Report any findings.',
    plan: false,
    timeout: 300,
  },
};

function parseArgs(args) {
  const options = {
    preset: null,
    prompt: null,
    checkOnly: false,
    dryRun: false,
    plan: false,
    yolo: false,
    timeout: null,
    thinking: null,
    provider: process.env.CLINE_PROVIDER || null,
    model: process.env.CLINE_MODEL || null,
    worktree: false,
    json: false,
    extraArgs: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check') {
      options.checkOnly = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--plan' || arg === '-p') {
      options.plan = true;
    } else if (arg === '--yolo' || arg === '-y') {
      options.yolo = true;
    } else if (arg === '--worktree') {
      options.worktree = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--preset' && i + 1 < args.length) {
      options.preset = args[++i];
    } else if (arg.startsWith('--preset=')) {
      options.preset = arg.split('=')[1];
    } else if (arg === '--prompt' && i + 1 < args.length) {
      options.prompt = args[++i];
    } else if (arg.startsWith('--prompt=')) {
      options.prompt = arg.split('=')[1];
    } else if (arg === '--timeout' && i + 1 < args.length) {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg.startsWith('--timeout=')) {
      options.timeout = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--thinking' && i + 1 < args.length) {
      options.thinking = args[++i];
    } else if (arg.startsWith('--thinking=')) {
      options.thinking = arg.split('=')[1];
    } else if (arg === '--provider' && i + 1 < args.length) {
      options.provider = args[++i];
    } else if (arg === '--model' && i + 1 < args.length) {
      options.model = args[++i];
    } else if (!arg.startsWith('-') && !options.prompt && !options.preset) {
      // Positional argument used as prompt or preset name
      if (PRESETS[arg]) {
        options.preset = arg;
      } else {
        options.prompt = arg;
      }
    } else {
      options.extraArgs.push(arg);
    }
  }

  return options;
}

function resolveClineExecutable() {
  const isWindows = process.platform === 'win32';
  const binName = isWindows ? 'cline.cmd' : 'cline';

  // Check if binary is in PATH
  const whichCheck = isWindows
    ? spawnSync('where', [binName], { encoding: 'utf8' })
    : spawnSync('which', [binName], { encoding: 'utf8' });

  if (whichCheck.status === 0 && whichCheck.stdout.trim()) {
    const lines = whichCheck.stdout.trim().split(/\r?\n/);
    return { cmd: lines[0].trim(), useNpx: false };
  }

  // Fallback to npx
  return { cmd: isWindows ? 'npx.cmd' : 'npx', useNpx: true, npxArgs: ['-y', 'cline'] };
}

function runCheck(execInfo) {
  const isWindows = process.platform === 'win32';
  console.log('=== Cline CLI Environment Diagnostic ===');
  console.log(`Platform: ${process.platform} (${process.arch})`);
  console.log(`Working Directory: ${rootDir}`);
  console.log(`Binary Resolution: ${execInfo.useNpx ? 'npx -y cline' : execInfo.cmd}`);

  const versionCmd = execInfo.useNpx ? execInfo.cmd : execInfo.cmd;
  const versionArgs = execInfo.useNpx ? [...execInfo.npxArgs, '--version'] : ['--version'];

  const versionResult = spawnSync(versionCmd, versionArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: isWindows,
  });

  if (versionResult.status === 0) {
    console.log(`Cline Version: ${versionResult.stdout.trim()}`);
    console.log('Available Presets:');
    for (const [key, val] of Object.entries(PRESETS)) {
      console.log(`  - ${key.padEnd(15)} : ${val.description}`);
    }
    console.log('Status: READY');
    return 0;
  } else {
    console.error(`Status: FAILED (Exit Code ${versionResult.status})`);
    if (versionResult.error) {
      console.error('Spawn error:', versionResult.error.message);
    }
    if (versionResult.stderr) {
      console.error(versionResult.stderr.trim());
    }
    return 1;
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const execInfo = resolveClineExecutable();

  if (options.checkOnly) {
    process.exit(runCheck(execInfo));
  }

  // Determine effective prompt and options
  let effectivePrompt = options.prompt || process.env.CLINE_PROMPT;
  let effectivePlan = options.plan;
  let effectiveTimeout = options.timeout;

  if (options.preset) {
    const presetConfig = PRESETS[options.preset];
    if (!presetConfig) {
      console.error(`Error: Unknown preset "${options.preset}".`);
      console.error(`Available presets: ${Object.keys(PRESETS).join(', ')}`);
      process.exit(1);
    }
    effectivePrompt = presetConfig.prompt;
    if (options.plan === false && presetConfig.plan) {
      effectivePlan = true;
    }
    if (!effectiveTimeout) {
      effectiveTimeout = presetConfig.timeout;
    }
  }

  if (!effectivePrompt) {
    console.error('Error: No prompt or preset specified.');
    console.error('Usage: node scripts/run-cline-task.mjs [--preset <name>] [--prompt <text>] [options]');
    console.error(`Available presets: ${Object.keys(PRESETS).join(', ')}`);
    process.exit(1);
  }

  // Build CLI arguments
  const cliArgs = [];
  if (execInfo.useNpx) {
    cliArgs.push(...execInfo.npxArgs);
  }

  // CI / Unsupervised flag
  // In CI or when explicitly passed, enable --yolo or --auto-approve
  const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
  if (options.yolo || isCi) {
    cliArgs.push('--yolo');
  }

  if (effectivePlan) {
    cliArgs.push('--plan');
  }

  if (options.json) {
    cliArgs.push('--json');
  }

  if (options.worktree) {
    cliArgs.push('--worktree');
  }

  if (effectiveTimeout) {
    cliArgs.push('--timeout', String(effectiveTimeout));
  }

  if (options.thinking) {
    cliArgs.push('--thinking', options.thinking);
  }

  if (options.provider) {
    cliArgs.push('--provider', options.provider);
  }

  if (options.model) {
    cliArgs.push('--model', options.model);
  }

  // Add working directory
  cliArgs.push('--cwd', rootDir);

  // API Key handling: if ANTHROPIC_API_KEY, CLINE_API_KEY, or OPENAI_API_KEY is provided
  const apiKey =
    process.env.CLINE_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY;
  if (apiKey) {
    cliArgs.push('--key', apiKey);
  }

  // Append any extra args
  if (options.extraArgs.length > 0) {
    cliArgs.push(...options.extraArgs);
  }

  // Append the prompt as the positional argument
  cliArgs.push(effectivePrompt);

  console.log(`[Cline Runner] Starting task...`);
  if (options.preset) {
    console.log(`[Cline Runner] Preset: ${options.preset}`);
  }
  console.log(`[Cline Runner] Mode: ${effectivePlan ? 'plan' : 'act'}${isCi || options.yolo ? ' (unsupervised/yolo)' : ''}`);
  console.log(`[Cline Runner] Working Dir: ${rootDir}`);

  if (options.dryRun) {
    console.log(`[Cline Runner] (Dry-Run) Command: ${execInfo.cmd} ${cliArgs.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`);
    process.exit(0);
  }

  const result = spawnSync(execInfo.cmd, cliArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
  });

  if (result.error) {
    console.error(`[Cline Runner] Execution error:`, result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

main();

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

describe('Cline CLI Automation Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const RUNNER_SCRIPT = path.join(ROOT_DIR, 'scripts', 'run-cline-task.mjs');
  const WORKFLOW_FILE = path.join(ROOT_DIR, '.github', 'workflows', 'cline-automation.yml');
  const PS1_CRON = path.join(ROOT_DIR, 'scripts', 'ops', 'schedule-cline-cron.ps1');
  const SH_CRON = path.join(ROOT_DIR, 'scripts', 'ops', 'cline-cron.sh');

  it('runner script exists and is non-empty', () => {
    expect(fs.existsSync(RUNNER_SCRIPT)).toBe(true);
    const content = fs.readFileSync(RUNNER_SCRIPT, 'utf-8');
    expect(content).toContain('scripts/run-cline-task.mjs');
    expect(content).toContain('PRESETS');
  });

  it('runs --check successfully and detects Cline CLI installation', () => {
    const result = spawnSync(process.execPath, [RUNNER_SCRIPT, '--check'], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      console.error(result.stderr || result.stdout);
    }
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Cline CLI Environment Diagnostic');
    expect(result.stdout).toContain('Status: READY');
  });

  it('supports --dry-run for presets without executing LLM calls', () => {
    const result = spawnSync(process.execPath, [RUNNER_SCRIPT, '--preset', 'audit', '--dry-run'], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      console.error(result.stderr || result.stdout);
    }
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[Cline Runner] (Dry-Run) Command:');
    expect(result.stdout).toContain('Preset: audit');
  });

  it('schedule cron scripts exist for both Windows and Linux', () => {
    expect(fs.existsSync(PS1_CRON), 'schedule-cline-cron.ps1 must exist').toBe(true);
    expect(fs.existsSync(SH_CRON), 'cline-cron.sh must exist').toBe(true);

    const ps1Content = fs.readFileSync(PS1_CRON, 'utf-8');
    expect(ps1Content).toContain('SierraEstates_Cline_');

    const shContent = fs.readFileSync(SH_CRON, 'utf-8');
    expect(shContent).toContain('Sierra Estates Cline Cron');
  });

  it('GitHub Actions workflow cline-automation.yml follows security & concurrency standards', () => {
    expect(fs.existsSync(WORKFLOW_FILE)).toBe(true);
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
    expect(content).toContain('name: Cline CLI automation');
    expect(content).toContain('permissions:');
    expect(content).toContain('contents: read');
    expect(content).toContain('concurrency:');
    expect(content).toContain('cancel-in-progress: false');
    expect(content).toContain('pnpm check:backend');
    expect(content).toContain('pnpm check:legacy-runtime');
    expect(content).toContain('pnpm cline:check');
  });
});

# Cline CLI Automation Guide · Sierra Estates

This guide documents the headless integration of the **Cline CLI** (`cline@3.0.73`) across local development scripts, scheduled cron jobs, and GitHub Actions CI pipelines.

---

## 1. Architecture & Core Principles

Cline CLI acts as an autonomous coding agent operating in terminal, CI, and server environments. In Sierra Estates, it is integrated with strict safety boundaries:

- **§21 No-Fabrication Policy**: Automated runs inspect, audit, and produce real-world reports. They must never fabricate mock database listings or bypass canonical backend validation.
- **Unsupervised Mode**: For CI and headless cron jobs, `--yolo` / `--auto-approve` enables auto-approval of tool invocations within sandboxed boundaries.
- **Timeouts & Mistake Caps**: Every task is bounded by `--timeout <seconds>` (default 300s) and consecutive mistake limits (`--retries 3`).
- **Plan vs. Act**: Destructive or structural checks run in `--plan` mode to produce recommendations before any edits are applied.

---

## 2. Quick Verification

Verify that Cline CLI is installed and configured:

```bash
# Direct CLI check
cline --version

# Sierra Estates environment & presets check
pnpm cline:check
```

Output:

```text
=== Cline CLI Environment Diagnostic ===
Platform: win32 (x64)
Working Directory: H:\Sierra Estates
Binary Resolution: C:\Users\Sierr\AppData\Roaming\npm\cline.cmd
Cline Version: 3.0.73
Available Presets:
  - audit           : Repository integrity & canonical backend verification
  - hygiene         : Repository hygiene, compiled twin detection, and file tracking
  - docs-sync       : Verify and align documentation with active configuration
  - test-eval       : Run root test suites and report regressions
  - security-scan   : Public privacy and environment safety scan
Status: READY
```

---

## 3. Predefined Presets & npm Scripts

The universal runner at [`scripts/run-cline-task.mjs`](file:///h:/Sierra%20Estates/scripts/run-cline-task.mjs) provides built-in presets:

| Preset | Target Command | Purpose |
|---|---|---|
| `audit` | `pnpm cline:audit` | Runs canonical backend policy, legacy runtime boundary, and public env safety checks. |
| `hygiene` | `pnpm cline:hygiene` | Audits untracked artifacts, compiled twin files (`*.js` beside `*.ts`), and temporary files. |
| `docs-sync` | `pnpm cline:docs-sync` | Analyzes documentation files in `docs/` against current codebase reality in `--plan` mode. |
| `test-eval` | `pnpm cline:run --preset test-eval` | Runs `pnpm test:root` and analyzes failures or regressions. |
| `security-scan`| `pnpm cline:run --preset security-scan` | Checks for sensitive credential names and public environment safety. |

### Running Custom Prompts

You can execute any custom headless prompt via the CLI runner:

```bash
# Run with custom instructions
pnpm cline:run --prompt "Audit all Edge functions in supabase/functions/ for missing auth headers"

# Run in plan-only mode (no automated edits)
pnpm cline:run --prompt "Propose a refactor for inventory sync logging" --plan

# Dry-run (inspect generated CLI arguments without executing LLM calls)
pnpm cline:run --preset audit --dry-run
```

---

## 4. Recurring Cron Jobs

### Option A: Windows Task Scheduler (PowerShell)

Use [`scripts/ops/schedule-cline-cron.ps1`](file:///h:/Sierra%20Estates/scripts/ops/schedule-cline-cron.ps1) to register or trigger recurring checks in Windows Task Scheduler:

```powershell
# Register a daily audit at 05:00 Cairo time (default)
powershell -ExecutionPolicy Bypass -File scripts/ops/schedule-cline-cron.ps1 -Preset audit -Time "05:00"

# Register a weekly hygiene check on Sunday
powershell -ExecutionPolicy Bypass -File scripts/ops/schedule-cline-cron.ps1 -Preset hygiene -Time "03:00"

# Register and execute immediately
powershell -ExecutionPolicy Bypass -File scripts/ops/schedule-cline-cron.ps1 -Preset audit -RunNow
```

### Option B: Linux / Container Crontab (Bash)

Use [`scripts/ops/cline-cron.sh`](file:///h:/Sierra%20Estates/scripts/ops/cline-cron.sh) for crontab entries on Linux hosts or VPS instances:

```cron
# Run daily repository audit at 04:00 UTC (06:00 Cairo)
0 4 * * * /bin/bash /opt/sierra-estates/scripts/ops/cline-cron.sh audit >> /var/log/cline-cron.log 2>&1

# Run weekly hygiene scan on Mondays at 03:00 UTC
0 3 * * 1 /bin/bash /opt/sierra-estates/scripts/ops/cline-cron.sh hygiene >> /var/log/cline-cron.log 2>&1
```

All cron executions log structured runs into `.reports/cline/cline_<preset>_<timestamp>.log`.

### Option C: Cline Native Scheduler

Cline CLI includes a native scheduler daemon:

```bash
# Inspect native schedule
cline schedule --help
```

---

## 5. CI/CD Integration (GitHub Actions)

### 1. Dedicated Automation Workflow

[`.github/workflows/cline-automation.yml`](file:///h:/Sierra%20Estates/.github/workflows/cline-automation.yml) provides:

- **Scheduled Runs**: Automatically triggers weekly Monday audits at `05:00 UTC`.
- **Manual Dispatches**: Run any preset or custom prompt on-demand from the GitHub Actions UI.
- **Plan Mode**: Check "Run in plan mode" to generate reviewable summaries without workspace edits.
- **Concurrency & Permissions**: Adheres to repository standards (`contents: read`, `cancel-in-progress: false`).

### 2. Production Agent Fleet Workflow

[`.github/workflows/agent-fleet.yml`](file:///h:/Sierra%20Estates/.github/workflows/agent-fleet.yml) supports Cline tasks alongside existing fleet operations:

```yaml
inputs:
  tasks:
    default: 'briefing:daily,cline:audit'
```

Allowed tasks in the fleet runner:

- `cline:audit`
- `cline:hygiene`
- `cline:docs-sync`
- `cline:check`

---

## 6. Environment & Secret Management

Cline CLI discovers credentials from the following environment variables (configured locally in `.env.local` or in GitHub Actions repository secrets):

| Variable | Provider | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude | Recommended default for high-precision refactoring and analysis |
| `CLINE_API_KEY` | Cline Official API | Alternative direct Cline provider token |
| `OPENAI_API_KEY` | OpenAI GPT-4o | Supported for OpenAI provider models |
| `GEMINI_API_KEY` | Google Gemini | Supported for high-context multimodal reasoning |
| `CLINE_MODEL` | Custom Model ID | e.g. `claude-3-7-sonnet-20250219` |
| `CLINE_PROVIDER` | Provider selection | `anthropic`, `openai`, `gemini`, etc. |

---

## 7. Verification Checklist

Before deploying updates to the automation fleet:

```bash
# 1. Type-check client application
pnpm --filter sierra-estates-client-page type-check

# 2. Run root test suites (including actions & workflows tests and cline-runner tests)
pnpm test:root

# 3. Verify repository hygiene
pnpm check:hygiene
```

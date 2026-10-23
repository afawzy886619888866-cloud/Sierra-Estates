# Two-Host Parallel Outreach — "2 lines here + 2 lines on the other side"

Two runner hosts text the SAME owner inventory sheet simultaneously, from
opposite ends, on different WhatsApp lines. They converge in the middle and
never double-text an owner.

```
                       ┌─────────────────────────┐
                       │  Owner inventory sheet  │
                       │  (207 candidates, gviz) │
                       └───────────┬─────────────┘
              walks rows 1 → …    │    … → row 207 (back→front)
                 TOP half         │        BOTTOM half
        ┌─────────────────────────┴─────────────────────────┐
        │ HOST A — EC2 (systemd)      │ HOST B — Windows    │
        │ WF_HOST_SIDE=top            │ start-sierra.bat    │
        │ lines 1-2 (2 parallel lanes)│ WF_HOST_SIDE=bottom │
        │ runs ALL other workflows too│ lines 3-4 (2 lanes) │
        │ RUNNER_WORKFLOWS unset      │ RUNNER_WORKFLOWS=   │
        │                             │   owner-outreach    │
        └──────────────┬──────────────┴─────────┬───────────┘
                       │    shared OpenWA gateway pool     │
                       │    shared Supabase control rows   │
                       │    shared sheet write-back secret │
```

## Why it is safe

| Risk | Guard |
| --- | --- |
| Double-texting an owner | Direction partition (top host vs bottom host) + sheet contact-date column (تاريخ اخر تواصل) cross-host dedupe + per-host JSONL ledger |
| One line down | Pre-flight keeps only READY lines; a benched line's rows go to the surviving lane / next slot |
| Batch cut mid-send (the old "it stops a lot") | Graceful slot deadline `WF_SLOT_DEADLINE_MS` (23 min) — lanes stop claiming new rows and exit 0 with the checkpoint saved, well before the runner's 25-min kill |
| Slot cap overshoot with parallel lanes | Synchronous ticket reservation — the cap is exact, never overshot |
| Night sends | 10:00–20:00 Cairo gate in the script itself, on BOTH hosts |
| Number ban | Per-LINE pacing stays 45–55 s regardless of how many lines run in parallel |

## Host A — EC2 (TOP side, lines 1-2, full control plane)

`/opt/se/workflows/workflows.env` — add/adjust:

```ini
WF_HOST_SIDE=top
WF_PARALLEL_LINES=2
OPENWA_SESSION_IDS=line-1,line-2      # your real gateway session names
# WF_SLOT_BATCH / WF_SLOT_DEADLINE_MS optional — defaults 30 / 23 min
# RUNNER_WORKFLOWS stays UNSET — this host dispatches everything
```

Then:

```bash
cd /opt/se && git pull
systemctl restart se-workflow-runner
```

## Host B — Windows (BOTTOM side, lines 3-4, outreach only)

1. `git pull` the repo on the Windows box.
2. Make sure `workflows\.env` exists with `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` (the runner is fail-closed without them —
   the scheduler stays idle, nothing dispatches).
3. Double-click **`start-sierra.bat`** at the repo root. It is preconfigured:

   - `WF_HOST_SIDE=bottom`, `WF_PARALLEL_LINES=2`, `OPENWA_SESSION_IDS=line-3,line-4`
   - `RUNNER_WORKFLOWS=owner-outreach` — this host dispatches ONLY outreach
     (sentinel / digest / units-sync keep running on EC2 — nothing
     double-dispatches)
   - gateway at `http://54.89.162.250:2785` (switch to `127.0.0.1:2785` only
     if you run a local gateway on the PC — see the commented block in the bat)

4. Keep the window open (the engine runs in a minimized `cmd` titled
   "Sierra Engine B"). For boot persistence, schedule the bat via Task
   Scheduler → "At startup".

Both hosts fire on the SAME 30-min slot grid (:00 / :30, Cairo 10:00–20:00),
each sending up to `WF_SLOT_BATCH` (default 30) messages per slot —
**60 per 30 minutes combined** with both sides up.

## How the two sides stay out of each other's way

- Host A claims rows `0 → up`, host B claims rows `last → down`. Each host
  has its OWN checkpoint file (`.state/owner-outreach-checkpoint.json`), so
  the two cursors advance independently.
- After EVERY send, the sending host writes today's date into the owner's
  contact-date cell via the Apps Script web app
  (`WF_SHEET_WRITE_URL` / `WF_SHEET_WRITE_SECRET` — configured on both
  hosts). At the START of every slot each host re-reads the sheet and skips
  every row whose contact-date cell is non-empty — that is the cross-host
  dedupe.
- Owners with MULTIPLE listings (43 in the current sheet) are protected by
  the **first-occurrence-wins** rule: only the owner's FIRST sheet row is
  sendable; every later duplicate row is skipped by BOTH hosts, so the two
  sides can never text the same owner through two different rows.
- Each host also **re-syncs the sheet's contact dates every 5 minutes
  mid-slot**, picking up the other host's writes (1–5 min gviz cache lag)
  without waiting for the next slot.
- Known residual edge: in the exact slot where the two cursors meet in the
  middle, a row claimed by both hosts minutes apart can slip past the
  re-sync (the slot's sheet snapshot is minutes old). Worst case ONE owner
  near the middle gets one message from each side — once — then both ledgers
  + the sheet permanently mark them contacted. If even that is unwanted,
  stagger the hosts (host B `RUNNER_POLL_MS=90000`): the slot fires land
  30 s apart.

## Kill switches

| Switch | Effect |
| --- | --- |
| Studio → Owner Outreach → **Pause** (status ≠ active) | Stops AUTOMATIC dispatch on BOTH hosts within one 60 s poll (P0-9 fail-closed contract) |
| `WF_DRY_RUN=1` in the env | Prints would-send lines, touches nothing (sheet, ledger, checkpoint all frozen) |
| Close the "Sierra Engine B" window / `systemctl stop se-workflow-runner` | Stops that host only |
| `WF_SHEET_DEDUPE=0` | DISABLES the cross-host dedupe — re-contact campaigns ONLY |

## Verifying it works

On either host:

```bash
cd workflows
WF_DRY_RUN=1 WF_OUTREACH_ACTIVE_HOURS=0-24 node 09-owner-outreach/outreach.js
```

Dry-run touches nothing and prints which lanes walk which direction, the
cursor positions, and the would-send lines. For the full two-host
simulation see `scripts/verify_two_host.sh` in the agent workspace
(top host + bottom host concurrently, disjoint phone sets).

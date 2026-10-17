#!/usr/bin/env python3
"""Sierra Estates 3.0 — Phase ③ activation driver (repo copy).

Drives POST /api/internal/embeddings/generate on the production deployment
until every ACTIVE listing carries a 768-dim gemini-embedding-001 vector.

Why a driver: the generation route processes one idempotent batch per call
(Vercel function timeout + Hobby single-concurrency), so completing 9,435
active listings means looping ~240-380 authenticated invocations from an
operator machine. This script does exactly that, honestly:

  - adaptive batch sizing (40 -> down on 504/timeout, never up mid-run)
  - honors the route's retryAfterMs — which since 936dcda carries Google's
    REAL quota reset window (e.g. 13h on the free tier's 1000/day wall),
    capped at 300s per sleep so no single slice parks for hours
  - aborts after 5 consecutive non-200s (never spins on a broken deploy)
  - logs per-call progress + a final summary with the true remaining count
  - fully resumable: re-run any time; it resumes from the true pending set

Usage:
  SBR_SECRET_KEY=... python3 scripts/drive-embeddings.py [max_seconds]

  SBR_SECRET_KEY   production shared secret (x-sbr-secret-key header) —
                   the same value the deployment reads; never logged.
  SIERRA_APP_URL   defaults to https://sierra-estates.net

Free-tier reality: embed_content_free_tier_requests allows 1000 requests
per day, shared between ingestion AND query-side vectorization. A full
9,435-row catalog therefore takes ~9 days on the free tier — or minutes
on a paid tier. The route reports the exact reset window either way.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE = (os.environ.get("SIERRA_APP_URL") or "https://sierra-estates.net").rstrip("/")
SBR = os.environ.get("SBR_SECRET_KEY") or ""

MAX_CALLS = 800
WALL_CLOCK_LIMIT_S = 3.6 * 3600
MAX_CONSECUTIVE_ERRORS = 5
BASE_INTER_CALL_DELAY_S = 1.2

# Optional runtime cap (seconds) — lets the driver run in resumable slices
# when the host reaps long-lived background processes.
if len(sys.argv) > 1:
    try:
        WALL_CLOCK_LIMIT_S = float(sys.argv[1])
    except ValueError:
        pass

if not SBR:
    raise SystemExit("SBR_SECRET_KEY is required (x-sbr-secret-key header for /api/internal/*)")


def post_batch(batch: int, timeout_s: float = 110.0):
    body = json.dumps({"batch": batch}).encode()
    req = urllib.request.Request(
        BASE + "/api/internal/embeddings/generate",
        data=body,
        method="POST",
        headers={
            "x-sbr-secret-key": SBR,
            "content-type": "application/json",
            "accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode()[:2000])
        except Exception:
            return e.code, {}
    except Exception as e:
        return None, {"error": str(e)[:200]}


def main():
    batch = 40
    call = 0
    consecutive_errors = 0
    total_processed = 0
    total_failed = 0
    started = time.time()
    deadline = started + WALL_CLOCK_LIMIT_S
    print(f"=== embeddings activation driver -> {BASE} (batch starts at {batch}) ===", flush=True)

    while call < MAX_CALLS and time.time() < deadline:
        call += 1
        status, body = post_batch(batch)

        if status is None or status == 504:
            new_batch = max(15, batch - 10)
            print(f"[{call}] HTTP {status} (function timeout) - batch {batch} -> {new_batch}", flush=True)
            batch = new_batch
            time.sleep(3)
            continue

        if status != 200:
            consecutive_errors += 1
            print(
                f"[{call}] HTTP {status} - {json.dumps(body)[:220]} "
                f"(consecutive errors: {consecutive_errors})",
                flush=True,
            )
            if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                print("ABORT: 5 consecutive non-200 responses - deploy or credentials broken.", flush=True)
                sys.exit(2)
            time.sleep(5)
            continue

        consecutive_errors = 0
        processed = int(body.get("processed", 0))
        failed = int(body.get("failed", 0))
        remaining = int(body.get("remaining", -1))
        total_processed += processed
        total_failed += failed
        elapsed = int(time.time() - started)
        marker = "COMPLETE" if not body.get("hasMore") else "..."
        extra = ""
        if body.get("rateLimited"):
            hours = float(body.get("retryAfterMs", 0)) / 3_600_000.0
            extra = f" rateLimited=true (quota resets in ~{hours:.1f}h per the server)"
        print(
            f"[{call}] {marker} processed={processed} failed={failed} "
            f"remaining={remaining} batch={batch} elapsed={elapsed}s{extra}",
            flush=True,
        )

        if not body.get("hasMore"):
            print(
                f"\n=== DONE in {int(time.time() - started)}s across {call} calls ===\n"
                f"processed this run: {total_processed}\n"
                f"failed this run:     {total_failed}\n"
                f"remaining (server):  {remaining}",
                flush=True,
            )
            sys.exit(0)

        delay = BASE_INTER_CALL_DELAY_S
        if body.get("rateLimited"):
            # Honor the server-stated window, but never park a slice for hours -
            # the wall-clock limit stops this slice honestly and it resumes later.
            delay = min(float(body.get("retryAfterMs", 10000)) / 1000.0, 300.0)
        time.sleep(delay)

    print(
        f"\n=== STOP (limit reached) after {call} calls, {int(time.time() - started)}s ===\n"
        f"processed this run: {total_processed} | failed: {total_failed} | "
        f"re-run this driver to continue - it resumes from the true pending set.",
        flush=True,
    )
    sys.exit(1)


if __name__ == "__main__":
    main()

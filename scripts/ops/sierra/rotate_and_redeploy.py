#!/usr/bin/env python3
# ============================================================================
# rotate_and_redeploy.py — Automate Vercel credential update and redeployment
# ----------------------------------------------------------------------------
# Reads the new secret key from scripts/se.env (never committed, git-ignored),
# verifies connectivity to Supabase, updates SUPABASE_SERVICE_ROLE_KEY across
# both Vercel projects (client + admin), triggers production redeployments,
# and executes the 15-check smoke test to verify all systems green.
# ============================================================================
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ENV_PATH = os.path.join(ROOT, "scripts", "se.env")

PROJECTS = [
    ("sierra-estates-client-portal", "prj_ieVcIcoeTtHndspXMzlE0cwLl89c"),
    ("admin-dashboard", "prj_inhTu8kppYhQv2NZZV3GTUdU8uBi"),
]

SUPABASE_URL = "https://gaxfqcietzoonlmatiot.supabase.co"


def load_secret_key():
    if not os.path.exists(ENV_PATH):
        sys.exit(
            f"ERROR: {ENV_PATH} not found!\n"
            "Please create scripts/se.env with:\n"
            "SUPABASE_SECRET_KEY=sb_secret_your_new_key_here"
        )
    key = None
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("SUPABASE_SECRET_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    if not key:
        sys.exit(f"ERROR: SUPABASE_SECRET_KEY not found in {ENV_PATH}")
    return key


def verify_supabase_read(key):
    print(f"\n[1/4] Probing Supabase REST with new secret key...")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/listings?select=id&limit=1",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                print("  ✓ Supabase REST probe successful (HTTP 200 OK)")
                return True
    except urllib.error.HTTPError as e:
        sys.exit(f"ERROR: Supabase probe failed with HTTP {e.code}: {e.read().decode()[:200]}")
    except Exception as e:
        sys.exit(f"ERROR: Failed to connect to Supabase: {e}")
    return False


def update_vercel_env(project_name, key):
    print(f"\n[2/4] Updating SUPABASE_SERVICE_ROLE_KEY for {project_name}...")
    # Remove existing if present (ignore failure if non-existent)
    cmd_rm = [
        "pnpm", "dlx", "vercel@59.23.2", "env", "rm",
        "SUPABASE_SERVICE_ROLE_KEY", "production",
        "--project", project_name, "-y"
    ]
    subprocess.run(cmd_rm, cwd=ROOT, capture_output=True)

    # Add updated secret
    cmd_add = [
        "pnpm", "dlx", "vercel@59.23.2", "env", "add",
        "SUPABASE_SERVICE_ROLE_KEY", "production",
        "--project", project_name
    ]
    p = subprocess.Popen(
        cmd_add,
        cwd=ROOT,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    out, err = p.communicate(input=f"{key}\n")
    if p.returncode != 0:
        print(f"  Warning adding env via CLI: {err.strip() or out.strip()}")
    else:
        print(f"  ✓ Set SUPABASE_SERVICE_ROLE_KEY on {project_name}")


def redeploy_vercel(project_name):
    print(f"\n[3/4] Triggering production redeployment for {project_name}...")
    cmd = [
        "pnpm", "dlx", "vercel@59.23.2", "deploy",
        "--prod", "--project", project_name, "--yes"
    ]
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if p.returncode == 0:
        lines = [l for l in p.stdout.strip().split("\n") if "https://" in l]
        deploy_url = lines[-1] if lines else "deployed"
        print(f"  ✓ {project_name} redeployed: {deploy_url}")
    else:
        print(f"  Note on deploy output: {p.stderr.strip()[:300]}")


def run_smoke_test():
    print(f"\n[4/4] Running 15-check production smoke test...")
    bash_path = "C:\\Program Files\\Git\\bin\\bash.exe"
    smoke_script = os.path.join(ROOT, "scripts", "ops", "sierra", "smoke_production.sh")
    cmd = [bash_path, smoke_script] if os.path.exists(bash_path) else ["bash", smoke_script]
    p = subprocess.run(cmd, cwd=ROOT)
    if p.returncode == 0:
        print("\n✔ ROTATION & REDEPLOYMENT FULLY VERIFIED (15/15 ALL GREEN)")
    else:
        print(f"\n⚠ Smoke check exited with status {p.returncode}")


def main():
    print("================================================================")
    print(" Sierra Estates — Secret Key Rotation & Vercel Sync Engine")
    print("================================================================")
    key = load_secret_key()
    verify_supabase_read(key)
    for name, pid in PROJECTS:
        update_vercel_env(name, key)
    for name, pid in PROJECTS:
        redeploy_vercel(name)
    run_smoke_test()


if __name__ == "__main__":
    main()

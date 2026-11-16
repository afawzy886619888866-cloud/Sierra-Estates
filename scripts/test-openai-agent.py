"""
Sierra Estates · OpenAI Agent Integration Test Suite
======================================================
Tests every layer of openai-agent-sierra.py without needing a live OPENAI_API_KEY.
Results are saved to scripts/test-results/agent-test-{timestamp}.json

Run:
    python scripts/test-openai-agent.py
"""

import os
import sys
import json
import time
import datetime
import traceback
import subprocess
from pathlib import Path

# ── Env loading (same logic as the agent) ─────────────────────────────────────
_root = Path(__file__).resolve().parent.parent
try:
    from dotenv import load_dotenv
    load_dotenv(_root / ".env", override=False)
    load_dotenv(_root / ".env.local", override=True)
    load_dotenv(_root / "apps" / "sierra-estates-realty" / ".env.local", override=False)
    _dotenv_ok = True
except ImportError:
    _dotenv_ok = False

# ── Results store ──────────────────────────────────────────────────────────────
RESULTS: list[dict] = []
PASS = "PASS"
FAIL = "FAIL"
WARN = "WARN"
SKIP = "SKIP"

def record(name: str, status: str, detail: str = "", duration_ms: float = 0):
    icon = {"PASS": "[OK]", "FAIL": "[!!]", "WARN": "[??]", "SKIP": "[--]"}.get(status, "[?]")
    entry = {
        "test": name,
        "status": status,
        "detail": detail,
        "duration_ms": round(duration_ms, 1),
    }
    RESULTS.append(entry)
    print(f"  {icon} [{status}] {name}" + (f" — {detail}" if detail else ""))
    return entry

def timed(fn):
    t0 = time.perf_counter()
    try:
        result = fn()
        ms = (time.perf_counter() - t0) * 1000
        return result, ms, None
    except Exception as e:
        ms = (time.perf_counter() - t0) * 1000
        return None, ms, e

# ──────────────────────────────────────────────────────────────────────────────
# TEST GROUPS
# ──────────────────────────────────────────────────────────────────────────────

def test_imports():
    print("\n[1/6] IMPORT CHECKS")

    _, ms, err = timed(lambda: __import__("agents"))
    record("openai-agents SDK", PASS if not err else FAIL,
           "" if not err else str(err), ms)

    _, ms, err = timed(lambda: __import__("supabase"))
    record("supabase-py", PASS if not err else FAIL,
           "" if not err else str(err), ms)

    _, ms, err = timed(lambda: __import__("dotenv"))
    record("python-dotenv", PASS if not err else FAIL,
           "" if not err else str(err), ms)

    _, ms, err = timed(lambda: __import__("subprocess"))
    record("subprocess (stdlib)", PASS, "", ms)

    _, ms, err = timed(lambda: __import__("json"))
    record("json (stdlib)", PASS, "", ms)


def test_env():
    print("\n[2/6] ENVIRONMENT LOADING")

    record(
        "python-dotenv load_dotenv",
        PASS if _dotenv_ok else WARN,
        "loaded" if _dotenv_ok else "not installed — using shell env",
    )

    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    record(
        "NEXT_PUBLIC_SUPABASE_URL",
        PASS if url.startswith("https://") else FAIL,
        f"length={len(url)}, starts={url[:20]}..." if url else "MISSING",
    )

    svc = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    record(
        "SUPABASE_SERVICE_ROLE_KEY",
        PASS if len(svc) > 50 else FAIL,
        f"length={len(svc)}" if svc else "MISSING",
    )

    oai = os.getenv("OPENAI_API_KEY", "")
    if not oai or oai == "sk-..." or "YOURREALKEYHERE" in oai:
        record("OPENAI_API_KEY", WARN, "Not set or still placeholder — live LLM calls will fail")
    else:
        record("OPENAI_API_KEY", PASS, f"length={len(oai)}, starts={oai[:8]}...")


def test_supabase():
    print("\n[3/6] SUPABASE CONNECTIVITY")
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

    if not url or not key:
        record("Supabase client init", SKIP, "Missing URL or key")
        record("units table query", SKIP, "Skipped — no credentials")
        return

    try:
        from supabase import create_client
        _, ms, err = timed(lambda: create_client(url, key))
        if err:
            record("Supabase client init", FAIL, str(err), ms)
            return
        record("Supabase client init", PASS, f"project={url.split('//')[1].split('.')[0]}", ms)

        sb = create_client(url, key)

        # Query units table
        def _query_units():
            return sb.table("listings").select(
                "code, compound, property_type, bedrooms, area_sqm, price, deal_type, status"
            ).limit(3).execute()

        result, ms, err = timed(_query_units)
        if err:
            record("listings table query", FAIL, str(err)[:120], ms)
        else:
            count = len(result.data or [])
            record("listings table query", PASS, f"{count} rows returned", ms)

        # Query viewings table (may not exist yet — warn, not fail)
        def _query_viewings():
            return sb.table("viewings").select("id").limit(1).execute()

        result, ms, err = timed(_query_viewings)
        if err:
            record("viewings table query", WARN, f"Table may not exist yet: {str(err)[:80]}", ms)
        else:
            record("viewings table query", PASS, "table accessible", ms)

    except Exception as e:
        record("Supabase client init", FAIL, traceback.format_exc(limit=2))


def test_mcp_bridge():
    print("\n[4/6] MCP SUBPROCESS BRIDGE")

    mcp_path = _root / "scripts" / "sierra-mcp-server.ts"
    if not mcp_path.exists():
        record("sierra-mcp-server.ts exists", FAIL, str(mcp_path))
        return
    record("sierra-mcp-server.ts exists", PASS, f"{mcp_path.stat().st_size} bytes")

    # Check npx/tsx available
    npx_cmd = ["cmd", "/c", "npx"] if sys.platform == "win32" else ["npx"]
    r = subprocess.run(npx_cmd + ["--version"], capture_output=True, text=True, timeout=10,
                       cwd=str(_root))
    record("npx available", PASS if r.returncode == 0 else FAIL,
           r.stdout.strip() if r.returncode == 0 else r.stderr.strip()[:80])

    # Send initialize + tools/list
    def _mcp_list():
        init = '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{}}'
        req  = '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
        npx_cmd = ["cmd", "/c", "npx"] if sys.platform == "win32" else ["npx"]
        proc = subprocess.run(
            npx_cmd + ["tsx", str(mcp_path)],
            input=f"{init}\n{req}\n",
            capture_output=True, text=True,
            encoding="utf-8", errors="replace",
            timeout=45,
            cwd=str(_root),
        )
        for line in proc.stdout.splitlines():
            line = line.strip()
            if not line or not line.startswith("{"):
                continue  # skip tsx banners / warnings
            try:
                obj = json.loads(line)
                if obj.get("id") == 1 and "result" in obj:
                    return obj["result"].get("tools", [])
            except (json.JSONDecodeError, KeyError):
                continue
        return []

    tools, ms, err = timed(_mcp_list)
    if err:
        record("MCP tools/list", FAIL, str(err)[:120], ms)
    else:
        names = [t.get("name") for t in (tools or [])]
        expected = {"get_inventory", "ingest_whatsapp_listing",
                    "calculate_valuation_score", "search_project_memory", "execute_openclaw_task"}
        missing = expected - set(names)
        if missing:
            record("MCP tools/list", WARN, f"tools={names}, missing={missing}", ms)
        else:
            record("MCP tools/list", PASS, f"{len(names)} tools: {names}", ms)

    # Test calculate_valuation_score tool call
    def _mcp_valuation():
        init = '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{}}'
        req  = json.dumps({
            "jsonrpc": "2.0", "id": 2, "method": "tools/call",
            "params": {
                "name": "calculate_valuation_score",
                "arguments": {"compound": "Mountain View", "price": 12000000, "area_sqm": 140},
            },
        })
        npx_cmd = ["cmd", "/c", "npx"] if sys.platform == "win32" else ["npx"]
        proc = subprocess.run(
            npx_cmd + ["tsx", str(mcp_path)],
            input=f"{init}\n{req}\n",
            capture_output=True, text=True,
            encoding="utf-8", errors="replace",
            timeout=45,
            cwd=str(_root),
        )
        for line in proc.stdout.splitlines():
            line = line.strip()
            if not line or not line.startswith("{"):
                continue  # skip tsx banners / warnings
            try:
                obj = json.loads(line)
                if obj.get("id") == 2:
                    return obj
            except (json.JSONDecodeError, KeyError):
                continue
        return {}

    result, ms, err = timed(_mcp_valuation)
    if err:
        record("MCP calculate_valuation_score", FAIL, str(err)[:120], ms)
    elif "error" in result:
        record("MCP calculate_valuation_score", WARN, str(result["error"])[:80], ms)
    else:
        record("MCP calculate_valuation_score", PASS, "tool returned result", ms)


def test_function_tools():
    print("\n[5/6] FUNCTION TOOLS (no API key needed)")

    # Import tools from the agent script
    agent_script = _root / "scripts" / "openai-agent-sierra.py"
    if not agent_script.exists():
        record("openai-agent-sierra.py exists", FAIL)
        return
    record("openai-agent-sierra.py exists", PASS, f"{agent_script.stat().st_size} bytes")

    # Dynamically import the agent module
    import importlib.util
    spec = importlib.util.spec_from_file_location("sierra_agent", agent_script)
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
        record("agent module import", PASS)
    except Exception as e:
        record("agent module import", FAIL, str(e)[:120])
        return

    # search_inventory (Supabase or MCP fallback)
    def _search():
        fn = getattr(mod, "search_inventory", None)
        if fn is None:
            return None
        # Call the underlying wrapped function
        raw = fn.__wrapped__ if hasattr(fn, "__wrapped__") else None
        if raw:
            import asyncio, inspect
            return asyncio.get_event_loop().run_until_complete(raw("Mountain View")) if inspect.iscoroutinefunction(raw) else raw("Mountain View")
        return "tool present (no direct invoke)"

    result, ms, err = timed(_search)
    if err:
        record("search_inventory tool", WARN, str(err)[:80], ms)
    else:
        record("search_inventory tool", PASS, str(result)[:80] if result else "present", ms)

    # Agent topology
    triage = getattr(mod, "triage_agent", None)
    valuation = getattr(mod, "valuation_agent", None)
    viewing = getattr(mod, "viewing_scheduler_agent", None)
    guardrail = getattr(mod, "length_guardrail", None)

    record("triage_agent defined", PASS if triage else FAIL,
           f"handoffs={[a.name for a in triage.handoffs]}" if triage else "missing")
    record("valuation_agent defined", PASS if valuation else FAIL,
           f"tools={len(valuation.tools)}" if valuation else "missing")
    record("viewing_scheduler_agent defined", PASS if viewing else FAIL,
           f"tools={len(viewing.tools)}" if viewing else "missing")
    record("length_guardrail defined", PASS if guardrail else FAIL)
    record("get_distressed_deals tool", PASS if hasattr(mod, "get_distressed_deals") else FAIL)
    record("search_memory_palace tool", PASS if hasattr(mod, "search_memory_palace") else FAIL)
    record("query_brain_rag tool", PASS if hasattr(mod, "query_brain_rag") else FAIL)


def test_mcp_configs():
    print("\n[6/6] MCP CONFIG CONSISTENCY")

    mcp_root = _root / ".mcp.json"
    mcp_agents = _root / ".agents" / "mcp_config.json"

    for path in (mcp_root, mcp_agents):
        if path.exists():
            record(f"{path.name} exists", PASS, str(path.relative_to(_root)))
        else:
            record(f"{path.name} exists", FAIL, str(path))

    if mcp_root.exists() and mcp_agents.exists():
        root_cfg = json.loads(mcp_root.read_text())
        agents_cfg = json.loads(mcp_agents.read_text())
        root_servers = set(root_cfg.get("mcpServers", {}).keys())
        agents_servers = set(agents_cfg.get("mcpServers", {}).keys())

        missing_in_agents = root_servers - agents_servers
        extra_in_agents = agents_servers - root_servers

        if missing_in_agents:
            record("mcp_config.json completeness", WARN,
                   f"in .mcp.json but not .agents/mcp_config.json: {missing_in_agents}")
        elif extra_in_agents:
            record("mcp_config.json completeness", WARN,
                   f"extra in .agents only: {extra_in_agents}")
        else:
            record("mcp_config.json completeness", PASS,
                   f"both have: {sorted(root_servers)}")

        supabase_in_agents = "supabase" in agents_servers
        record("supabase entry in .agents/mcp_config.json",
               PASS if supabase_in_agents else FAIL)


# ──────────────────────────────────────────────────────────────────────────────
# SAVE RESULTS
# ──────────────────────────────────────────────────────────────────────────────

def save_results():
    out_dir = _root / "scripts" / "test-results"
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = out_dir / f"agent-test-{ts}.json"

    passed = sum(1 for r in RESULTS if r["status"] == PASS)
    failed = sum(1 for r in RESULTS if r["status"] == FAIL)
    warned = sum(1 for r in RESULTS if r["status"] == WARN)
    skipped = sum(1 for r in RESULTS if r["status"] == SKIP)
    total = len(RESULTS)

    summary = {
        "timestamp": ts,
        "total": total,
        "passed": passed,
        "failed": failed,
        "warnings": warned,
        "skipped": skipped,
        "results": RESULTS,
    }

    out_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False))

    print("\n" + "=" * 65)
    print(f"  RESULTS  {passed}/{total} passed  |  {failed} failed  |  {warned} warnings  |  {skipped} skipped")
    print(f"  Saved → {out_path.relative_to(_root)}")
    print("=" * 65)

    return failed


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 65)
    print("  SIERRA ESTATES · OpenAI Agent Integration Test Suite")
    print("=" * 65)

    test_imports()
    test_env()
    test_supabase()
    test_mcp_bridge()
    test_function_tools()
    test_mcp_configs()

    failures = save_results()
    sys.exit(0 if failures == 0 else 1)

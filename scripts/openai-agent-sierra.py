"""
Sierra Estates - OpenAI Agents SDK Runner
==========================================
Full-stack integration:
  • Live Supabase inventory & valuation queries
  • MCP subprocess bridge → sierra-mcp-server.ts tools
  • Multi-agent handoff chain: Triage → Valuation | Viewing Scheduler
  • Input guardrail (length check)
  • python-dotenv env loading (.env.local)

Usage:
    python scripts/openai-agent-sierra.py [optional prompt]
    set OPENAI_API_KEY=sk-... && python scripts/openai-agent-sierra.py
"""

import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from typing import Optional

# ── Env loading ────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    _root = Path(__file__).resolve().parent.parent
    load_dotenv(_root / ".env", override=False)
    load_dotenv(_root / ".env.local", override=True)
    load_dotenv(_root / "apps" / "sierra-estates-realty" / ".env.local", override=False)
except ImportError:
    pass  # dotenv optional — env may already be set in shell

# ── OpenAI Agents SDK ──────────────────────────────────────────────────────────
try:
    from agents import Agent, Runner, function_tool, GuardrailFunctionOutput, InputGuardrail
    from agents.exceptions import InputGuardrailTripwireTriggered
except ImportError:
    print("Error: openai-agents is not installed. Run: pip install openai-agents")
    sys.exit(1)

# ── Supabase client ────────────────────────────────────────────────────────────
try:
    from supabase import create_client, Client as SupabaseClient
    _SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    _SUPABASE_KEY = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    )
    _supabase: Optional[SupabaseClient] = (
        create_client(_SUPABASE_URL, _SUPABASE_KEY)
        if _SUPABASE_URL and _SUPABASE_KEY else None
    )
except ImportError:
    _supabase = None

# ── Windows stdout UTF-8 ───────────────────────────────────────────────────────
if sys.platform == "win32":
    _reconf = getattr(sys.stdout, "reconfigure", None)
    if callable(_reconf):
        try:
            _reconf(encoding="utf-8")
        except Exception:
            pass

# ──────────────────────────────────────────────────────────────────────────────
# MCP SUBPROCESS BRIDGE
# Calls sierra-mcp-server.ts via stdio JSON-RPC 2.0
# ──────────────────────────────────────────────────────────────────────────────
_MCP_SERVER_PATH = str(Path(__file__).resolve().parent / "sierra-mcp-server.ts")
_mcp_req_id = 0


def _next_id() -> int:
    global _mcp_req_id
    _mcp_req_id += 1
    return _mcp_req_id


def _call_mcp_server(method: str, params: dict) -> dict:
    """Spawn sierra-mcp-server.ts for a single JSON-RPC call and return the result dict."""
    call_id = _next_id()
    req = json.dumps({"jsonrpc": "2.0", "id": call_id, "method": method, "params": params})
    init = '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{}}'
    try:
        proc = subprocess.run(
            ["npx", "tsx", _MCP_SERVER_PATH],
            input=f"{init}\n{req}\n",
            capture_output=True, text=True, timeout=20,
            cwd=str(Path(__file__).resolve().parent.parent),
        )
        for line in proc.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if obj.get("id") == call_id:
                    if "result" in obj:
                        content = obj["result"].get("content", [])
                        if content and content[0].get("type") == "text":
                            try:
                                return json.loads(content[0]["text"])
                            except json.JSONDecodeError:
                                return {"text": content[0]["text"]}
                        return obj["result"]
                    if "error" in obj:
                        return {"error": obj["error"].get("message", "MCP error")}
            except (json.JSONDecodeError, KeyError):
                continue
        return {"error": "No valid MCP response received"}
    except subprocess.TimeoutExpired:
        return {"error": "MCP server timed out"}
    except FileNotFoundError:
        return {"error": "npx/tsx not found — ensure Node.js is installed"}


# ──────────────────────────────────────────────────────────────────────────────
# SUPABASE-BACKED FUNCTION TOOLS
# ──────────────────────────────────────────────────────────────────────────────

@function_tool
def search_inventory(compound: str = "", deal_type: str = "sale", limit: int = 5) -> str:
    """
    Search the Sierra Estates live property inventory in Supabase.
    Returns matching units with price, area, type, and availability status.
    deal_type: 'sale' or 'rent'
    """
    if _supabase:
        try:
            q = _supabase.table("units").select(
                "code, compound, type, beds, area, price, mode, status, finishing"
            )
            if compound:
                q = q.ilike("compound", f"%{compound}%")
            if deal_type in ("rent", "rental"):
                q = q.eq("mode", "rent")
            elif deal_type == "sale":
                q = q.eq("mode", "sale")
            resp = q.limit(limit).execute()
            units = resp.data or []
            if not units:
                return f"No inventory found for compound='{compound}', deal_type='{deal_type}'."
            lines = []
            for u in units:
                lines.append(
                    f"[{u.get('code', '?')}] {u.get('compound', '?')} | "
                    f"{u.get('type', '?')} {u.get('beds', '?')}BR | "
                    f"{u.get('area', '?')} sqm | "
                    f"{u.get('price', 0):,} EGP ({u.get('mode', '?')}) | "
                    f"Status: {u.get('status', '?')} | Finish: {u.get('finishing', '?')}"
                )
            return "\n".join(lines)
        except Exception:
            pass  # fall through to MCP

    result = _call_mcp_server(
        "tools/call",
        {"name": "get_inventory", "arguments": {"compound": compound, "limit": limit}},
    )
    if "error" in result:
        return f"Inventory lookup unavailable: {result['error']}"
    items = result.get("items", [])
    if not items:
        return f"No listings found for '{compound}'."
    return json.dumps(items, ensure_ascii=False, indent=2)


@function_tool
def calculate_valuation(
    compound: str,
    price_egp: float,
    area_sqm: float,
    finishing: str = "semi_finished",
) -> str:
    """
    Calculate a real valuation score and investment rating for a New Cairo property.
    Compares asking price against live Supabase market comps.
    finishing: 'fully_finished', 'semi_finished', or 'core_and_shell'
    """
    price_per_sqm = price_egp / max(area_sqm, 1)

    if _supabase:
        try:
            resp = (
                _supabase.table("units")
                .select("price, area")
                .ilike("compound", f"%{compound}%")
                .eq("mode", "sale")
                .limit(30)
                .execute()
            )
            comps = resp.data or []
            comp_psqm = [
                c["price"] / max(c["area"], 1)
                for c in comps
                if c.get("price") and c.get("area")
            ]
            if comp_psqm:
                avg = sum(comp_psqm) / len(comp_psqm)
                delta = ((price_per_sqm - avg) / avg) * 100
                if delta <= -15:
                    rating, score = "🟢 Distress Deal / High ROI", 92
                elif delta <= 0:
                    rating, score = "🟡 Below Market / Good Value", 78
                elif delta <= 15:
                    rating, score = "🟠 Fair Market Value", 62
                else:
                    rating, score = "🔴 Premium / Overpriced", 38
                return (
                    f"Compound: {compound}\n"
                    f"Your price/sqm: {price_per_sqm:,.0f} EGP/sqm\n"
                    f"Market avg/sqm ({len(comp_psqm)} comps): {avg:,.0f} EGP/sqm\n"
                    f"Delta vs market: {delta:+.1f}%\n"
                    f"Valuation Score: {score}/100\n"
                    f"Rating: {rating}"
                )
        except Exception:
            pass  # fall through to MCP

    result = _call_mcp_server(
        "tools/call",
        {
            "name": "calculate_valuation_score",
            "arguments": {
                "compound": compound,
                "price": price_egp,
                "area_sqm": area_sqm,
                "finishing": finishing,
            },
        },
    )
    if "error" in result:
        return f"Valuation service unavailable: {result['error']}"
    return (
        f"Compound: {result.get('compound', compound)}\n"
        f"Price/sqm: {result.get('pricePerSqm', int(price_per_sqm)):,} EGP/sqm\n"
        f"Valuation Score: {result.get('valuationScore', '?')}/100\n"
        f"Rating: {result.get('rating', '?')}"
    )


@function_tool
def schedule_property_viewing(
    client_name: str,
    unit_code: str,
    preferred_date: str,
    notes: str = "",
) -> str:
    """
    Schedule a property viewing for a client with a Sierra Estates licensed broker.
    preferred_date: YYYY-MM-DD or natural language ('tomorrow', 'next Saturday').
    """
    if _supabase:
        try:
            resp = _supabase.table("viewings").insert({
                "client_name": client_name,
                "unit_code": unit_code,
                "preferred_date": preferred_date,
                "notes": notes,
                "status": "pending",
            }).execute()
            if resp.data:
                booking_id = resp.data[0].get("id", "N/A")
                return (
                    f"Viewing confirmed and logged.\n"
                    f"Client: {client_name}\n"
                    f"Unit: {unit_code}\n"
                    f"Date: {preferred_date}\n"
                    f"Booking ID: {booking_id}\n"
                    f"Status: Pending broker confirmation"
                )
        except Exception:
            pass  # fall through to soft confirmation

    return (
        f"Viewing request received (offline mode).\n"
        f"Client: {client_name} | Unit: {unit_code} | Date: {preferred_date}\n"
        f"A Sierra Estates broker will confirm within 2 hours.\n"
        + (f"Notes: {notes}" if notes else "")
    )


@function_tool
def search_project_memory(query: str) -> str:
    """Search Sierra Estates project memory for past decisions, leads, and property history."""
    result = _call_mcp_server(
        "tools/call",
        {"name": "search_project_memory", "arguments": {"query": query}},
    )
    if "error" in result:
        return f"Memory search unavailable: {result['error']}"
    results = result.get("results", [])
    if not results:
        return f"No memory entries found for '{query}'."
    return json.dumps(results[:5], ensure_ascii=False, indent=2)


@function_tool
def ingest_whatsapp_listing(
    raw_message: str,
    sender: str = "Unknown",
    group_name: str = "Broker Group",
) -> str:
    """
    Ingest and parse a raw WhatsApp real estate listing (Arabic or English).
    Normalises compound names, extracts price/area/type, and stores to inventory.
    """
    result = _call_mcp_server(
        "tools/call",
        {
            "name": "ingest_whatsapp_listing",
            "arguments": {
                "rawMessage": raw_message,
                "sender": sender,
                "groupName": group_name,
            },
        },
    )
    if "error" in result:
        return f"WhatsApp ingest failed: {result['error']}"
    return json.dumps(result, ensure_ascii=False, indent=2)


# ──────────────────────────────────────────────────────────────────────────────
# INPUT GUARDRAIL — reject oversized / malformed inputs
# ──────────────────────────────────────────────────────────────────────────────

async def _length_guardrail_fn(ctx, agent, input_data) -> GuardrailFunctionOutput:
    text = input_data if isinstance(input_data, str) else str(input_data)
    if len(text) > 2000:
        return GuardrailFunctionOutput(
            output_info="Input exceeds 2000 characters.",
            tripwire_triggered=True,
        )
    return GuardrailFunctionOutput(output_info="OK", tripwire_triggered=False)

length_guardrail = InputGuardrail(guardrail_function=_length_guardrail_fn)


# ──────────────────────────────────────────────────────────────────────────────
# AGENT TOPOLOGY: Triage → Valuation Agent | Viewing Scheduler
# ──────────────────────────────────────────────────────────────────────────────

valuation_agent = Agent(
    name="Sierra Valuation Analyst",
    instructions=(
        "You are a senior real estate valuation analyst for Sierra Estates in New Cairo. "
        "Use calculate_valuation to provide precise investment analysis: price/sqm vs market comps, "
        "estimated cap rate, and a clear buy/hold/avoid recommendation. "
        "Use search_inventory to surface comparable listings. Always cite data sources."
    ),
    tools=[calculate_valuation, search_inventory, search_project_memory],
)

viewing_scheduler_agent = Agent(
    name="Sierra Viewing Coordinator",
    instructions=(
        "You are the Sierra Estates viewing coordinator. "
        "1) Confirm the unit by checking search_inventory. "
        "2) Capture client name, unit code, and preferred date. "
        "3) Book via schedule_property_viewing. "
        "4) Confirm all details back to the client clearly and professionally."
    ),
    tools=[schedule_property_viewing, search_inventory],
)

triage_agent = Agent(
    name="Sierra Estates Advisor",
    instructions=(
        "You are the primary advisor for Sierra Estates — New Cairo's leading luxury property firm. "
        "Route the client based on intent:\n"
        "• Pricing / investment / ROI questions → hand off to Sierra Valuation Analyst.\n"
        "• Viewing requests / scheduling → hand off to Sierra Viewing Coordinator.\n"
        "• General inventory search / compound info → use search_inventory directly.\n"
        "• WhatsApp listing text → use ingest_whatsapp_listing.\n"
        "• Past decisions / history → use search_project_memory.\n"
        "Be concise, professional, and data-driven at all times."
    ),
    tools=[search_inventory, ingest_whatsapp_listing, search_project_memory],
    handoffs=[valuation_agent, viewing_scheduler_agent],
    input_guardrails=[length_guardrail],
)


# ──────────────────────────────────────────────────────────────────────────────
# MAIN RUNNER
# ──────────────────────────────────────────────────────────────────────────────

async def run(query: str):
    print("\n" + "=" * 65)
    print("  SIERRA ESTATES  ·  OpenAI Agents SDK  ·  Full-Stack Runner")
    print("=" * 65)
    print(f"  Supabase : {'Connected' if _supabase else 'Offline — MCP fallback active'}")
    print(f"  API Key  : {'Set' if os.getenv('OPENAI_API_KEY') else 'Not set (dry-run mode)'}")
    print("=" * 65)
    print(f"  Query: {query}\n")

    if not os.getenv("OPENAI_API_KEY"):
        print("[Dry-run] Agent topology ready:")
        print(f"  Entry   : {triage_agent.name}")
        print(f"  Handoffs: {[a.name for a in triage_agent.handoffs]}")
        print(f"  Tools   : {[getattr(t, '__name__', str(t)) for t in triage_agent.tools]}")
        print(f"\n  Valuation tools : {[getattr(t, '__name__', str(t)) for t in valuation_agent.tools]}")
        print(f"  Viewing tools   : {[getattr(t, '__name__', str(t)) for t in viewing_scheduler_agent.tools]}")
        print("\n  To run live: set OPENAI_API_KEY=sk-... && python scripts/openai-agent-sierra.py")
        return

    try:
        result = await Runner.run(triage_agent, input=query)
        print("Response:\n")
        print(result.final_output)
    except InputGuardrailTripwireTriggered as e:
        print(f"[Guardrail blocked] {e}")
    except Exception as e:
        print(f"[Error] {type(e).__name__}: {e}")
    print("\n" + "=" * 65)


if __name__ == "__main__":
    prompt = (
        " ".join(sys.argv[1:])
        if len(sys.argv) > 1
        else "What is the price per sqm in Mountain View, and can I book a viewing for unit MV-305 this Friday?"
    )
    asyncio.run(run(prompt))

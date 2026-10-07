#!/usr/bin/env python3
"""Minimal stdlib-only MCP stdio bridge for the Amphion Command Deck REST API.

No third-party deps (the `mcp` SDK is not installed and GUARDRAILS.md forbids
unprompted package-manager use), so this hand-rolls the JSON-RPC 2.0 / stdio
transport: one JSON object per line on stdin, one JSON object per line on
stdout. Every MCP tool call is forwarded to the local Command Deck REST API
resolved from .amphion/config.json.
"""

import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / ".amphion" / "config.json"


def _base_url() -> str:
    try:
        cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        port = cfg.get("port", "8888")
    except (OSError, json.JSONDecodeError):
        port = "8888"
    return f"http://127.0.0.1:{port}"


def _request(method: str, path: str, payload: dict | None = None) -> dict:
    url = _base_url() + path
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            return {"status": resp.status, "body": json.loads(body) if body else {}}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return {"status": e.code, "body": json.loads(body) if body else {"error": str(e)}}
    except urllib.error.URLError as e:
        return {"status": 0, "body": {"error": f"Command Deck unreachable: {e.reason}"}}


TOOLS = [
    {
        "name": "read_state",
        "description": "Read full Command Deck board state (boards, lists, milestones, cards, charts).",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "find",
        "description": "Search the board map. Optional filters: q, milestoneId, list, boardId.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "q": {"type": "string"},
                "milestoneId": {"type": "string"},
                "list": {"type": "string"},
                "boardId": {"type": "string"},
            },
        },
    },
    {
        "name": "create_milestone",
        "description": "Create a milestone on a board.",
        "inputSchema": {
            "type": "object",
            "required": ["boardId", "title", "code"],
            "properties": {
                "boardId": {"type": "string"},
                "title": {"type": "string"},
                "code": {"type": "string"},
            },
        },
    },
    {
        "name": "create_card",
        "description": "Create a contract card on a milestone/list.",
        "inputSchema": {
            "type": "object",
            "required": ["boardId", "milestoneId", "listId", "title"],
            "properties": {
                "boardId": {"type": "string"},
                "milestoneId": {"type": "string"},
                "listId": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "acceptance": {"type": "string"},
                "priority": {"type": "string"},
                "kind": {"type": "string"},
            },
        },
    },
    {
        "name": "update_card",
        "description": "Update a card by id.",
        "inputSchema": {
            "type": "object",
            "required": ["id", "boardId"],
            "properties": {
                "id": {"type": "string"},
                "boardId": {"type": "string"},
                "listId": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "acceptance": {"type": "string"},
                "priority": {"type": "string"},
                "kind": {"type": "string"},
            },
        },
    },
    {
        "name": "move_card",
        "description": "Move a card to a different list.",
        "inputSchema": {
            "type": "object",
            "required": ["id", "listId"],
            "properties": {"id": {"type": "string"}, "listId": {"type": "string"}},
        },
    },
    {
        "name": "delete_card",
        "description": "Delete a card by id.",
        "inputSchema": {
            "type": "object",
            "required": ["id"],
            "properties": {"id": {"type": "string"}},
        },
    },
    {
        "name": "write_findings",
        "description": "Write a canonical findings artifact to a milestone (EVALUATE/CONTRACT phase).",
        "inputSchema": {
            "type": "object",
            "required": ["milestoneId", "boardId", "title", "summary", "body"],
            "properties": {
                "milestoneId": {"type": "string"},
                "boardId": {"type": "string"},
                "title": {"type": "string"},
                "summary": {"type": "string"},
                "body": {"type": "string"},
            },
        },
    },
    {
        "name": "write_outcomes",
        "description": "Write a canonical outcomes artifact to a milestone (CLOSEOUT phase).",
        "inputSchema": {
            "type": "object",
            "required": ["milestoneId", "boardId", "title", "summary", "body"],
            "properties": {
                "milestoneId": {"type": "string"},
                "boardId": {"type": "string"},
                "title": {"type": "string"},
                "summary": {"type": "string"},
                "body": {"type": "string"},
            },
        },
    },
    {
        "name": "write_memory",
        "description": "Upsert a memory event (Command Deck DB-backed memory).",
        "inputSchema": {
            "type": "object",
            "required": ["memoryKey", "value", "sourceType"],
            "properties": {
                "memoryKey": {"type": "string"},
                "value": {},
                "sourceType": {"type": "string"},
                "eventType": {"type": "string"},
                "bucket": {"type": "string"},
                "ttlSeconds": {"type": "integer"},
            },
        },
    },
    {
        "name": "query_memory",
        "description": "Query Command Deck memory by key prefix.",
        "inputSchema": {
            "type": "object",
            "required": ["q"],
            "properties": {"q": {"type": "string"}},
        },
    },
]


def _call_tool(name: str, args: dict) -> dict:
    if name == "read_state":
        return _request("GET", "/api/state")
    if name == "find":
        qs = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in args.items() if v)  # type: ignore[name-defined]
        return _request("GET", f"/api/find?{qs}")
    if name == "create_milestone":
        return _request("POST", "/api/milestones", args)
    if name == "create_card":
        return _request("POST", "/api/cards", args)
    if name == "update_card":
        card_id = args.pop("id")
        return _request("PATCH", f"/api/cards/{card_id}", args)
    if name == "move_card":
        card_id = args["id"]
        return _request("POST", f"/api/cards/{card_id}/move", {"listId": args["listId"]})
    if name == "delete_card":
        return _request("DELETE", f"/api/cards/{args['id']}")
    if name == "write_findings":
        ms_id = args.pop("milestoneId")
        args["artifactType"] = "findings"
        return _request("POST", f"/api/milestones/{ms_id}/artifacts", args)
    if name == "write_outcomes":
        ms_id = args.pop("milestoneId")
        args["artifactType"] = "outcomes"
        return _request("POST", f"/api/milestones/{ms_id}/artifacts", args)
    if name == "write_memory":
        args.setdefault("eventType", "upsert")
        return _request("POST", "/api/memory/events", args)
    if name == "query_memory":
        return _request("GET", f"/api/memory/query?q={urllib.parse.quote(args['q'])}")  # type: ignore[name-defined]
    return {"status": 400, "body": {"error": f"unknown tool: {name}"}}


import urllib.parse  # noqa: E402  (used by _call_tool above)


def _send(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def _handle(msg: dict) -> None:
    msg_id = msg.get("id")
    method = msg.get("method")
    params = msg.get("params") or {}

    if method == "initialize":
        _send({
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "amphion-command-deck", "version": "1.0.0"},
            },
        })
        return

    if method == "notifications/initialized":
        return  # no response for notifications

    if method == "tools/list":
        _send({"jsonrpc": "2.0", "id": msg_id, "result": {"tools": TOOLS}})
        return

    if method == "tools/call":
        name = params.get("name", "")
        args = dict(params.get("arguments") or {})
        result = _call_tool(name, args)
        is_error = result["status"] == 0 or result["status"] >= 400
        _send({
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "content": [{"type": "text", "text": json.dumps(result["body"])}],
                "isError": is_error,
            },
        })
        return

    if msg_id is not None:
        _send({
            "jsonrpc": "2.0",
            "id": msg_id,
            "error": {"code": -32601, "message": f"method not found: {method}"},
        })


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue
        try:
            _handle(msg)
        except Exception as exc:  # keep the bridge alive on a single bad call
            _send({
                "jsonrpc": "2.0",
                "id": msg.get("id"),
                "error": {"code": -32000, "message": str(exc)},
            })


if __name__ == "__main__":
    main()

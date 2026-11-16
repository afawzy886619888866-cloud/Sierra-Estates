#!/usr/bin/env python3
"""
sierra_pc_heartbeat.py — keeps the website's WhatsApp status honest.

POSTs a heartbeat to https://sierra-estates.net/api/whatsapp/heartbeat every
60 seconds while the PC gateway is running. This replaces the pulse that the
retired EC2 box used to send. When the PC is off, the pulse goes stale and the
website correctly reports the WhatsApp lane as offline.

Stdlib only. Started automatically by sierra-gateway.ps1 (action: start).
"""
import json
import sys
import time
import urllib.request

HEARTBEAT_URL = "https://sierra-estates.net/api/whatsapp/heartbeat"
INTERVAL_SEC = 60


def pulse():
    body = json.dumps({"status": "alive", "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}).encode()
    req = urllib.request.Request(
        HEARTBEAT_URL,
        data=body,
        headers={"content-type": "application/json", "user-agent": "sierra-pc-heartbeat/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            print(f"[{time.strftime('%H:%M:%S')}] pulse -> HTTP {r.status}", flush=True)
            return True
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] pulse FAILED: {e}", flush=True)
        return False


def main():
    print(f"sierra_pc_heartbeat -> {HEARTBEAT_URL} every {INTERVAL_SEC}s (Ctrl+C to stop)", flush=True)
    pulse()
    while True:
        try:
            time.sleep(INTERVAL_SEC)
            pulse()
        except KeyboardInterrupt:
            print("heartbeat stopped by user", flush=True)
            sys.exit(0)


if __name__ == "__main__":
    main()

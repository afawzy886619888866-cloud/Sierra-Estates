#!/usr/bin/env python3
"""Generate or inspect a Sierra Estates property video teaser with Gemini Omni 1.2 Flash.

Follows the `gemini-omni-flash-api` skill workflow:
  - Uses the official `google-genai` Interactions API + Files API
  - Supports text-to-video, first-frame, first+last frame transitions, and up to 6 reference images
  - Binds images with natural language (no deprecated bracket tags)
  - Supports `--dry-run` for local & CI validation without billing/network calls.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

MODEL_ID = "gemini-omni-1.2-flash"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Sierra Estates Gemini Omni 1.2 Flash Video Teaser CLI")
    p.add_argument("--prompt", required=True, help="Natural-language video generation prompt")
    p.add_argument("--first-frame", help="Optional path to starting keyframe image")
    p.add_argument("--last-frame", help="Optional path to ending keyframe image (requires --first-frame)")
    p.add_argument("--image", action="append", default=[], help="Reference image path (repeatable, max 6)")
    p.add_argument("--aspect-ratio", default="9:16", choices=["16:9", "9:16"])
    p.add_argument("--resolution", default="1080p", choices=["360p", "720p", "1080p", "4k"])
    p.add_argument("--duration", type=int, default=10, help="Duration in seconds (3-15; max 10 when using keyframes)")
    p.add_argument("--output", default="media/sierra_teaser.mp4", help="Output MP4 path")
    p.add_argument("--timeout", type=int, default=600, help="HTTP timeout in seconds")
    p.add_argument("--dry-run", action="store_true", help="Validate config & inputs without API calls")
    return p.parse_args()


def validate_args(args: argparse.Namespace) -> None:
    if args.last_frame and not args.first_frame:
        raise ValueError("--last-frame requires --first-frame")
    if args.first_frame and args.last_frame and not (3 <= args.duration <= 10):
        raise ValueError("Two-frame keyframe transitions require --duration between 3 and 10 seconds")
    elif not (3 <= args.duration <= 15):
        raise ValueError("--duration must be between 3 and 15 seconds")
    if len(args.image) > 6:
        raise ValueError("Maximum 6 --image references supported")
    for p_str in [args.first_frame, args.last_frame, *args.image]:
        if p_str and not Path(p_str).is_file():
            raise FileNotFoundError(f"Media file not found: {p_str}")


def mime_for(path_str: str) -> str:
    ext = Path(path_str).suffix.lower()
    return {
        ".png": "image/png",
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }.get(ext, "image/png")


def upload_and_wait(client, path_str: str) -> dict[str, str]:
    uploaded = client.files.upload(file=path_str)
    while getattr(uploaded, "state", None) and str(uploaded.state).endswith("PROCESSING"):
        time.sleep(2)
        uploaded = client.files.get(name=uploaded.name)
    return {"type": "image", "uri": uploaded.uri, "mime_type": mime_for(path_str)}


def main() -> int:
    args = parse_args()
    try:
        validate_args(args)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GOOGLE_GENAI_API_KEY") or ""
    try:
        from google import genai  # type: ignore
        sdk_installed = True
    except ImportError:
        genai = None
        sdk_installed = False

    summary = {
        "model": MODEL_ID,
        "aspect_ratio": args.aspect_ratio,
        "resolution": args.resolution,
        "duration_seconds": args.duration,
        "output": args.output,
        "api_key_configured": bool(api_key),
        "google_genai_installed": sdk_installed,
        "dry_run": args.dry_run,
    }
    if args.dry_run:
        print(json.dumps(summary, indent=2))
        return 0

    if not api_key:
        print("ERROR: GEMINI_API_KEY (or GOOGLE_AI_API_KEY / GOOGLE_GENAI_API_KEY) is not set", file=sys.stderr)
        return 1
    if not sdk_installed or genai is None:
        print("ERROR: google-genai SDK not installed. Run: pip install -U google-genai", file=sys.stderr)
        return 1

    client = genai.Client(api_key=api_key, http_options={"timeout": args.timeout * 1000})
    contents: list[dict] = []
    if args.first_frame:
        contents.append(upload_and_wait(client, args.first_frame))
    if args.last_frame:
        contents.append(upload_and_wait(client, args.last_frame))
    for img in args.image:
        contents.append(upload_and_wait(client, img))
    contents.append({"type": "text", "text": args.prompt})

    interaction = client.interactions.create(
        model=MODEL_ID,
        input=contents,
        generation_config={
            "aspect_ratio": args.aspect_ratio,
            "resolution": args.resolution,
            "duration_seconds": args.duration,
        },
    )

    out_video = getattr(interaction, "output_video", None)
    if not out_video:
        print(
            "ERROR: No video output returned by Gemini Omni 1.2 Flash "
            "(note: regional restrictions apply to video uploads/references).",
            file=sys.stderr,
        )
        return 1

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if hasattr(out_video, "save"):
        out_video.save(str(out_path))
    elif isinstance(out_video, (bytes, bytearray)):
        out_path.write_bytes(bytes(out_video))
    else:
        data = client.files.download(file=out_video)
        out_path.write_bytes(data)

    print(json.dumps({"ok": True, "output": str(out_path), "interaction_id": getattr(interaction, "id", None)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

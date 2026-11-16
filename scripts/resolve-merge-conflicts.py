#!/usr/bin/env python3
"""
resolve-merge-conflicts.py — one-shot recovery tool.

A prior lineage merge committed 653 unresolved conflict markers across 142
files into origin/main (merge of the §21 no-fabrication lineage, tip
41d87c02-side, into an older pre-§21 base). This script resolves each
conflict block by choosing the side that textually matches the canonical
§21 wave-5 tip (07e94f3e == merge-base of local main and origin/main).

Policy per conflict block:
  - exactly one side matches canonical content  -> take that side
  - both sides identical                        -> take it (trivial)
  - both sides match, but differ                -> FLAG (ambiguous)
  - neither side matches                        -> FLAG (needs manual merge)

Files with ANY flagged block are left untouched for manual review.
Files not present in the canonical commit are FLAGGED wholesale.

Usage:
  python3 scripts/resolve-merge-conflicts.py            # resolve + report
  python3 scripts/resolve-merge-conflicts.py --dry-run  # report only
"""
import subprocess
import sys
import os
import json

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANON = "07e94f3e"
DRY_RUN = "--dry-run" in sys.argv


def run_git(*args, binary=False):
    r = subprocess.run(["git", "-C", REPO, *args],
                       capture_output=True)
    return r.stdout if binary else r.stdout.decode("utf-8", "replace")


def exists_at(rev, path):
    return subprocess.run(
        ["git", "-C", REPO, "cat-file", "-e", f"{rev}:{path}"],
        capture_output=True).returncode == 0


def parse_conflicts(lines):
    """Yield (start_idx, sep_idx, end_idx, side_a_lines, side_b_lines)."""
    blocks = []
    i = 0
    n = len(lines)
    while i < n:
        if lines[i].startswith("<<<<<<< "):
            start = i
            sep = None
            end = None
            j = i + 1
            while j < n:
                if lines[j].startswith("=======") and sep is None and not lines[j].startswith(">>>>>>>"):
                    sep = j
                elif lines[j].startswith(">>>>>>> "):
                    end = j
                    break
                j += 1
            if sep is None or end is None:
                # malformed block — treat rest of file as one giant flag
                blocks.append((start, None, None, None, None))
                break
            side_a = lines[start + 1:sep]
            side_b = lines[sep + 1:end]
            blocks.append((start, sep, end, side_a, side_b))
            i = end + 1
        else:
            i += 1
    return blocks


def side_matches(side_lines, canon_text):
    """True if the side's text appears as a contiguous chunk of canonical."""
    if not side_lines:
        return False
    joined = "\n".join(side_lines)
    return joined + "\n" in canon_text or joined in canon_text


def resolve_file(path):
    """Returns dict describing outcome; writes resolved file unless flagged."""
    head_text = run_git("show", f"HEAD:{path}")
    has_canon = exists_at(CANON, path)
    canon_text = run_git("show", f"{CANON}:{path}") if has_canon else ""

    lines = head_text.split("\n")
    blocks = parse_conflicts(lines)

    if not blocks:
        return {"status": "no-markers", "blocks": 0}

    resolved = []          # (block, chosen_lines, note)
    flagged = []           # (block, reason)
    for (start, sep, end, a, b) in blocks:
        if sep is None:
            flagged.append((start, "malformed-block"))
            continue
        if a == b:
            resolved.append(((start, sep, end), a, "identical-sides"))
            continue
        if not has_canon:
            flagged.append((start, "no-canonical-reference"))
            continue
        ma = side_matches(a, canon_text)
        mb = side_matches(b, canon_text)
        if ma and not mb:
            resolved.append(((start, sep, end), a, "side-A=canonical"))
        elif mb and not ma:
            resolved.append(((start, sep, end), b, "side-B=canonical"))
        elif ma and mb:
            flagged.append((start, "ambiguous-both-match"))
        else:
            flagged.append((start, "neither-matches-canonical"))

    if flagged:
        return {"status": "flagged", "blocks": len(blocks),
                "resolved": len(resolved), "flagged": len(flagged),
                "reasons": [r for _, r in flagged]}

    # Rebuild the file with chosen sides substituted for marker blocks.
    out_lines = []
    block_map = {b[0]: chosen for b, chosen, _ in resolved}
    skip_until = -1
    for idx, line in enumerate(lines):
        if idx <= skip_until:
            continue
        if idx in block_map:
            _, sep, end = next(b for b, _c, _n in resolved if b[0] == idx)
            out_lines.extend(block_map[idx])
            skip_until = end
        else:
            out_lines.append(line)
    new_text = "\n".join(out_lines)

    # Normalize: preserve original trailing-newline state
    if head_text.endswith("\n") and not new_text.endswith("\n"):
        new_text += "\n"
    if not head_text.endswith("\n") and new_text.endswith("\n"):
        new_text = new_text[:-1]

    if not DRY_RUN:
        with open(os.path.join(REPO, path), "w", encoding="utf-8") as fh:
            fh.write(new_text)

    same_as_canon = (has_canon and new_text == canon_text)
    return {"status": "resolved", "blocks": len(blocks),
            "same_as_canon": same_as_canon,
            "notes": sorted({n for _b, _c, n in resolved})}


def main():
    out = run_git("grep", "-l", "^<<<<<<< ", "HEAD")
    files = [l.split(":", 1)[1] for l in out.splitlines() if ":" in l]
    print(f"Conflicted files at HEAD: {len(files)}")

    summary = {"resolved": [], "resolved_canonical": [], "flagged": {},
               "no_markers": []}
    total_blocks = 0
    for f in files:
        try:
            res = resolve_file(f)
        except Exception as e:  # noqa: BLE001
            summary["flagged"][f] = [f"exception:{e}"]
            continue
        total_blocks += res.get("blocks", 0)
        st = res["status"]
        if st == "resolved":
            if res.get("same_as_canon"):
                summary["resolved_canonical"].append(f)
            else:
                summary["resolved"].append(f)
        elif st == "flagged":
            summary["flagged"][f] = res.get("reasons", [])
        elif st == "no-markers":
            summary["no_markers"].append(f)

    print(f"Total conflict blocks scanned: {total_blocks}")
    print(f"Fully resolved (== canonical): {len(summary['resolved_canonical'])}")
    print(f"Fully resolved (differs from canonical — review their edits): "
          f"{len(summary['resolved'])}")
    for f in summary["resolved"]:
        print(f"    [differs] {f}")
    print(f"Flagged for manual review: {len(summary['flagged'])}")
    for f, reasons in summary["flagged"].items():
        rc = {}
        for r in reasons:
            rc[r] = rc.get(r, 0) + 1
        print(f"    [FLAG] {f}  {rc}")

    with open("/tmp/conflict-resolution-report.json", "w") as fh:
        json.dump(summary, fh, indent=1)
    print("\nReport: /tmp/conflict-resolution-report.json")
    if DRY_RUN:
        print("DRY RUN — no files written.")


if __name__ == "__main__":
    main()

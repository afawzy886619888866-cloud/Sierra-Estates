---
description: Tự động cập nhật tài liệu khi có tính năng mới hoặc thay đổi hệ thống.
---

# /update-docs - Automatic Documentation Sync

$ARGUMENTS

---

## 🟢 PHASE 1: Change Detection

**Agent**: `explorer-agent`
**Mission**: Find the "Delta."

- **Action**: Scan `.agent/skills/`, `.agent/agents/`, and `.agent/workflows/`.
- **Action**: Compare counts and labels against existing documentation.

## 🟡 PHASE 2: Data Synthesis

**Agent**: `documentation-writer`
**Mission**: Build the "Source of Truth."

- **Action**: Calculate new statistics (Total Skills, Total Agents).
- **Action**: Generate short descriptions for any new components found.
- **DNA Link**: Follow `rules/docs-update.md` checklist.

## 🔵 PHASE 3: Surgical Update

**Agent**: `documentation-writer`
**Mission**: Propagate the changes.

- **Action**: Update `README.md`, `README.vi.md`, and all `*_GUIDE.vi.md` files.
- **Action**: Run the `node .agent/scripts/update-docs.js` if available.

## 🔴 PHASE 4: Integrity Audit

**Agent**: `quality-inspector`
**Mission**: Final Proofread.

- **Verification**: Ensure all links are clickable and stats are 100% accurate.
- **Reporting**: Report total items updated to the User.

---

## Sync Rules

- **Bilingual**: Always update both English and Vietnamese files.
- **Consistent Stats**: README counts must match the actual file counts in `.agent/`.
- **Clean Diff**: Only modify the relevant sections to keep history readable.

---

## Examples

- `/update-docs`
- `/update-docs after adding 3 new skills`
- `/update-docs sync agent descriptions`

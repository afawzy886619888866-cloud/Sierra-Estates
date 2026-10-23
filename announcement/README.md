# 📣 Cairo Plaza El-Mataria — Official Announcement Version
# كايرو بلازا المطرية — نسخة الإعلان الرسمية

**Branch:** `cairo-plaza-announcement` (main repo `SE-Vercel-deploy-main` untouched on `main` — kept as backup)
**Date:** 30 September 2026

This branch/new-repo version updates **all Cairo Plaza content** — web page scripts, ad copies, visual posters and marketing content — to carry the **mandatory Booking & Contracting disclaimer** highlighted at the bottom/end of every piece, exactly as issued by the project management.

---

## The mandatory disclaimer (verbatim — see `DISCLAIMER-POLICY.md`)

> **يتم توقيع العقد وإستلام أصل إستمارة الحجز مختومة بخاتم الشركة وتسليم دفعة التعاقد وإستلام إيصالات السداد من الإدارة المالية الموجودة بالعمارة رقم (1) بالدور الثاني بمشروع كايرو بلازا المطرية. يتم إستلام أصل العقد الموقع من الشركة بحد أقصى (7) أيام عمل من تاريخ توقيع العميل على العقد.**

## What's in this pack

| Path | Contents |
|------|----------|
| `DISCLAIMER.txt` | The single source of truth — exact Arabic text |
| `DISCLAIMER-POLICY.md` | Mandatory notice policy, presentation rules, verification |
| `site/` | Standalone bilingual announcement web page (`index.html` — deployable anywhere) |
| `posters/` | 4 ready-to-publish posters (PNG, print-ready 2×) + editable HTML sources in `posters/src/` |
| `ad-copies/` | Updated ad copy texts for all active campaigns (AR + EN), each ending with the disclaimer |
| `marketing/` | WhatsApp broadcasts, Facebook posts, SMS, e-mail templates (AR + EN), each ending with the disclaimer |
| `reference/` | The official "خطوات الحجز والتعاقد" poster issued by the project management |

## Where it is applied in the web app (this branch)

- `apps/sierra-estates-realty/components/client/BookingContractingNotice.tsx` — the official notice component.
- Wired into **both route layouts** (`app/cairo-plaza/layout.tsx`, `app/ar/cairo-plaza/layout.tsx`) so **every** Cairo Plaza page — overview, inventory, investor, contact, meeting agenda, EN + AR — renders the notice at the bottom automatically.

## Publishing checklist

1. New content? Copy the disclaimer from `DISCLAIMER.txt` — never retype it.
2. Place it at the **bottom**, visually **highlighted** (gold/maroon bordered box).
3. Run `python3 announcement/verify_disclaimer.py` — it must pass 100%.

---

مع تحيات إدارة مشروع كايرو بلازا المطرية

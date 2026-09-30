# سياسة الإشعار الملزم — إشعار الحجز والتعاقد
# Mandatory Notice Policy — Booking & Contracting Disclaimer

**Effective date:** 30 September 2026 · **Applies to:** all Cairo Plaza El-Mataria (كايرو بلازا المطرية) content, without exception.

---

## 1) Mandatory Arabic text — exact and unaltered

Every piece of content — web pages, ad copies, posters, marketing messages, videos, documents — **must carry the following text verbatim, highlighted, at the bottom/end**. Editing, shortening, paraphrasing or translating it in place of the Arabic original is **not allowed**.

> **يتم توقيع العقد وإستلام أصل إستمارة الحجز مختومة بخاتم الشركة وتسليم دفعة التعاقد وإستلام إيصالات السداد من الإدارة المالية الموجودة بالعمارة رقم (1) بالدور الثاني بمشروع كايرو بلازا المطرية. يتم إستلام أصل العقد الموقع من الشركة بحد أقصى (7) أيام عمل من تاريخ توقيع العميل على العقد.**

Canonical file: [`DISCLAIMER.txt`](./DISCLAIMER.txt) — copy from this file only.

## 2) Reference English translation (for bilingual media — always shown BELOW the Arabic original)

> The contract is signed, the original booking form stamped with the company seal is received, the contracting deposit is paid, and the payment receipts are received from the Financial Administration located in Building No. (1), second floor, Cairo Plaza El-Mataria project. The original contract signed by the company is received within a maximum of (7) business days from the date the client signs the contract.

## 3) Presentation rules

| Rule | Requirement |
|------|-------------|
| Position | Bottom/end of every piece of content — never the middle, never a collapsed "read more" |
| Highlight | Visually distinct: bordered/gold-highlighted box, bold text, clearly separated from the marketing body |
| Language | Arabic original mandatory everywhere; EN translation may follow underneath on bilingual/EN media |
| Integrity | Exact character-for-character match with `DISCLAIMER.txt` — verified before publishing |
| Web pages | Rendered by `components/client/BookingContractingNotice.tsx` on every `/cairo-plaza` and `/ar/cairo-plaza` page |
| Posters/creatives | Use the templates in `posters/` — any new creative must include the disclaimer band |

## 4) Where this notice is already applied (this branch)

- **Web:** every `/cairo-plaza/*` and `/ar/cairo-plaza/*` page (via route layouts).
- **Standalone announcement page:** `site/index.html`.
- **Posters:** all four templates in `posters/` (steps AR, announcement AR, social square AR, steps EN).
- **Ad copies:** all files in `ad-copies/`.
- **Marketing:** WhatsApp, Facebook, SMS and e-mail templates in `marketing/`.

## 5) Verification

Run the checker before publishing any new material:

```bash
python3 announcement/verify_disclaimer.py
```

It asserts that every deliverable contains the exact text from `DISCLAIMER.txt`.

# Sales Kits

Marketing and sales materials for Sierra Estates.

## Large PDFs (hosted on Supabase Storage)

The three heavy PDFs below exceed the repo's 5 MB tracked-file hygiene cap
(`__tests__/data-hygiene-and-git-weight.test.ts`) and are served from the
public `sales-kits` storage bucket instead of git. Byte-identical copies
(sha/size verified at upload time, 2026-10-22):

| Document | Size | URL |
|---|---|---|
| Sierra Estates AI Sales Architecture | 16.7 MB | https://gaxfqcietzoonlmatiot.supabase.co/storage/v1/object/public/sales-kits/Sierra_Estates_AI_Sales_Architecture.pdf |
| Sierra Estates PropTech | 12.4 MB | https://gaxfqcietzoonlmatiot.supabase.co/storage/v1/object/public/sales-kits/Sierra_Estates_PropTech.pdf |
| The Sunlit Dossier | 9.2 MB | https://gaxfqcietzoonlmatiot.supabase.co/storage/v1/object/public/sales-kits/The_Sunlit_Dossier.pdf |

Bucket: `sales-kits` (public) on the Sierra Estates Supabase project.
Service-role uploads use `x-upsert: true`, so re-uploading a refreshed PDF
is a plain overwrite — update the table above only if the filename changes.

Local PDFs are gitignored (`docs/sales-kits/*.pdf`); lighter assets in this
directory (briefs, campaign docs, small PDFs, the roadmap PNG) remain tracked.

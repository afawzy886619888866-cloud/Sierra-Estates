/* ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — Supabase Configuration
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  HOW TO GET THESE VALUES:
 *  1. Go to https://supabase.com and sign in
 *  2. Click "New project" → fill in name, password, region
 *  3. Wait ~2 minutes for project to provision
 *  4. Go to Project Settings → API
 *  5. Copy "Project URL" and "anon public" key into the placeholders below
 *  6. Go to SQL Editor → paste schema.sql → Run (creates tables + RLS policies)
 *
 *  SECURITY NOTE:
 *  The Supabase anon key is designed to be embedded in client-side code —
 *  it's safe to commit. Security is enforced by Row Level Security (RLS)
 *  policies in PostgreSQL (see schema.sql). Never put the service_role
 *  key in frontend code — that one bypasses RLS.
 *
 *  ⚠️  After filling in real values, this file CAN be committed to git.
 * ═══════════════════════════════════════════════════════════════════════════ */

window.SIERRA_SUPABASE_CONFIG = {
  url:        "https://YOUR-PROJECT-ID.supabase.co",
  anonKey:    "PASTE-YOUR-ANON-PUBLIC-KEY-HERE"
};

// Set to true ONLY after you've filled in real values above + run schema.sql.
// While false, the site uses the static data.js fallback (no Supabase).
window.SIERRA_SUPABASE_ENABLED = false;

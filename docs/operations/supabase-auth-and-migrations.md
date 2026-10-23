# Supabase migrations and Google OAuth

## Pending migrations

The repository contains these idempotent migrations:

- `supabase/migrations/20250308_career_application_fields.sql`
  - Adds `has_vehicle`, `biggest_achievements`, and `expected_salary` to
    `public.career_applications`.
- `supabase/migrations/20250309_n8n_lead_idempotency.sql`
  - Adds `external_message_id` to `public.leads` and a partial unique index for
    non-null values.

The migrations have been checked into the repository and are safe to rerun.
Remote application still requires a fresh Supabase access token; never commit
that token or a database password.

```powershell
$env:SUPABASE_ACCESS_TOKEN = '<fresh token>'
pnpm dlx supabase@latest migration list --project-ref gaxfqcietzoonlmatiot
pnpm dlx supabase@latest db push --project-ref gaxfqcietzoonlmatiot
pnpm dlx supabase@latest migration list --project-ref gaxfqcietzoonlmatiot
```

After the push, verify the schema in the Supabase SQL editor:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'career_applications'
  and column_name in ('has_vehicle', 'biggest_achievements', 'expected_salary');

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'leads'
  and column_name = 'external_message_id';

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'leads'
  and indexname = 'leads_external_message_id_unique';
```

## Google OAuth configuration

The admin login uses Supabase's browser OAuth flow and returns to the current
admin origin at `/admin`. Configure the following in Supabase Dashboard >
Authentication > URL Configuration:

- Site URL: `https://sierra-estates.net`
- Additional redirect URLs:
  - `https://admin.sierra-estates.net/admin`
  - `https://sierra-estates.net/admin`
  - `http://localhost:3000/admin`

In Google Cloud Console > APIs & Services > Credentials, add the following
Authorized JavaScript origins:

- `https://sierra-estates.net`
- `https://admin.sierra-estates.net`
- `http://localhost:3000` (development only)

Add this exact Authorized redirect URI to the Google OAuth client:

```text
https://gaxfqcietzoonlmatiot.supabase.co/auth/v1/callback
```

Finally, in Supabase Dashboard > Authentication > Providers > Google:

1. Enable Google.
2. Paste the Google OAuth client ID and client secret.
3. Save the provider.
4. Test from `https://admin.sierra-estates.net/admin`.

Google OAuth only grants authentication. The application still enforces the
admin allowlist (`ADMIN_EMAILS`) after Supabase verifies the identity.

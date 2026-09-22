# Sierra Estates n8n production boundary

Supabase is the only authoritative backend. The original workflow exports are
retired historical references and must not be imported or activated:

| Workflow | Decision | Reason |
| --- | --- | --- |
| `01-property-finder-leads.json` | Retired | Uses Firebase and the obsolete `clients`/`requests` model. |
| `02-whatsapp-bot-handler.json` | Retired | Uses Firebase and has no selected WhatsApp transport. |
| `03-ai-score-scheduler.json` | Retired | Uses Firebase and an unconfigured Gemini request. |

`04-supabase-webhook-intake.json` is the only current candidate. It is
intentionally inactive and validates a webhook payload before writing to
`public.leads` through Supabase REST.

## Before activation

1. Create an n8n inbound header-auth credential for the calling provider.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the n8n secret store.
   Never export either value in workflow JSON or commit it to the repository.
3. Apply `supabase/migrations/20250309_n8n_lead_idempotency.sql` before enabling
   retries. It adds a unique `public.leads.external_message_id` key and the
   candidate uses `resolution=ignore-duplicates`.
4. Run malformed-payload, duplicate, timeout, Supabase-error, and success
   smoke tests.
5. Choose and configure the WhatsApp transport separately (Meta Cloud API,
   Twilio, or a persistent WhatsApp Web worker). This workflow does not send
   WhatsApp messages.

Keep workflows inactive in source control. Activation is a provider-side
release step after the production gates pass.

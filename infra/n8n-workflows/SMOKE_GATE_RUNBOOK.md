# n8n Production Smoke Gate Runbook — Sierra Estates
<!-- SIE-104-004 · Verify provider configuration and production smoke gates -->

> **Status:** Pre-activation checklist. Complete all items before setting `active: true` in n8n.

## Pre-Activation Provider Checklist

### 1 · n8n Credential — Inbound Header Auth
```
Type: Header Auth
Name: sierra-lead-intake-caller
Header Name: X-Sierra-Webhook-Secret
Header Value: <generate with: openssl rand -hex 32>
```
Store only in n8n — never in source control or environment files checked into git.

### 2 · n8n Environment Variables (Secret Store)
| Variable | Description | Source |
|---|---|---|
| `SUPABASE_URL` | `https://gaxfqcietzoonlmatiot.supabase.co` | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT | Supabase → API → service_role |

Set via **n8n UI → Settings → Environment Variables** (not `.env` file).

### 3 · Supabase Migration
Apply before enabling retries or first activation:
```sql
-- supabase/migrations/20250309_n8n_lead_idempotency.sql
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS external_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS leads_external_message_id_unique
    ON public.leads (external_message_id)
    WHERE external_message_id IS NOT NULL;
```
Run via Supabase Dashboard → SQL Editor, or `supabase db push` with linked project.

### 4 · WhatsApp Transport (Choose One)
| Option | Notes |
|---|---|
| Meta Cloud API | Requires business verification; webhooks → `sierra-lead-intake` |
| Twilio WhatsApp | Sandbox available immediately; production needs approval |
| WA Web persistent worker | No Meta approval needed; requires dedicated process |

Configure the transport's outbound webhook URL to:
`https://<n8n-host>/webhook/sierra-lead-intake`

---

## Smoke Test Suite (5 Required Scenarios)

### S1 · Signed Webhook — Success Path
```bash
curl -X POST https://<n8n-host>/webhook/sierra-lead-intake \
  -H "X-Sierra-Webhook-Secret: <secret>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ahmed Test","phone":"+201001234567","messageId":"smoke-001","channel":"whatsapp","message":"Looking for 3bed in Katameya"}'
```
**Expected:** HTTP 200, `{"status":"accepted","id":"<uuid>"}`, row in `public.leads`.

### S2 · Duplicate Delivery — Idempotency
Repeat S1 with the same `messageId: "smoke-001"`.
**Expected:** HTTP 200, `id: null` (ignored duplicate — no second row inserted).

### S3 · Malformed Payload — Validation Gate
```bash
curl -X POST https://<n8n-host>/webhook/sierra-lead-intake \
  -H "X-Sierra-Webhook-Secret: <secret>" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+201001234567"}'
```
**Expected:** Workflow throws `Missing required fields: name, phone` — HTTP 4xx / execution error.

### S4 · Unauthorized Request
```bash
curl -X POST https://<n8n-host>/webhook/sierra-lead-intake \
  -H "Content-Type: application/json" \
  -d '{"name":"Intruder","phone":"+20100000000","messageId":"smoke-bad"}'
```
**Expected:** HTTP 401 / 403 — no n8n execution triggered.

### S5 · Supabase Connectivity Failure
Temporarily set `SUPABASE_URL` to an invalid URL in n8n env, then repeat S1.
**Expected:** Workflow execution fails at "Persist Lead in Supabase" node with a non-200 response; no silent data loss.
Restore correct URL afterward.

---

## Post-Activation Verification
- [ ] Check `public.leads` in Supabase Dashboard — rows are present from S1.
- [ ] Confirm `external_message_id` uniqueness index is enforced (S2 produced no duplicate).
- [ ] n8n execution history shows all 5 scenarios with expected outcomes.
- [ ] Alert/monitoring is configured on execution failure (n8n → Workflow → Error Workflow).

---

## Activation Command (n8n API)
```bash
# Set active = true via n8n API after all smoke tests pass
curl -X PATCH https://<n8n-host>/api/v1/workflows/<workflow-id> \
  -H "X-N8N-API-KEY: <n8n-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

> **Do not** set `"active": true` in the source JSON (`04-supabase-webhook-intake.json`).
> Activation is a provider-side release step — source control keeps workflows inactive.

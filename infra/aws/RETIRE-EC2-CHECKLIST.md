# EC2 Retirement Checklist — archive, stop, terminate

> **Goal:** cut the EC2 cost to zero while keeping the setup archived, so a
> future AWS account with free credits can relaunch the whole thing from the
> saved AMI in ~10 minutes.
> **Instance:** `i-0be8ff8c5cfba7363` (t3.micro, us-east-1) · **EIP:** `18.232.148.172`
> **Status of the replacement:** the Docker path (RAG station + workflow runner
> on the owner PC) supersedes it — see `infra/DOCKER-RUNNER-MIGRATION.md`.
> **Date drafted:** 2026-10-31.

> **Do not retire before:** 2 consecutive green daily-briefing runs with
> `docker-runner:*` labels in the Workflow Studio (the G3 proof that the
> Docker path is genuinely carrying the load).

---

## Why the AWS CLI path is dead (use the browser Console)

All 5 recent scheduled `ec2-automations` runs failed at
`configure-aws-credentials` — the Vercel env keys return
`UnrecognizedClientException` on SSM. The keys are stale/rotated, so every
CLI command below would fail the same way. The **AWS Console in a browser**
(logged in with the account owner login) needs none of those keys. The CLI
variants are listed only in case valid keys are restored first.

---

## Step 0 — Confirm the Docker path is green (gate)

- [ ] Workflow Studio shows `daily-digest` succeeded on the Docker runner
      (`last_run_label` starts with `docker-runner:`), twice, on two
      different days
- [ ] The 03:00 Cairo briefing arrived on 01092048333 both mornings

## Step 1 — Archive the instance (the "keep it archived" step)

Console path:

1. EC2 → Instances → select `i-0be8ff8c5cfba7363`
2. Actions → **Image and templates → Create image**
   - Name: `sierra-ec2-archive-2026-10-31`
   - Check **"No reboot" is OFF** is acceptable at night (a reboot briefly
     interrupts nothing now — nothing runs on it anymore); prefer leaving
     it unchecked so the filesystem is consistent
   - Description: `Sierra Estates OpenWA+n8n+runner box, t3.micro, AMI for future free-credit relaunch`
3. Wait for the AMI to show **Available** (a few minutes)

CLI equivalent (only with valid keys):
`aws ec2 create-image --instance-id i-0be8ff8c5cfba7363 --name "sierra-ec2-archive-2026-10-31" --no-reboot`

Cost note: an AMI + its snapshot on EBS costs roughly **$0.08–0.10/GB-month**
(t3.micro root volume ≈ 8–30 GB → about **$1–3/month**). If even that must
go to zero later: deregister the AMI + delete the snapshot after exporting
anything needed.

## Step 2 — Export anything still unique off the instance

- [ ] n8n workflows (if n8n was ever used): SSM Session Manager →
      `tar czf /tmp/n8n.tgz -C /home/node .n8n` → download via the browser
      session, or skip if n8n was never configured (the Docker compose files
      in `infra/` recreate it empty)
- [ ] `workflows/.env` on the instance (sheet/PF credentials) — **only if**
      values there differ from the local `infra/.env` (most were migrated
      already)
- [ ] WhatsApp session dirs: NOT needed — the 8-line gateway on the owner
      PC was re-paired; EC2-era sessions are stale and non-portable anyway

## Step 3 — Stop first (rollback window), then terminate

- [ ] **Stop** the instance now: Actions → Instance State → **Stop**
      (a stopped instance costs only its EBS volume ≈ **$0.80/month** —
      safe rollback for 1–2 weeks)
- [ ] After 1–2 green weeks: Actions → Instance State → **Terminate**
- [ ] Elastic IPs → select `18.232.148.172` → **Release**
      (an unattached EIP bills ~$3.6/month — release it promptly)

CLI equivalents: `aws ec2 stop-instances --instance-ids i-0be8ff8c5cfba7363` ·
`aws ec2 terminate-instances --instance-ids i-0be8ff8c5cfba7363` ·
`aws ec2 release-address --public-ip 18.232.148.172`

## Step 4 — Remove the dead credentials everywhere

- [ ] Vercel project settings → Environment Variables: delete
      `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (and `AWS_REGION` if
      present)
- [ ] GitHub repo → Settings → Secrets and variables → Actions: delete any
      `AWS_*` secrets
- [ ] The `ec2-automations.yml` schedule is already disabled (commit
      `4a986d7e`, 2026-10-27); the file stays for history

## Step 5 — Future relaunch from the archive (the "free credits" plan)

With a new AWS account / free credits:

1. EC2 → AMIs → `sierra-ec2-archive-2026-10-31` → **Launch instance from AMI**
   (pick a **t3.micro** — free-tier eligible — and ≥ 10 GB RAM is NOT
   available free; the AMI restores the 4-line era config which fit in 1 GB)
2. Security group: allow 22 (your IP) and nothing else to start; the
   Cloudflare tunnel script (`infra/aws/setup-cloudflare-tunnel.sh`) does
   public exposure the safe way — do not open :3000/:5678 to 0.0.0.0/0
3. Run `harden-live-gateway.sh` + `setup-cloudflare-tunnel.sh` from
   `infra/aws/` (they are kept exactly for this)
4. Re-pair WhatsApp lines from scratch (sessions never survive a relaunch)

---

**Everything that actually runs the business today** lives on: the owner PC
(gateway + runner, auto-started at logon), Supabase, Vercel and Cloudflare.
The AWS account itself becomes optional.

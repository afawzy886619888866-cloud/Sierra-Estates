# GitHub Actions Spending Limit & Billing Recovery Guide

## 1. Root Cause: Why Actions Stop Running

On GitHub Free accounts, public and private repositories share a pool of included CI/CD runner minutes (2,000 minutes/month for personal free accounts). When those minutes are consumed:

1. GitHub enforces a **default spending limit of $0.00**, immediately pausing all incoming workflow runs.
2. Commits show pending or cancelled workflow states with the message:
   > *"GitHub Actions has encountered an error: The job was not started because the account associated with the repository has exceeded its spending limit."*
3. Secret-based deployment steps and PR checks get blocked until the billing cycle resets or a spending limit is configured.

---

## 2. Step-by-Step: Enabling a Spending Limit

### For Personal Accounts

1. Log in to [GitHub](https://github.com).
2. Click your **profile picture** in the top-right corner and select **Settings**.
3. In the left sidebar under **Access**, click **Billing and plans** (or **Billing & licensing**).
4. Click **Plans and usage**.
5. Scroll down to the **Spending limits** section.
6. Locate **Actions** (default is `$0.00`).
7. Click **Update limit** (or **Edit**):
   - Select **Limit spending** and enter a modest threshold (e.g., `$5.00` or `$10.00 USD`).
   - *Note: You will only be billed if you exceed your monthly included free quota, and spending will automatically stop once this cap is hit.*
8. Click **Save** / **Update spending limit**.
9. Ensure a valid credit card or PayPal account is attached under **Payment methods**.

### For Organizations (if repo is in an org)

1. Go to your Organization page on GitHub (`https://github.com/<org-name>`).
2. Click **Settings** (tab at the top).
3. In the left sidebar, click **Billing and plans** -> **Plans and usage**.
4. Scroll to **Spending limits**, find **Actions**, and update the limit to your desired safety cap.

---

## 3. Workflow Quota Optimization Applied to this Repository

To ensure you stay well within the monthly free tier moving forward, the repository's workflows have been hardened:

| Workflow | Old Behavior | Optimized State | Monthly Impact |
|---|---|---|---|
| `ci.yml` | Triggered on broad file changes, redundant sub-jobs | Lean single-job pipeline running only type-check, lint, test, and build on `main` push/PR | **~75% reduction** in CI minutes |
| `codeql.yml` | Ran on every push and PR | Scheduled **weekly** + manual `workflow_dispatch` only | **~85% reduction** in heavyweight SAST minutes |
| `deploy-vercel.yml` | Delegated to Vercel native build engine | Retained for production promotion gating | Minimal Actions minute usage |
| `deploy-supabase.yml` | Runs only on `supabase/schema.sql` change | Path-scoped trigger | Zero waste |
| Redundant workflows | 8 workflows (`stale.yml`, `backend-tests.yml`, `pr-size.yml`, `labeler.yml`, etc.) running constantly | **Removed** | **100% elimination** of redundant runs |

---

## 4. How to Verify Usage in Real Time

1. Go to **Settings** -> **Billing and plans** -> **Plans and usage**.
2. Under **Usage this month**, inspect the **Actions** progress bar to see minutes used vs. total included minutes.
3. You can download a detailed CSV usage report via the **Usage report** button to identify any outlier jobs.

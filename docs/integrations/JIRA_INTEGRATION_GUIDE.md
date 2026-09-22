# Sierra Estates — Jira Integration Guide

This guide details how to configure and use the three Jira integrations implemented in the Sierra Estates platform:

1. **WhatsApp & Concierge Lead Bot $\rightarrow$ Jira Ticket Creation**
2. **n8n Workflow & Backend API $\rightarrow$ Jira Issue Ingestion**
3. **GitHub Repository $\rightarrow$ Jira Workspace Sync**

---

## 1. Prerequisites (Atlassian Jira Cloud)

To connect any of the integrations with live Jira:

1. **Jira Cloud Domain**: e.g., `https://your-domain.atlassian.net`
2. **Project Key**: e.g., `SE` or `LEAD` (create a Scrum, Kanban, or Business project in Jira).
3. **Atlassian API Token**:
   - Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
   - Click **Create API token**, name it `Sierra Estates Automation`, and copy the token.
4. **Account Email**: The email associated with your Atlassian account.

---

## 2. WhatsApp Bot Integration

The WhatsApp bot automatically converts high-intent client inquiries (`viewing_request`, `owner_offering`, `closing`, `property_search`, or human escalations) into Jira issues.

### Environment Variables

Add to `apps/agents/whatsapp-bot/.env` or production secret manager:

```env
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=your-account@example.com
JIRA_API_TOKEN=your-atlassian-api-token
JIRA_PROJECT_KEY=SE
JIRA_ISSUE_TYPE=Task
```

### Features

- **Dry-Run Mode**: If credentials are missing, the bot runs safely in mock/dry-run mode without crashing.
- **Smart Deduplication**: Prevents duplicate Jira tickets within a 15-minute window for the same client phone and intent.
- **Atlassian Document Format (ADF)**: Generates structured ticket descriptions containing client phone, intent, property code, budget, and chat context.
- **Automatic Urgency Mapping**: Maps lead urgency to Jira priorities (`Highest`, `High`, `Medium`, `Low`).

---

## 3. n8n Automation & Backend API

### A. Importing Workflow 04 into n8n

1. In n8n, navigate to **Workflows** $\rightarrow$ **Add Workflow** $\rightarrow$ **Import from File**.
2. Select [`infra/n8n-workflows/04-jira-lead-sync.json`](file:///h:/last/Main/SE-Vercel-deploy-main/infra/n8n-workflows/04-jira-lead-sync.json).
3. In n8n **Credentials**, create a `Basic Auth` credential:
   - **User**: Your Atlassian email.
   - **Password**: Your Atlassian API token.
4. Attach this credential to the **Create Jira Issue** node.
5. Toggle the workflow to **Active**.

### B. Next.js Web API Route

Clients submitting private viewing requests or web contact forms can dispatch directly into Jira via:

- **Endpoint**: `POST /api/integrations/jira`
- **Payload**:

```json
{
  "phone": "+201012345678",
  "name": "Ahmed Mansour",
  "intent": "viewing_request",
  "propertyCode": "SE-402",
  "budget": "18,000,000 EGP",
  "urgency": "high",
  "message": "Would like a private viewing this Saturday"
}
```

---

## 4. GitHub Repository $\rightarrow$ Jira Workspace Sync

There are two complementary methods to connect GitHub with Jira:

### Method A: Native GitHub for Jira App (Recommended by Atlassian)

1. In Jira, go to **Apps** $\rightarrow$ **Find new apps** $\rightarrow$ Search for **GitHub for Jira** (by Atlassian).
2. Click **Get app**, then click **Configure**.
3. Link your GitHub account or organization (`sierrablue8866-droid`).
4. Select repository `SE-Vercel-deploy-main`.
5. Now, any commit, branch name, or PR containing your Jira issue key (e.g., `SE-101`) will automatically show inside the Jira issue's **Development** panel!

### Method B: Automated GitHub Actions Workflow

This repository includes [`.github/workflows/jira-sync.yml`](file:///h:/last/Main/SE-Vercel-deploy-main/.github/workflows/jira-sync.yml).

To enable automated comment posting when PRs and commits are pushed:

1. Go to your GitHub Repository: **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Add the following repository secrets:
   - `JIRA_BASE_URL`: `https://your-domain.atlassian.net`
   - `JIRA_USER_EMAIL`: your Atlassian email
   - `JIRA_API_TOKEN`: your Atlassian API token

Whenever a branch name (`SE-101-new-feature`), PR title (`[SE-101] Add WhatsApp bot`), or commit message mentions a Jira key, the workflow posts a comment on the ticket linking to the GitHub activity.

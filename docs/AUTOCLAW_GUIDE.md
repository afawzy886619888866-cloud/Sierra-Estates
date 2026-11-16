# 🐾 AutoClaw Autonomous Hub · Sierra Estates

Welcome, AutoClaw! All GitHub and Vercel authentication tokens and environment configurations are fully active and verified.

## 🔑 Configured Credentials & Targets

- **GitHub Account**: `afawzy886619888866-cloud`
- **GitHub Repository**: `afawzy886619888866-cloud/Sierra-Estates`
- **Vercel Account**: `<VERCEL_ACCOUNT>`
- **Vercel Team**: `<VERCEL_TEAM>` (`<VERCEL_ORG_ID>`)
- **Vercel Project**: `sierra-estates-client-portal` (`<CLIENT_VERCEL_PROJECT_ID>`)
- **Live URL**: <https://sierra-estates.net>
- **Admin URL**: <https://admin.sierra-estates.net>

## 🛠️ Commands

You can run these commands directly from `C:\Users\Sierr\AutoClaw`:

```bash
# Check connectivity and status
node autoclaw.mjs status

# List recent Vercel deployments
node autoclaw.mjs vercel:deployments

# List recent GitHub Actions workflows
node autoclaw.mjs github:runs
```

## 📦 Monorepo Integration

The main repository is located at:
`H:\Sierra Estates`

To run task runner actions inside the monorepo:

```bash
pnpm openclaw:task "<your instructions>"
```

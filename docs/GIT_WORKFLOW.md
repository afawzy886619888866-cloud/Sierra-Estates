# GIT WORKFLOW & BRANCHING STRATEGY

This project follows a simplified environment-based branching strategy to ensure safe, reliable deployments.

## 🌿 Core Branches

- `main`: The **Production** branch. Merging into this branch automatically triggers a Vercel deployment to the live domain (`sierra-estates.net`).
- `staging`: The **Pre-production** branch. Used for final QA. Merging into this branch deploys to a stable Vercel Preview URL.

## 🛠️ Feature Branches

All development work should happen in short-lived feature or fix branches:

- `feat/feature-name`
- `fix/bug-name`

**Workflow:**

1. Checkout a new branch from `main`: `git checkout -b feat/my-new-feature`
2. Develop and test locally.
3. Push the branch and create a Pull Request against `staging`.
4. Verify the Vercel Preview deployment for `staging`.
5. Once approved in staging, open a Pull Request from `staging` to `main`.

## 🧹 Maintenance

Do not allow stale branches (like old `copilot/*` or `claude/*` branches) to accumulate. Run `scripts/maintenance/clean-branches.sh` periodically to remove merged branches.

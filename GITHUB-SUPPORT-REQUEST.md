# GitHub Support Request: Purge Cached Commits & Dangling Refs

**Category:** Security / Repository Management & Data Privacy  
**Target Repository:** `afawzy886619888866-cloud/Sierra-Estates`  
**Direct URL:** `https://github.com/afawzy886619888866-cloud/Sierra-Estates`  

---

## Paste-Ready Support Ticket Body

```text
Subject: Request to purge cached commit views and run garbage collection for repository afawzy886619888866-cloud/Sierra-Estates

Hello GitHub Support Team,

I am the owner and administrator of the repository:
https://github.com/afawzy886619888866-cloud/Sierra-Estates

We have recently completed an internal security remediation and credential rotation across all project infrastructure (Supabase service role keys, WhatsApp gateway tokens, and internal database connection URIs). The codebase at HEAD on our main branch is now completely sanitized and verified.

However, during our security review, we identified that historical commits and dangling commit objects from previous iterations still remain viewable through direct SHA URLs and GitHub cache layers.

Could you please assist our team by:
1. Clearing any cached commit views, Pull Request snapshot refs, and internal event caches associated with historical dangling commits for `afawzy886619888866-cloud/Sierra-Estates`.
2. Running an administrative server-side garbage collection (`git gc --prune=now`) on this repository to permanently purge all unreferenced commits that are no longer reachable from any active branch or tag.
3. Confirming that GitHub Secret Scanning and Push Protection remain fully active on this repository.

Thank you very much for your prompt assistance in ensuring our repository is completely sanitized.

Best regards,
Repository Administrator
Sierra Estates
```

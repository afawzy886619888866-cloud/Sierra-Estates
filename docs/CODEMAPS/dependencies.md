<!-- Generated: 2026-08-02 | Files scanned: 5 | Token estimate: ~300 -->

# Sierra Estates Dependencies & Integrations

## Core Frameworks
- **Next.js 15**: Primary React framework for Client and Admin portals.
- **Turborepo**: Monorepo build system and task orchestration.
- **Tailwind CSS v4**: Styling engine.

## Infrastructure & Hosting
- **Vercel**: Edge hosting and CI/CD for Next.js applications.
- **Firebase**: Firestore (Database), Auth (Admin Login), Storage (Images).
- **AWS EC2**: Dedicated compute for python API, background runners, and heavy AI workloads.

## External Services
- **Property Finder API (`api.propertyfinder.com.eg`)**:
  - Outbound: Pushing listings to the PF portal.
  - Inbound: Receiving leads via Webhooks.
- **WhatsApp Cloud API (Meta)**:
  - Messaging channel for automated AI follow-ups and lead nurturing.
- **Google AI (Gemini)**:
  - LLM backend for intelligent routing, neural match scoring, and conversational agents (Leila/Matchmaker).

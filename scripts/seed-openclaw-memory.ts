import { obsidian } from '../packages/obsidian/src/index';

async function seedOpenClawMemory() {
  console.log('🧠 Seeding OpenClaw & Google Vertex AI shared project memory...');

  const projectKnowledge = [
    {
      id: 'proj-arch-sierra-estates',
      value: {
        title: 'Sierra Estates Platform Architecture',
        description: 'Multi-tenant real estate platform with Client Portal (sierra-estates-client-page), Admin Dashboard (sierra-estates-admin-page), WhatsApp agents (OpenClaw, Liela, Hermes, Sierra, Closer), and Google Vertex AI integration.',
        techStack: 'Next.js 16 App Router, React 19, Tailwind CSS v4, Google GenAI / Vertex AI, Firebase / Firestore, pnpm workspace monorepo.',
        primaryDomain: 'sierra-estates.net',
        adminDomain: 'admin.sierra-estates.net',
      },
      tags: ['openclaw', 'vertex-agent', 'project-knowledge', 'architecture'],
    },
    {
      id: 'proj-whatsapp-openclaw-bot',
      value: {
        title: 'OpenClaw WhatsApp Bot Integration',
        numbers: ['+20 109 204 8333', '+20 106 139 9688'],
        capabilities: ['Add real estate listings', 'Edit inventory pricing', 'Generate inventory reports', 'Semantic search', 'Concierge & Lead qualification'],
        agentRouting: 'Primary: OpenClaw, Supporting: Sierra & Hermes',
      },
      tags: ['openclaw', 'vertex-agent', 'whatsapp', 'bot-routing'],
    },
    {
      id: 'proj-gcp-vertex-config',
      value: {
        title: 'Google Vertex AI & Cloud Configuration',
        project: 'sierra-estates-core',
        location: 'us-central1',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
        grounding: 'GenAI App Builder & Vertex AI Search Datastore',
        sharedMemoryBus: 'Obsidian Memory Engine (obsidian-store.json)',
      },
      tags: ['openclaw', 'vertex-agent', 'gcp', 'vertex-ai'],
    },
  ];

  for (const item of projectKnowledge) {
    await obsidian.set(item.id, item.value, item.tags);
    console.log(`  ✓ Seeded memory: ${item.id}`);
  }

  console.log('✅ OpenClaw & Vertex AI memory seeding complete!');
}

seedOpenClawMemory().catch((err) => {
  console.error('❌ Memory seeding failed:', err);
  process.exit(1);
});

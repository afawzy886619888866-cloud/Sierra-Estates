import type { Metadata } from 'next';
import AgentIntelligenceShell from './AgentIntelligenceShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Agent Intelligence · Admin' };

export default function Page() {
  return <AgentIntelligenceShell />;
}

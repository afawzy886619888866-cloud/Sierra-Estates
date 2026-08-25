import type { Metadata } from 'next';
import AgentIntelligence from './AgentIntelligence';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Agent Intelligence · Admin' };

export default function Page() {
  return <AgentIntelligence />;
}

import type { Metadata } from 'next';
import TodosBoard from './TodosBoard';

export const metadata: Metadata = {
  title: 'Team Tasks — Live Supabase Quickstart',
  description:
    'Sierra Estates team task board — the end-to-end Supabase quickstart. Create, toggle, and delete tasks synced live to the public.todos Postgres table under row-level security.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <TodosBoard />;
}

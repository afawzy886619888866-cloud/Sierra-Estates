import type { Metadata } from 'next';
import TodosBoard from './TodosBoard';

export const metadata: Metadata = {
  title: 'Team Tasks — Supabase Auth + RLS Quickstart',
  description:
    'Sierra Estates team task board — a per-user Supabase quickstart behind Supabase Auth and row-level security: every task is scoped to its owner in Postgres.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <TodosBoard />;
}

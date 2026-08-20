import type { Metadata } from 'next';
import '../../site-styles/matches.css';
import '../../site-styles/site-refinements.css';
import MatchesPage from './MatchesPage';

export const metadata: Metadata = {
  title: 'Smart Match',
  description: 'Set your budget and needs; Sierra ranks live New Cairo inventory by how well it fits.',
};

export default function Page() {
  return <MatchesPage />;
}

import '../client/houzez.css';
import ExplorePortal from '../client/ExplorePortal';

export const metadata = {
  title: 'Sierra Estates · 3D Explorer',
  description:
    'Explore New Cairo in 3D — every compound rendered as a tower sized and coloured by price. Filter by budget and drill into the units.',
};

export default function ExplorePage() {
  return <ExplorePortal />;
}

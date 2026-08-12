import '../../client/houzez.css';
import PropertyDetail from '../../client/PropertyDetail';

export const metadata = {
  title: 'Sierra Estates · Property',
  description: 'AI-curated New Cairo property — verified on-site, priced against live market data.',
};

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetail id={id} />;
}

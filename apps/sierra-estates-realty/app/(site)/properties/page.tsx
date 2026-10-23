import type { Metadata } from 'next';
import '../../site-styles/properties.css';
import PropertiesPage from './PropertiesPage';

export const metadata: Metadata = {
  title: 'Properties Catalog',
  description:
    'AI-curated rent & resale inventory across New Cairo, every unit verified on-site.',
};

export default function Page() {
  return <PropertiesPage />;
}

import '../command-center.css';
import PropertiesConsole from '@/components/admin/command-center/PropertiesConsole';

export const metadata = {
  title: 'Inventory & Freshness · Sierra Estates Command Center',
  description: 'Verified / stale / sold lifecycle, se_code uniqueness and the 90% freshness discipline.',
};

export const dynamic = 'force-dynamic';

/**
 * INVENTORY & FRESHNESS CONTROL — manages public.listings through the
 * command-center vocabulary (verified / stale / sold), tracks freshness_score
 * (target ≥ 90%) and enforces se_code uniqueness. See
 * /api/admin/properties/* for the write contracts.
 */
export default function PropertiesPage() {
  return <PropertiesConsole />;
}

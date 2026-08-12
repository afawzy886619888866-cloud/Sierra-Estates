import '../client/houzez.css';
import InventoryPortal from '../client/InventoryPortal';

export const metadata = {
  title: 'Sierra Estates · Inventory Map',
  description:
    'Live map of Sierra Estates rent & resale inventory across New Cairo — sourced from the owner inventory and plotted by compound.',
};

export default function InventoryPage() {
  return <InventoryPortal />;
}

import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import ListingNetMap from '@/components/site/ListingNetMap';
import '../site-styles/net-radar.css';

export const metadata: Metadata = {
  title: 'شبكة اصطياد الوحدات ورادار التوافر الفوري | Sierra Estates',
  description:
    'اختر حتى 40 وحدة من خريطة ورادار القاهرة الجديدة واطلب التوافر والصور الفورية المعتمدة عبر واتساب خلال ساعة واحدة.',
};

export default function NetRadarPage() {
  return (
    <SiteShell active="net">
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(1100px 500px at 70% -10%, rgba(201, 148, 54, 0.08), transparent 60%), #070b14',
          paddingTop: 96,
          paddingBottom: 80,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <ListingNetMap />
        </div>
      </div>
    </SiteShell>
  );
}

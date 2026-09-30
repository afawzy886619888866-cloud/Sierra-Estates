import type { Metadata } from 'next';
<<<<<<< HEAD
import ListingNetMap from '@/components/site/ListingNetMap';
=======
import SiteShell from '@/components/site/SiteShell';
import ListingNetMap from '@/components/site/ListingNetMap';
import '../../site-styles/net-radar.css';
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1

export const metadata: Metadata = {
  title: 'شبكة اصطياد الوحدات ورادار التوافر الفوري | Sierra Estates',
  description:
    'اختر حتى 40 وحدة من خريطة ورادار القاهرة الجديدة واطلب التوافر والصور الفورية المعتمدة عبر واتساب خلال ساعة واحدة.',
};

export default function NetRadarPage() {
  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-[#070b14] pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <ListingNetMap />
    </div>
=======
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
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  );
}

import type { Metadata } from 'next';
import ListingNetMap from '@/components/site/ListingNetMap';

export const metadata: Metadata = {
  title: 'شبكة اصطياد الوحدات ورادار التوافر الفوري | Sierra Estates',
  description:
    'اختر حتى 40 وحدة من خريطة ورادار القاهرة الجديدة واطلب التوافر والصور الفورية المعتمدة عبر واتساب خلال ساعة واحدة.',
};

export default function NetRadarPage() {
  return (
    <div className="min-h-screen bg-[#070b14] pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <ListingNetMap />
    </div>
  );
}

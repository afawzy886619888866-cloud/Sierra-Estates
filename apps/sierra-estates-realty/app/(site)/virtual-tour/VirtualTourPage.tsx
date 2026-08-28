'use client';

/** Port of deploy/virtual-tour.html — the full-page 3D walkthrough. */
import React from 'react';
import Link from 'next/link';
import { Video, DoorOpen, Glasses, Grid2x2, ArrowRight } from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import VirtualTourBanner from '@/components/site/VirtualTourBanner';
import { Reveal, RevealGroup, revealChild } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { motion } from 'framer-motion';

const FEATURES = [
  { icon: Video, en: 'Cinematic 4K capture', ar: 'تصوير سينمائي 4K', descEn: 'Every room shot in high dynamic range so materials, light and depth read true.', descAr: 'كل غرفة مصوّرة بمدى ديناميكي عالٍ لتظهر الخامات والإضاءة والعمق على حقيقتها.' },
  { icon: DoorOpen, en: 'Room-by-room walkthrough', ar: 'تجوّل غرفة بغرفة', descEn: 'Move through the unit the way you would on a viewing — at your own pace.', descAr: 'تنقّل داخل الوحدة كما لو كنت في معاينة حقيقية، وبالسرعة التي تريدها.' },
  { icon: Glasses, en: 'VR-ready', ar: 'جاهز لنظارات VR', descEn: 'Open the same tour in a headset for a true sense of scale.', descAr: 'افتح نفس الجولة عبر نظارة الواقع الافتراضي لإحساس حقيقي بالمساحة.' },
  { icon: Grid2x2, en: 'Measured floor plan', ar: 'مخطط بمقاسات دقيقة', descEn: 'Switch to the dollhouse view to check flow and room proportions.', descAr: 'انتقل لعرض المخطط لتتأكد من توزيع المساحات والنسب.' },
];

export default function VirtualTourPage() {
  const { isAr } = useSite();

  return (
    <SiteShell active={null}>
      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
            <span className="sep">/</span>
            <span>{isAr ? 'الجولة ثلاثية الأبعاد' : '3D Virtual Tour'}</span>
          </div>
          <h1>{isAr ? 'الجولة ثلاثية الأبعاد' : '3D Virtual Tour'}</h1>
          <p className="sub">
            {isAr
              ? 'تجوّل داخل وحدات سييرا المميزة قبل أن تحجز معاينة — بدقة سينمائية ومن أي جهاز.'
              : 'Walk through Sierra’s signature units before you book a viewing — cinematic fidelity, from any device.'}
          </p>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          <VirtualTourBanner />
        </div>
      </section>

      <section className="block well">
        <div className="wrap">
          <Reveal className="sec-head">
            <div>
              <h2>{isAr ? 'ما الذي يميز جولة سييرا' : 'What makes a Sierra tour different'}</h2>
              <p>
                {isAr
                  ? 'ليست صورًا بانورامية — بل نموذج مكاني كامل تتحرك بداخله.'
                  : 'Not a panorama reel — a full spatial model you actually move through.'}
              </p>
            </div>
          </Reveal>

          <RevealGroup className="grid-feat">
            {FEATURES.map((f) => (
              <motion.div className="feat" key={f.en} variants={revealChild}>
                <div className="ic"><f.icon className="i" /></div>
                <h4>{isAr ? f.ar : f.en}</h4>
                <p>{isAr ? f.descAr : f.descEn}</p>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Interactive VIP Appointment Booking Section */}
      <section className="block">
        <div className="wrap">
          <Reveal className="cta" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 20 }}>
            <div className="ct-txt">
              <h2>{isAr ? 'احجز موعد معاينة VIP حصرية' : 'Book an Exclusive VIP On-Site Viewing'}</h2>
              <p>
                {isAr
                  ? 'اختر التوقيت المناسب وسيقوم مستشارك العقاري بتجهيز كافة التفاصيل قبل وصولك.'
                  : 'Select your preferred time window and your dedicated property advisor will coordinate access.'}
              </p>
            </div>

            {/* Time Slot Picker */}
            {(() => {
              const [selectedSlot, setSelectedSlot] = React.useState('afternoon');
              const [selectedDay, setSelectedDay] = React.useState('tomorrow');

              const days = [
                { id: 'today', labelEn: 'Today', labelAr: 'اليوم' },
                { id: 'tomorrow', labelEn: 'Tomorrow', labelAr: 'غداً' },
                { id: 'weekend', labelEn: 'This Weekend', labelAr: 'عطلة نهاية الأسبوع' },
              ];

              const slots = [
                { id: 'morning', labelEn: '🌅 Morning (10 AM - 1 PM)', labelAr: '🌅 صباحاً (10 ص - 1 ظ)' },
                { id: 'afternoon', labelEn: '☀️ Afternoon (1 PM - 5 PM)', labelAr: '☀️ بعد الظهر (1 ظ - 5 م)' },
                { id: 'sunset', labelEn: '🌇 Sunset (5 PM - 8 PM)', labelAr: '🌇 وقت الغروب (5 م - 8 م)' },
              ];

              const targetDay = days.find((d) => d.id === selectedDay)?.labelEn || 'Tomorrow';
              const targetSlot = slots.find((s) => s.id === selectedSlot)?.labelEn || 'Afternoon';

              const waMessage = `Hello Sierra Estates — I'd like to book a VIP viewing on ${targetDay} during the ${targetSlot} window.`;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {days.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDay(d.id)}
                        className={`af-chip${selectedDay === d.id ? ' on' : ''}`}
                        style={{ border: '1px solid var(--line)', padding: '6px 14px' }}
                      >
                        {isAr ? d.labelAr : d.labelEn}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {slots.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSlot(s.id)}
                        className={`af-chip${selectedSlot === s.id ? ' on' : ''}`}
                        style={{ border: '1px solid var(--line)', padding: '6px 14px' }}
                      >
                        {isAr ? s.labelAr : s.labelEn}
                      </button>
                    ))}
                  </div>

                  <div className="ct-act" style={{ marginTop: 8 }}>
                    <a
                      href={`https://wa.me/201092048333?text=${encodeURIComponent(waMessage)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-white"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <span>{isAr ? 'تأكيد الحجز الفوري عبر واتساب' : 'Confirm VIP Booking via WhatsApp'}</span>
                      <ArrowRight className="i" />
                    </a>
                  </div>
                </div>
              );
            })()}
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Target, TrendingUp } from 'lucide-react';

interface AboutPhilosophyProps {
  isArabic?: boolean;
}

export default function AboutPhilosophy({ isArabic = false }: AboutPhilosophyProps) {
  const features = [
    {
      icon: <Shield className="text-[#C9A84C]" size={24} />,
      title: isArabic ? 'انتقاء فائق للخصوصية' : 'Bespoke Discretion',
      desc: isArabic
        ? 'نقوم بتصفية السوق يدوياً للوصول إلى العقارات الحصرية التي تناسب معاييرك تماماً دون أي إزعاج.'
        : 'Our properties are scouted by hand and negotiated behind closed doors to ensure absolute discretion and pricing integrity.',
    },
    {
      icon: <Target className="text-[#C9A84C]" size={24} />,
      title: isArabic ? 'مطابقة قائمة على البيانات' : 'Precision Matchmaking',
      desc: isArabic
        ? 'نستخدم خوارزميات ذكية لحساب العائد على الاستثمار الفعلي وتوقع معدلات النمو بعيداً عن التخمينات.'
        : 'Say goodbye to duplicate ads and stale pricing. Our deterministic matching matches you with vetted active listings.',
    },
    {
      icon: <TrendingUp className="text-[#C9A84C]" size={24} />,
      title: isArabic ? 'مستشار خاص طوال اليوم' : 'Four-Second Concierge',
      desc: isArabic
        ? 'يتعامل معك مستشار مالي وعقاري مخصص للإجابة على جميع تساؤلاتك وحجز الزيارات الفورية.'
        : 'A dedicated elite advisor on direct WhatsApp line who knows your portfolio criteria and responds within four seconds.',
    },
  ];

  return (
    <section className="py-24 bg-[#0A1628] border-t border-white/5 relative overflow-hidden" id="philosophy">
      {/* Decorative background shape */}
      <div className="absolute right-0 top-1/4 w-[400px] h-[400px] bg-[#C9A84C]/5 rounded-full filter blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Left Block */}
          <div className={`lg:col-span-5 ${isArabic ? 'text-right lg:order-2' : 'text-left'}`}>
            <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-[#C9A84C] uppercase mb-3 block">
              {isArabic ? 'فلسفة الخدمة' : 'Our Philosophy'}
            </span>
            
            <h2 className="font-playfair text-4xl md:text-5xl text-white font-light leading-tight mb-8">
              {isArabic ? (
                <>
                  أبعد من الوساطة. <br />
                  <span className="italic text-[#C9A84C]">قرارات أصح.</span>
                </>
              ) : (
                <>
                  Beyond Brokerage. <br />
                  <span className="italic text-[#C9A84C]">Smarter Decisions.</span>
                </>
              )}
            </h2>

            <p className="text-white/75 text-sm md:text-base leading-relaxed font-light mb-8">
              {isArabic
                ? 'في سييرا إستيتس، نؤمن بأن العقار الفاخر ليس مجرد مساحة للمعيشة، بل هو أصل استثماري ذو قيمة عالية يتطلب معالجة مبنية على البيانات والحكمة والسرعة القصوى.'
                : 'We operate as a private real estate office rather than a mass brokerage. By combining elite human expertise with real-time scraping data and AI intelligence, we secure assets that build generational wealth.'}
            </p>
          </div>

          {/* Right Block */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-1 gap-8">
            {features.map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: isArabic ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: idx * 0.15 }}
                className="flex gap-6 p-6 rounded-2xl bg-[#142850]/20 border border-white/5 hover:border-[#C9A84C]/20 transition-all duration-300"
                style={{ flexDirection: isArabic ? 'row-reverse' : 'row' }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
                  {feat.icon}
                </div>
                <div className={isArabic ? 'text-right' : 'text-left'}>
                  <h3 className="font-playfair text-lg text-white font-medium mb-2">{feat.title}</h3>
                  <p className="text-white/60 text-xs md:text-sm leading-relaxed font-light">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

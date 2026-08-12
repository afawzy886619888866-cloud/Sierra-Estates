'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Bed, Bath, Maximize } from 'lucide-react';

interface Estate {
  id: string;
  title: string;
  compound: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  area: string;
  img: string;
  tag?: string;
}

const ESTATES_DATA: Estate[] = [
  {
    id: 'est-1',
    title: 'Villa Lumière',
    compound: 'Mivida',
    location: 'Fifth Settlement, New Cairo',
    price: 'EGP 32,500,000',
    beds: 5,
    baths: 6,
    area: '480 m²',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&fit=crop',
    tag: 'Exclusive',
  },
  {
    id: 'est-2',
    title: 'The Alabaster Estate',
    compound: 'Uptown Cairo',
    location: 'Mokattam, Cairo',
    price: 'EGP 48,000,000',
    beds: 6,
    baths: 7,
    area: '620 m²',
    img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=800&fit=crop',
    tag: 'Featured',
  },
  {
    id: 'est-3',
    title: 'Modernist Sanctuary',
    compound: 'Mountain View iCity',
    location: 'New Cairo',
    price: 'EGP 24,200,000',
    beds: 4,
    baths: 4,
    area: '360 m²',
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&fit=crop',
    tag: 'High ROI',
  },
];

interface FeaturedEstatesProps {
  isArabic?: boolean;
}

export default function FeaturedEstates({ isArabic = false }: FeaturedEstatesProps) {
  return (
    <section className="py-24 bg-[#0A1628]" id="portfolio">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className={isArabic ? 'text-right' : 'text-left'}>
            <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-[#C9A84C] uppercase mb-3 block">
              {isArabic ? 'مجموعات حصرية' : 'Curated Portfolio'}
            </span>
            <h2 className="font-playfair text-4xl md:text-5xl text-white font-light leading-tight">
              {isArabic ? (
                <>
                  عقارات تستحق <span className="italic text-[#C9A84C]">اهتمامك</span>
                </>
              ) : (
                <>
                  Featured <span className="italic text-[#C9A84C]">Estates</span>
                </>
              )}
            </h2>
          </div>
          <button className="px-6 py-3 border border-[#C9A84C]/30 text-[#C9A84C] text-xs font-mono uppercase tracking-widest hover:bg-[#C9A84C] hover:text-[#0A1628] transition-all duration-300">
            {isArabic ? 'عرض كل المعروضات' : 'View All Assets'}
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {ESTATES_DATA.map((estate, idx) => (
            <motion.div
              key={estate.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: idx * 0.15 }}
              whileHover={{ y: -8 }}
              className="group relative bg-[#142850]/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl hover:border-[#C9A84C]/30 transition-all duration-500"
            >
              {/* Image & Tag */}
              <div className="relative h-72 overflow-hidden">
                <img
                  src={estate.img}
                  alt={estate.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/90 via-transparent to-transparent opacity-80" />
                
                {estate.tag && (
                  <span className="absolute top-4 left-4 bg-[#C9A84C] text-[#0A1628] text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    {estate.tag}
                  </span>
                )}
              </div>

              {/* Specs and Details */}
              <div className="p-8">
                <span className="text-[10px] font-mono text-[#C9A84C] uppercase tracking-widest mb-2 block">
                  {estate.compound} · {estate.location.split(',')[0]}
                </span>
                
                <h3 className="font-playfair text-xl text-white font-medium mb-4 group-hover:text-[#C9A84C] transition-colors duration-300">
                  {estate.title}
                </h3>

                {/* Spec Icons */}
                <div className="flex gap-6 text-white/60 text-xs mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Bed size={14} className="text-[#C9A84C]" />
                    <span>{estate.beds} Beds</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bath size={14} className="text-[#C9A84C]" />
                    <span>{estate.baths} Baths</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Maximize size={14} className="text-[#C9A84C]" />
                    <span>{estate.area}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Asking Price</span>
                    <span className="font-playfair text-lg text-white font-semibold">{estate.price}</span>
                  </div>
                  
                  <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#C9A84C] group-hover:bg-[#C9A84C] transition-all duration-300">
                    <ArrowUpRight size={16} className="text-white group-hover:text-[#0A1628] transition-all duration-300" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

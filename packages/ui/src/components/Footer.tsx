'use client';

import React from 'react';

interface FooterProps {
  isArabic?: boolean;
}

export default function Footer({ isArabic = false }: FooterProps) {
  return (
    <footer
      className="bg-[#0A1628] pt-20 pb-10 border-t border-[#C9A84C]/20 text-white"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* BRAND COLUMN */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 rounded-full border border-[#C9A84C] flex items-center justify-center">
                <div className="w-3 h-3 bg-[#C9A84C] rotate-45" />
              </div>
              <span className="font-playfair text-xl font-bold tracking-widest uppercase">
                Sierra Estates
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-6 font-light">
              {isArabic
                ? 'نعيد تعريف الفخامة. عقارات استثنائية لمن يطمح للتميز.'
                : 'Redefining luxury real estate. Exceptional properties for the discerning buyer.'}
            </p>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h4 className="font-playfair text-[#C9A84C] text-lg mb-6 italic tracking-wider">
              {isArabic ? 'روابط سريعة' : 'Quick Links'}
            </h4>
            <ul className="space-y-4 text-sm text-white/70 font-light">
              <li><a href="#" className="hover:text-[#C9A84C] transition-colors">Portfolio</a></li>
              <li><a href="#" className="hover:text-[#C9A84C] transition-colors">Philosophy</a></li>
              <li><a href="#" className="hover:text-[#C9A84C] transition-colors">Valuation</a></li>
              <li><a href="#" className="hover:text-[#C9A84C] transition-colors">Journal</a></li>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h4 className="font-playfair text-[#C9A84C] text-lg mb-6 italic tracking-wider">
              {isArabic ? 'تواصل معنا' : 'Contact'}
            </h4>
            <ul className="space-y-4 text-sm text-white/70 font-light">
              <li>+20 10 0000 0000</li>
              <li>concierge@sierraestates.com</li>
              <li>Uptown Cairo, Egypt</li>
            </ul>
          </div>

          {/* NEWSLETTER */}
          <div className="col-span-1 md:col-span-1">
            <h4 className="font-playfair text-[#C9A84C] text-lg mb-6 italic tracking-wider">
              {isArabic ? 'النشرة الإخبارية' : 'Newsletter'}
            </h4>
            <p className="text-white/60 text-xs mb-4 font-light">
              {isArabic ? 'احصل على وصول حصري لأحدث العقارات' : 'Exclusive access to off-market listings.'}
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder={isArabic ? 'البريد الإلكتروني' : 'Email address'}
                className="bg-white/5 border border-white/20 px-4 py-2 text-sm w-full outline-none focus:border-[#C9A84C] transition-colors"
              />
              <button className="bg-[#C9A84C] text-[#0A1628] px-4 py-2 text-sm font-bold uppercase hover:bg-[#B8973B] transition-colors">
                {isArabic ? 'اشتراك' : 'Join'}
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40 font-light">
          <p>© {new Date().getFullYear()} Sierra Estates. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

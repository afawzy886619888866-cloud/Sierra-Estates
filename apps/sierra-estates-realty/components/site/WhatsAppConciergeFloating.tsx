'use client';

import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';

const DEFAULT_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+201032206443';

export default function WhatsAppConciergeFloating() {
  const { t, isAr } = useSite();
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  const cleanPhone = DEFAULT_PHONE.replace(/[^0-9]/g, '');

  const quickPrompts = isAr
    ? [
        { title: 'استفسار عن كمبوندات التجمع الخامس', text: 'مرحباً، أود الاستفسار عن الوحدات المتاحة في كمبوندات التجمع الخامس (ميفيدا، هايد بارك، ماونتن فيو).' },
        { title: 'حساب خطة السداد والعائد الاستثماري', text: 'مرحباً، أريد حساب خطة السداد والعائد الاستثماري المتوقع لوحدات كايرو بلازا.' },
        { title: 'طلب حجز موعد معاينة خاصة (VIP)', text: 'مرحباً، أود حجز موعد معاينة خاصة لوحدات مميزة.' },
      ]
    : [
        { title: 'Inquire about New Cairo Compounds', text: 'Hello, I would like to inquire about available units in New Cairo compounds (Mivida, Hyde Park, MV iCity).' },
        { title: 'Calculate ROI & Installment Plans', text: 'Hello, I want to calculate installment plans and expected ROI for Cairo Plaza properties.' },
        { title: 'Book a Private VIP Tour', text: 'Hello, I would like to arrange a private VIP viewing tour for selected luxury properties.' },
      ];

  const handleSend = (text: string) => {
    const message = encodeURIComponent(text.trim() || (isAr ? 'مرحباً، أود التواصل مع مستشار سييرا العقاري.' : 'Hello, I would like to speak with a Sierra Estates consultant.'));
    const url = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: 28, [isAr ? 'left' : 'right']: 28, zIndex: 9999, fontFamily: 'inherit' }}>
      {/* Concierge Micro Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 74,
            [isAr ? 'left' : 'right']: 0,
            width: 320,
            background: 'var(--card-bg, #0f172a)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: 16,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(0, 174, 255, 0.1)',
            backdropFilter: 'blur(16px)',
            overflow: 'hidden',
            animation: 'fadeUp 0.25s ease-out forwards',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(0, 174, 255, 0.1))',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00AEFF, #1E88D9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 0 10px rgba(0, 174, 255, 0.4)',
                  position: 'relative',
                }}
              >
                <Sparkles size={18} />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '2px solid #0f172a',
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isAr ? 'ليلى · مستشارة سييرا AI' : 'Laila · Sierra Concierge'}
                  <ShieldCheck size={14} color="#00AEFF" />
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{isAr ? 'متاحة الآن عبر واتساب' : 'Active on WhatsApp · Instant'}</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Prompts */}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#cbd5e1', fontWeight: 600 }}>
              {isAr ? 'استفسارات سريعة:' : 'Quick Inquiries:'}
            </div>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.text)}
                style={{
                  textAlign: isAr ? 'right' : 'left',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: '9px 12px',
                  color: '#e2e8f0',
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 174, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(0, 174, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <span>{p.title}</span>
                <ChevronRight size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
              </button>
            ))}

            {/* Custom Input */}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input
                type="text"
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(customMsg)}
                placeholder={isAr ? 'اكتب رسالتك الخاصة…' : 'Type custom message…'}
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 8,
                  padding: '7px 10px',
                  fontSize: 11,
                  color: '#f8fafc',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handleSend(customMsg)}
                style={{
                  background: '#25D366',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 12px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Send WhatsApp"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4), 0 0 16px rgba(0, 174, 255, 0.25)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        aria-label="Open WhatsApp VIP Concierge"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#00AEFF',
              border: '2px solid #fff',
              display: 'block',
              animation: 'pulse 1.8s infinite',
            }}
          />
        )}
      </button>
    </div>
  );
}

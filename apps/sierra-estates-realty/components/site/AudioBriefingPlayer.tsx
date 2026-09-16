'use client';

import React, { useState, useRef } from 'react';

interface AudioBriefingPlayerProps {
  propertyCode?: string;
  compound?: string;
  unitType?: string;
  price?: number | string;
  areaSqm?: number;
  initialLanguage?: 'ar-EG' | 'en-US';
}

export default function AudioBriefingPlayer({
  propertyCode = 'SE-MIV-01',
  compound = 'Mivida',
  unitType = 'Apartment',
  price = 12500000,
  areaSqm = 185,
  initialLanguage = 'ar-EG',
}: AudioBriefingPlayerProps) {
  const [lang, setLang] = useState<'ar-EG' | 'en-US'>(initialLanguage);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFetchAndPlay = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/audio-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sierraCode: propertyCode,
          compound,
          unitType,
          priceEGP: typeof price === 'number' ? price : parseInt(String(price).replace(/\D/g, ''), 10) || 12000000,
          areaSqm,
          language: lang,
        }),
      });

      const data = await res.json();
      if (data.success && data.briefing) {
        setTranscript(data.briefing.spokenScript);
        setMetrics(data.briefing.financialMetrics);

        if (data.briefing.audioBase64) {
          if (!audioRef.current) {
            audioRef.current = new Audio(data.briefing.audioBase64);
            audioRef.current.onended = () => setIsPlaying(false);
          } else {
            audioRef.current.src = data.briefing.audioBase64;
          }
          await audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(20, 24, 33, 0.95), rgba(13, 17, 23, 0.98))',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '16px',
        padding: '18px 22px',
        color: '#f3f4f6',
        fontFamily: 'inherit',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        maxWidth: '640px',
        margin: '16px auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>🎙️</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#d4af37' }}>
              {lang === 'ar-EG' ? 'الإيجاز الصوتي الذكي' : 'AI Audio Briefing'}
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
              {compound} · {propertyCode}
            </p>
          </div>
        </div>

        {/* Language Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '2px' }}>
          <button
            type="button"
            onClick={() => setLang('ar-EG')}
            style={{
              background: lang === 'ar-EG' ? '#d4af37' : 'transparent',
              color: lang === 'ar-EG' ? '#000' : '#d1d5db',
              border: 'none',
              borderRadius: '16px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            عربي
          </button>
          <button
            type="button"
            onClick={() => setLang('en-US')}
            style={{
              background: lang === 'en-US' ? '#d4af37' : 'transparent',
              color: lang === 'en-US' ? '#000' : '#d1d5db',
              border: 'none',
              borderRadius: '16px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            EN
          </button>
        </div>
      </div>

      {/* Player Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px' }}>
        <button
          type="button"
          onClick={handleFetchAndPlay}
          disabled={isLoading}
          style={{
            background: '#d4af37',
            color: '#111827',
            border: 'none',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            cursor: isLoading ? 'wait' : 'pointer',
            boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
            flexShrink: 0,
          }}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
            <span>{isPlaying ? 'Playing Spoken Analysis...' : '60s Investor Summary'}</span>
            <span>{metrics ? `${metrics.projectedAnnualYieldPct}% Est. Yield` : 'Voice Synthesis'}</span>
          </div>
          <div
            style={{
              height: '4px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: isPlaying ? '100%' : '0%',
                height: '100%',
                background: '#d4af37',
                transition: isPlaying ? 'width 3s linear' : 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Transcript Text Accordion */}
      {transcript && (
        <div
          style={{
            marginTop: '12px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '12px',
            lineHeight: 1.6,
            color: '#e5e7eb',
            borderLeft: '3px solid #d4af37',
          }}
        >
          {transcript}
        </div>
      )}
    </div>
  );
}

'use client';
/* cspell:disable */

import React, { useState, useEffect, useMemo } from 'react';
import { HarnessBenchmarkCard } from '@/components/admin/HarnessBenchmarkCard';

interface Scenario {
  id: string;
  category: string;
  prompt: string;
  maxLatencyMs: number;
  minAccuracyScore: number;
  expectedKeys: string[];
}

interface VaultNote {
  filename: string;
  title: string;
  sizeBytes: number;
  modifiedAt: string;
  tags: string[];
  excerpt: string;
}

interface MemPalaceRoom {
  room: string;
  count: number;
  recent: Array<{ id: string; drawer: string; content: string; timestamp: string }>;
}

interface MemoryBrainViewProps {
  lang?: string;
  onNavigate?: (tab: string) => void;
}

export default function MemoryBrainView({ lang = 'en', onNavigate: _onNavigate }: MemoryBrainViewProps) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'deepseek' | 'obsidian' | 'ecc' | 'mempalace'>('deepseek');
  const [_loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');

  // Load telemetry
  const loadBrainData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory/brain');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn('Failed to load memory brain data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrainData();
  }, []);

  // Fetch single note
  const handleOpenNote = async (filename: string) => {
    setSelectedNote(filename);
    setNoteLoading(true);
    try {
      const res = await fetch(`/api/memory/brain?action=note_content&file=${encodeURIComponent(filename)}`);
      if (res.ok) {
        const json = await res.json();
        setNoteContent(json.content || '');
      } else {
        setNoteContent('Failed to load note content.');
      }
    } catch (_e) {
      setNoteContent('Error reading note.');
    } finally {
      setNoteLoading(false);
    }
  };

  // Search MemPalace
  const handleMemPalaceSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const roomParam = selectedRoom !== 'all' ? `&room=${selectedRoom}` : '';
      const res = await fetch(`/api/memory/brain?action=mempalace_search&q=${encodeURIComponent(searchQuery)}${roomParam}`);
      if (res.ok) {
        const json = await res.json();
        setSearchResults(json.results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const filteredNotes = useMemo(() => {
    if (!data?.obsidian?.notes) return [];
    if (!searchQuery.trim() || activeTab !== 'obsidian') return data.obsidian.notes;
    const q = searchQuery.toLowerCase();
    return data.obsidian.notes.filter(
      (n: VaultNote) =>
        n.title.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q)) ||
        n.excerpt.toLowerCase().includes(q)
    );
  }, [data, searchQuery, activeTab]);

  return (
    <div className="fade-up" style={{ padding: '4px 0 32px 0' }}>
      {/* Top Architectural Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(8, 20, 35, 0.95) 0%, rgba(13, 31, 53, 0.92) 100%)',
          border: '1px solid rgba(197, 160, 89, 0.25)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 12px 36px rgba(0,0,0,0.45), inset 0 1px 0 rgba(197, 160, 89, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>🧠</span>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10.5,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: '#c5a059',
                fontWeight: 700,
              }}
            >
              {isAr ? 'الذاكرة المركزية الموحدة · سييرا أو إس' : 'Unified Intelligence Engine · Sierra OS'}
            </span>
            <span
              style={{
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                padding: '2px 8px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '.05em',
              }}
            >
              ● {isAr ? 'نشط ومربوط' : 'ONLINE & SYNCED'}
            </span>
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: '#f8fafc',
              margin: '0 0 6px 0',
              fontFamily: isAr ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {isAr
              ? 'محرك الذاكرة المعرفية وذكاء DeepSeek'
              : 'Memory Brain, DeepSeek Harness & Obsidian Vault'}
          </h1>

          <p style={{ fontSize: 13, color: 'rgba(241, 245, 249, 0.7)', margin: 0, maxWidth: 680, lineHeight: 1.5 }}>
            {isAr
              ? 'يدمج محرك الذاكرة الموحد معايير تقييم DeepSeek العصبية مع مستودع ملاحظات Obsidian وسجل السياق اللحظي (ECC) وقصر الذاكرة المتجهي (MemPalace).'
              : 'Unifies DeepSeek-V3 deterministic reasoning benchmarks, the 18-note Obsidian Markdown Knowledge Vault, Episodic Context Cache (ECC) entity graphs, and spatial vector recall in MemPalace.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={loadBrainData}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(197, 160, 89, 0.3)',
              background: 'rgba(8, 20, 35, 0.7)',
              color: '#f8fafc',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <span>🔄</span>
            <span>{isAr ? 'تحديث المقاييس' : 'Refresh State'}</span>
          </button>
          <button
            onClick={() => setActiveTab('deepseek')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #c5a059 0%, #dfba73 100%)',
              color: '#071422',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(197, 160, 89, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚡</span>
            <span>{isAr ? 'تشغيل اختبار DeepSeek' : 'Run Benchmark'}</span>
          </button>
        </div>
      </div>

      {/* 4-Pillar Segmented Navigation Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            id: 'deepseek',
            icon: '🎯',
            title: isAr ? 'مقياس ذكاء DeepSeek' : 'DeepSeek Harness',
            badge: '10 SCENARIOS',
            desc: isAr ? 'نماذج الاستدلال والتقييم الحتمي' : 'Deterministic reasoning benchmarks',
            accent: '#c5a059',
          },
          {
            id: 'obsidian',
            icon: '🗄️',
            title: isAr ? 'مستودع Obsidian' : 'Obsidian Vault',
            badge: `${data?.obsidian?.totalNotes || 18} NOTES`,
            desc: isAr ? 'أدلة المجمعات ونماذج التسعير' : 'Compound guides & policy docs',
            accent: '#38bdf8',
          },
          {
            id: 'ecc',
            icon: '🧠',
            title: isAr ? 'سجل السياق اللحظي (ECC)' : 'ECC Memory Engine',
            badge: `${data?.ecc?.totalEntities || 14} ENTITIES`,
            desc: isAr ? 'رادار هبوط الأسعار وسجل العملاء' : 'Price drop radar & client episodes',
            accent: '#34d399',
          },
          {
            id: 'mempalace',
            icon: '🏛️',
            title: isAr ? 'قصر الذاكرة المتجهي' : 'MemPalace Vectors',
            badge: '5 ROOMS',
            desc: isAr ? 'استرجاع متجهات الصفقات والمخزون' : 'Spatial multi-room vector recall',
            accent: '#a78bfa',
          },
        ].map((pillar) => {
          const isActive = activeTab === pillar.id;
          return (
            <button
              key={pillar.id}
              onClick={() => setActiveTab(pillar.id as any)}
              style={{
                textAlign: 'left',
                padding: '16px 18px',
                borderRadius: 14,
                border: isActive
                  ? `1px solid ${pillar.accent}`
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: isActive
                  ? `linear-gradient(135deg, rgba(8, 20, 35, 0.95), rgba(16, 35, 57, 0.95))`
                  : 'rgba(8, 20, 35, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isActive ? `0 8px 24px rgba(0,0,0,0.4)` : 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: pillar.accent,
                  }}
                />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{pillar.icon}</span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    color: pillar.accent,
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 8px',
                    borderRadius: 12,
                  }}
                >
                  {pillar.badge}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                {pillar.title}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(241, 245, 249, 0.6)', lineHeight: 1.4 }}>
                {pillar.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DEEPSEEK HARNESS */}
      {activeTab === 'deepseek' && (
        <div className="fade-up">
          {/* Integrated Benchmark Live Card */}
          <HarnessBenchmarkCard />

          {/* Scenarios Catalog */}
          <div
            style={{
              background: 'rgba(8, 20, 35, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f8fafc' }}>
                  {isAr ? 'قائمة السيناريوهات العشرة لتقييم الذكاء' : 'DeepSeek 10-Scenario Benchmark Suite'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 11.5, color: 'rgba(241, 245, 249, 0.6)' }}>
                  {isAr
                    ? 'اختبارات تقييم حتمية تقيس دقة التسعير، التفاوض بالعربية، التوجيه، وصياغة العقود'
                    : 'Target baseline: ≥ 75% overall accuracy, < 3,500ms mean latency'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span
                  style={{
                    background: 'rgba(197, 160, 89, 0.15)',
                    color: '#c5a059',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(197, 160, 89, 0.3)',
                  }}
                >
                  Model: deepseek-v3
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {(data?.deepseek?.scenarios || []).map((sc: Scenario, idx: number) => (
                <div
                  key={sc.id}
                  style={{
                    background: 'rgba(14, 30, 48, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 10,
                          color: '#c5a059',
                          fontWeight: 700,
                        }}
                      >
                        #{idx + 1} {sc.id}
                      </span>
                      <span
                        style={{
                          fontSize: 9.5,
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          padding: '2px 6px',
                          borderRadius: 6,
                          textTransform: 'uppercase',
                        }}
                      >
                        {sc.category}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#f1f5f9', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                      {sc.prompt}
                    </p>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      paddingTop: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10.5,
                      color: 'rgba(241, 245, 249, 0.6)',
                    }}
                  >
                    <span>Max: {sc.maxLatencyMs}ms</span>
                    <span>Min Acc: {(sc.minAccuracyScore * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OBSIDIAN KNOWLEDGE VAULT */}
      {activeTab === 'obsidian' && (
        <div className="fade-up">
          {/* Note Reader Modal / Split View */}
          {selectedNote && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(3, 10, 20, 0.85)',
                backdropFilter: 'blur(10px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
              }}
              onClick={() => setSelectedNote(null)}
            >
              <div
                style={{
                  background: '#0a1727',
                  border: '1px solid rgba(197, 160, 89, 0.3)',
                  borderRadius: 16,
                  width: '100%',
                  maxWidth: 820,
                  maxHeight: '85vh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>📄</span>
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 15 }}>{selectedNote}</span>
                  </div>
                  <button
                    onClick={() => setSelectedNote(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: 18,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                  {noteLoading ? (
                    <div style={{ color: '#c5a059', textAlign: 'center', padding: 40 }}>
                      Loading note from vault…
                    </div>
                  ) : (
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: '#cbd5e1',
                        margin: 0,
                      }}
                    >
                      {noteContent}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search & Stats Bar */}
          <div
            style={{
              background: 'rgba(8, 20, 35, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '18px 24px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'البحث في ملاحظات المجمعات وسياسات الأسعار...' : 'Filter vault notes by title or tag…'}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(14, 30, 48, 0.8)',
                  color: '#f8fafc',
                  fontSize: 12,
                  width: 320,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 11, color: 'rgba(241, 245, 249, 0.6)' }}>
                {filteredNotes.length} {isAr ? 'ملاحظة متوفرة' : 'notes in vault'}
              </span>
            </div>

            <div style={{ fontSize: 11, color: '#38bdf8' }}>
              📍 Local Path: <code style={{ color: '#c5a059' }}>docs/obsidian-vault/</code>
            </div>
          </div>

          {/* Notes Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {filteredNotes.map((note: VaultNote) => (
              <div
                key={note.filename}
                onClick={() => handleOpenNote(note.filename)}
                style={{
                  background: 'rgba(14, 30, 48, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 12,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(197, 160, 89, 0.4)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)')}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>{note.title}</div>
                    <span style={{ fontSize: 10, color: 'rgba(241, 245, 249, 0.5)', fontFamily: 'JetBrains Mono' }}>
                      {(note.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>

                  <p style={{ fontSize: 11.5, color: 'rgba(241, 245, 249, 0.7)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                    {note.excerpt}…
                  </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {note.tags.map((t, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 9.5,
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: '#38bdf8',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ECC MEMORY ENGINE */}
      {activeTab === 'ecc' && (
        <div className="fade-up">
          {/* Price Reduction Radar */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(8, 20, 35, 0.95), rgba(18, 38, 64, 0.9))',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f8fafc' }}>
                  🚨 {isAr ? 'رادار هبوط الأسعار والفرص المتعثرة (≥ 8% هبوط)' : 'Live Price Reduction Radar (≥ 8% Drop)'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 11.5, color: 'rgba(241, 245, 249, 0.7)' }}>
                  {isAr
                    ? 'يلتقط وكيل ECC تلقائياً انخفاضات أسعار الملاك في مجموعات الواتساب لتنبيه وكيل الإغلاق والمشترين'
                    : 'Automatically triggers Closer agent and priority matching for urgent VIP buyers.'}
                </p>
              </div>
              <span
                style={{
                  background: 'rgba(52, 211, 153, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                THRESHOLD: 8.0%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {[
                {
                  code: 'SE-HYP-VLA-001',
                  compound: 'Hyde Park',
                  type: 'Villa 320m²',
                  oldPrice: 38000000,
                  newPrice: 34500000,
                  dropPct: 9.21,
                  source: 'WhatsApp Direct Owner',
                  date: 'Today 11:20 AM',
                },
                {
                  code: 'SE-MVD-APT-004',
                  compound: 'Mivida',
                  type: 'Apartment 190m²',
                  oldPrice: 18500000,
                  newPrice: 16800000,
                  dropPct: 9.18,
                  source: 'OpenClaw Harvester',
                  date: 'Today 09:45 AM',
                },
                {
                  code: 'SE-UPC-PTH-008',
                  compound: 'Uptown Cairo',
                  type: 'Penthouse 260m²',
                  oldPrice: 26000000,
                  newPrice: 23500000,
                  dropPct: 9.61,
                  source: 'WhatsApp Broker Alert',
                  date: 'Yesterday',
                },
              ].map((item) => (
                <div
                  key={item.code}
                  style={{
                    background: 'rgba(10, 24, 40, 0.85)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13 }}>{item.compound}</span>
                    <span
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      ↓ {item.dropPct.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(241, 245, 249, 0.6)', marginBottom: 8 }}>
                    {item.type} · <code style={{ color: '#c5a059' }}>{item.code}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 11, textDecoration: 'line-through', color: 'rgba(241, 245, 249, 0.4)' }}>
                      {(item.oldPrice / 1e6).toFixed(1)}M EGP
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>
                      {(item.newPrice / 1e6).toFixed(1)}M EGP
                    </span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(241, 245, 249, 0.4)' }}>
                    {item.source} · {item.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Entity Profile Graph Sample */}
          <div
            style={{
              background: 'rgba(8, 20, 35, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#f8fafc' }}>
              👥 {isAr ? 'ملفات الكيانات النشطة في شبكة العلاقات' : 'Active Entity Relationship Profiles'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {[
                {
                  name: 'Eng. Tarek Mansour',
                  role: 'VIP Buyer',
                  compound: 'Villette / Hyde Park',
                  budget: '35M - 45M EGP',
                  type: 'Cash / 1-Yr Installment',
                  sentiment: 'High Urgency',
                  lastContact: 'WhatsApp 2h ago',
                },
                {
                  name: 'Dr. Mona Al-Alfy',
                  role: 'Direct Owner',
                  compound: 'Mivida Gardens',
                  budget: 'Asking 28M EGP',
                  type: 'Exclusive Resale',
                  sentiment: 'Motivated Seller',
                  lastContact: 'Inspection completed',
                },
                {
                  name: 'Mr. Karim El-Gammal',
                  role: 'Institutional Investor',
                  compound: 'Eastown Sodic Commercial',
                  budget: '80M EGP Portfolio',
                  type: 'Commercial / Medical',
                  sentiment: 'Cap Rate > 12% requirement',
                  lastContact: 'Due diligence stage',
                },
              ].map((ent, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(14, 30, 48, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13.5 }}>{ent.name}</span>
                    <span
                      style={{
                        background: 'rgba(197, 160, 89, 0.15)',
                        color: '#c5a059',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {ent.role}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(241, 245, 249, 0.7)', marginBottom: 4 }}>
                    📍 {ent.compound}
                  </div>
                  <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginBottom: 4 }}>
                    💰 {ent.budget}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'rgba(241, 245, 249, 0.5)', marginTop: 8 }}>
                    {ent.sentiment} · {ent.lastContact}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MEMPALACE VECTOR ROOMS */}
      {activeTab === 'mempalace' && (
        <div className="fade-up">
          {/* Vector Search Tester */}
          <div
            style={{
              background: 'rgba(8, 20, 35, 0.7)',
              border: '1px solid rgba(167, 139, 250, 0.25)',
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: '#f8fafc' }}>
              🏛️ {isAr ? 'فاحص الاسترجاع الدلالي بقصر الذاكرة (MemPalace)' : 'MemPalace Semantic Recall Tester'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 11.5, color: 'rgba(241, 245, 249, 0.6)' }}>
              {isAr
                ? 'استعلم عبر غرف الذاكرة المتجهية (العملاء، المخزون، المفاوضات، النظام)'
                : 'Search across spatial memory rooms: system, listings, leads, negotiations.'}
            </p>

            <form onSubmit={handleMemPalaceSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                title={isAr ? 'تحديد غرفة الذاكرة' : 'Select memory room'}
                aria-label={isAr ? 'تحديد غرفة الذاكرة' : 'Select memory room'}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(14, 30, 48, 0.9)',
                  color: '#f8fafc',
                  fontSize: 12,
                  outline: 'none',
                }}
              >
                <option value="all">All Rooms</option>
                <option value="system">System Room</option>
                <option value="listings">Listings Room</option>
                <option value="leads">Leads Room</option>
                <option value="negotiations">Negotiations Room</option>
              </select>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'مثال: فيلا هايد بارك، تفاوض كاش، سوبر لوكس...' : 'Query vectors: e.g. "Hyde Park villa cash offer" or "Supabase primary"'}
                style={{
                  flex: 1,
                  minWidth: 260,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(14, 30, 48, 0.9)',
                  color: '#f8fafc',
                  fontSize: 12.5,
                  outline: 'none',
                }}
              />

              <button
                type="submit"
                disabled={searching}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {searching ? 'Querying…' : 'Search Palace'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', marginBottom: 10 }}>
                  Found {searchResults.length} relevant memories:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {searchResults.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(14, 30, 48, 0.9)',
                        border: '1px solid rgba(167, 139, 250, 0.2)',
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#c5a059', fontWeight: 600 }}>
                          Room: {res.entry.room} · Drawer: {res.entry.drawer}
                        </span>
                        <span style={{ fontSize: 10, color: '#a78bfa' }}>Score: {res.score.toFixed(2)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#f8fafc', lineHeight: 1.4 }}>{res.entry.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rooms Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {(data?.mempalace?.rooms || []).map((room: MemPalaceRoom) => (
              <div
                key={room.room}
                style={{
                  background: 'rgba(14, 30, 48, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', textTransform: 'capitalize' }}>
                    🏛️ {room.room} Room
                  </span>
                  <span
                    style={{
                      background: 'rgba(167, 139, 250, 0.15)',
                      color: '#a78bfa',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    {room.count} ENTRIES
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {room.recent.map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        background: 'rgba(8, 20, 35, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        fontSize: 11,
                      }}
                    >
                      <div style={{ color: '#c5a059', fontWeight: 600, fontSize: 10, marginBottom: 2 }}>
                        drawer: {rec.drawer}
                      </div>
                      <div style={{ color: 'rgba(241, 245, 249, 0.8)', lineHeight: 1.3 }}>
                        {rec.content}…
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

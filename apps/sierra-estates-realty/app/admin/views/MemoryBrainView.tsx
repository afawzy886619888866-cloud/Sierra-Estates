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
  const [selectedEccEntity, setSelectedEccEntity] = useState<any | null>(null);
  const [eccFilter, setEccFilter] = useState<'all' | 'buyer' | 'owner' | 'property' | 'hot_deal'>('all');
  const [eccSearch, setEccSearch] = useState('');

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

      {/* TAB 3: ECC MEMORY ENGINE (Building Data Apps Standard) */}
      {activeTab === 'ecc' && (
        <div className="fade-up">
          {/* KPI Cards Row (Building Data Apps Standard) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: 'rgba(12, 12, 15, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {isAr ? 'عقد الكيانات (المشترين والملاك)' : 'Active Entity Nodes'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                  {data?.ecc?.totalEntities || 18}
                </div>
              </div>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 10.5,
                  fontWeight: 700,
                }}
              >
                +14% graph
              </span>
            </div>

            <div
              style={{
                background: 'rgba(12, 12, 15, 0.85)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#34d399', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {isAr ? 'صفقات الهبوط السعري المتعثرة' : 'Distress Deals (≥ 8% Drop)'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#34d399', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                  {data?.ecc?.totalHotDeals || 3}
                </div>
              </div>
              <span
                style={{
                  background: 'rgba(52, 211, 153, 0.2)',
                  color: '#34d399',
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 10.5,
                  fontWeight: 700,
                }}
              >
                HOT ALERT
              </span>
            </div>

            <div
              style={{
                background: 'rgba(12, 12, 15, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {isAr ? 'جلسات الذاكرة اللحظية (TTL)' : 'Working Sessions (Hot)'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                  {data?.ecc?.workingSessions || 12}
                </div>
              </div>
              <span
                style={{
                  background: 'rgba(197, 160, 89, 0.15)',
                  color: '#c5a059',
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 10.5,
                  fontWeight: 700,
                }}
              >
                30m TTL
              </span>
            </div>

            <div
              style={{
                background: 'rgba(12, 12, 15, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {isAr ? 'أحداث المفاوضات المسجلة' : 'Episodic Journal Events'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                  {data?.ecc?.totalEpisodes || 46}
                </div>
              </div>
              <span
                style={{
                  background: 'rgba(167, 139, 250, 0.15)',
                  color: '#a78bfa',
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 10.5,
                  fontWeight: 700,
                }}
              >
                Decay Weighted
              </span>
            </div>
          </div>

          {/* Primary Split View (Table + Secondary Details Panel) */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Left Main Data Table */}
            <div
              style={{
                flex: selectedEccEntity ? '1 1 58%' : '1 1 100%',
                minWidth: 320,
                transition: 'all 0.3s ease',
              }}
            >
              <div
                style={{
                  background: 'rgba(12, 12, 15, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                {/* Table Filter Toolbar */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['all', 'buyer', 'owner', 'property', 'hot_deal'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEccFilter(mode)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: eccFilter === mode ? 'rgba(197, 160, 89, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          color: eccFilter === mode ? '#e9c176' : '#94a3b8',
                          border: eccFilter === mode ? '1px solid rgba(197, 160, 89, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        {mode === 'all'
                          ? isAr ? 'الكل' : 'All Entities'
                          : mode === 'buyer'
                          ? isAr ? 'المشترين (Buyers)' : 'Buyers'
                          : mode === 'owner'
                          ? isAr ? 'الملاك (Owners)' : 'Owners'
                          : mode === 'property'
                          ? isAr ? 'الوحدات (Units)' : 'Properties'
                          : isAr ? '🔥 هبوط أسعار' : '🔥 Hot Deals'}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={eccSearch}
                    onChange={(e) => setEccSearch(e.target.value)}
                    placeholder={isAr ? 'بحث في الكيانات، الأكواد، المجمعات...' : 'Search entities, codes, compounds...'}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: '6px 12px',
                      color: '#f8fafc',
                      fontSize: 12,
                      width: 220,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Dense Data Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Entity / Sierra Code</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Compound / Area</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Budget / Price</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status / Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          id: 'SE-HYP-VLA-001',
                          name: 'Hyde Park Standalone Villa 320m²',
                          type: 'property',
                          compound: 'Hyde Park New Cairo',
                          price: 34500000,
                          oldPrice: 38000000,
                          isHotDeal: true,
                          dropPct: 9.2,
                          contact: '+201009876543 (Direct Owner)',
                          episodesCount: 4,
                          lastActivity: 'Price drop logged today 11:20 AM',
                        },
                        {
                          id: 'lead-buyer-tarek',
                          name: 'Eng. Tarek Mansour',
                          type: 'buyer',
                          compound: 'Villette / Hyde Park',
                          price: 45000000,
                          contact: '+201012345678',
                          isHotDeal: false,
                          episodesCount: 6,
                          lastActivity: 'Viewing requested in Villette',
                        },
                        {
                          id: 'SE-MVD-APT-004',
                          name: 'Mivida Gardens Luxury Apt 190m²',
                          type: 'property',
                          compound: 'Mivida',
                          price: 16800000,
                          oldPrice: 18500000,
                          isHotDeal: true,
                          dropPct: 9.18,
                          contact: '+201023456789 (OpenClaw Harvester)',
                          episodesCount: 3,
                          lastActivity: 'Owner distressed drop verified',
                        },
                        {
                          id: 'owner-dr-mona',
                          name: 'Dr. Mona Al-Alfy',
                          type: 'owner',
                          compound: 'Mivida Gardens',
                          price: 28000000,
                          contact: '+201034567890',
                          isHotDeal: false,
                          episodesCount: 5,
                          lastActivity: 'Listing inspection completed',
                        },
                        {
                          id: 'SE-UPC-PTH-008',
                          name: 'Uptown Cairo Penthouse 260m²',
                          type: 'property',
                          compound: 'Uptown Cairo',
                          price: 23500000,
                          oldPrice: 26000000,
                          isHotDeal: true,
                          dropPct: 9.61,
                          contact: '+201045678901 (Broker Alert)',
                          episodesCount: 2,
                          lastActivity: 'Price drop logged yesterday',
                        },
                        {
                          id: 'investor-karim',
                          name: 'Mr. Karim El-Gammal',
                          type: 'buyer',
                          compound: 'Eastown Sodic Commercial',
                          price: 80000000,
                          contact: '+201056789012',
                          isHotDeal: false,
                          episodesCount: 7,
                          lastActivity: 'Due diligence on commercial asset',
                        },
                      ]
                        .filter((item) => {
                          if (eccFilter === 'buyer') return item.type === 'buyer';
                          if (eccFilter === 'owner') return item.type === 'owner';
                          if (eccFilter === 'property') return item.type === 'property';
                          if (eccFilter === 'hot_deal') return item.isHotDeal;
                          return true;
                        })
                        .filter((item) => {
                          if (!eccSearch.trim()) return true;
                          const q = eccSearch.toLowerCase();
                          return (
                            item.name.toLowerCase().includes(q) ||
                            item.id.toLowerCase().includes(q) ||
                            item.compound.toLowerCase().includes(q)
                          );
                        })
                        .map((item) => {
                          const isSelected = selectedEccEntity?.id === item.id;
                          return (
                            <tr
                              key={item.id}
                              onClick={() => setSelectedEccEntity(item)}
                              style={{
                                cursor: 'pointer',
                                background: isSelected
                                  ? 'rgba(197, 160, 89, 0.15)'
                                  : 'transparent',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                transition: 'background 0.2s ease',
                              }}
                            >
                              <td style={{ padding: '12px 14px', color: '#f8fafc' }}>
                                <div style={{ fontWeight: 600 }}>{item.name}</div>
                                <div style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                                  {item.id}
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    background:
                                      item.type === 'buyer'
                                        ? 'rgba(56, 189, 248, 0.15)'
                                        : item.type === 'owner'
                                        ? 'rgba(167, 139, 250, 0.15)'
                                        : 'rgba(52, 211, 153, 0.15)',
                                    color:
                                      item.type === 'buyer'
                                        ? '#38bdf8'
                                        : item.type === 'owner'
                                        ? '#a78bfa'
                                        : '#34d399',
                                  }}
                                >
                                  {item.type.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>{item.compound}</td>
                              <td style={{ padding: '12px 14px', color: '#f8fafc', fontWeight: 600 }}>
                                {(item.price / 1e6).toFixed(1)}M EGP
                                {item.oldPrice && (
                                  <span style={{ fontSize: 10, color: '#94a3b8', textDecoration: 'line-through', marginLeft: 6 }}>
                                    {(item.oldPrice / 1e6).toFixed(1)}M
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                {item.isHotDeal ? (
                                  <span
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.2)',
                                      color: '#f87171',
                                      padding: '2px 6px',
                                      borderRadius: 6,
                                      fontSize: 10,
                                      fontWeight: 700,
                                    }}
                                  >
                                    ↓ {item.dropPct}% HOT
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{item.lastActivity}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Secondary Details Panel (Slides in when an entity is selected) */}
            {selectedEccEntity && (
              <div
                style={{
                  flex: '1 1 38%',
                  minWidth: 300,
                  background: 'rgba(12, 12, 15, 0.98)',
                  border: '1px solid rgba(197, 160, 89, 0.3)',
                  borderRadius: 14,
                  padding: 20,
                  position: 'sticky',
                  top: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        color: '#c5a059',
                        fontWeight: 700,
                        letterSpacing: '.1em',
                      }}
                    >
                      {isAr ? 'ملف الكيان في الذاكرة' : 'Memory Entity Inspection'}
                    </span>
                    <h4 style={{ margin: '4px 0 0 0', color: '#f8fafc', fontSize: 15, fontWeight: 700 }}>
                      {selectedEccEntity.name}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEccEntity(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      borderRadius: 8,
                      width: 28,
                      height: 28,
                      color: '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 6 }}>
                    <span style={{ color: '#94a3b8' }}>ID:</span>
                    <code style={{ color: '#e9c176' }}>{selectedEccEntity.id}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 6 }}>
                    <span style={{ color: '#94a3b8' }}>Target Compound:</span>
                    <span style={{ color: '#f8fafc' }}>{selectedEccEntity.compound}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 6 }}>
                    <span style={{ color: '#94a3b8' }}>Budget / Asking:</span>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>
                      {(selectedEccEntity.price / 1e6).toFixed(1)}M EGP
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                    <span style={{ color: '#94a3b8' }}>Direct Contact:</span>
                    <span style={{ color: '#cbd5e1' }}>{selectedEccEntity.contact}</span>
                  </div>
                </div>

                {/* Chronological Episodes Stream */}
                <div style={{ marginBottom: 14 }}>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: 12, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {isAr ? 'سجل الأحداث المتسلسل (Chronological Episodes)' : 'Chronological Episodes Stream'}
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderLeft: '3px solid #34d399', padding: '8px 10px', borderRadius: 4 }}>
                      <div style={{ fontSize: 11, color: '#f8fafc', fontWeight: 600 }}>{selectedEccEntity.lastActivity}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Decay Weight: 1.00 · Just now</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderLeft: '3px solid #c5a059', padding: '8px 10px', borderRadius: 4 }}>
                      <div style={{ fontSize: 11, color: '#f8fafc', fontWeight: 600 }}>Preferences aligned with New Cairo inventory</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Decay Weight: 0.85 · Yesterday</div>
                    </div>
                  </div>
                </div>

                {/* Action CTA */}
                <button
                  type="button"
                  onClick={() => alert(`Simulated matchmaking for ${selectedEccEntity.name}`)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #c5a059 0%, #dfba73 100%)',
                    color: '#071422',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  🚀 {isAr ? 'تفعيل وكيل الإغلاق والمطابقة' : 'Trigger Closer Agent Match'}
                </button>
              </div>
            )}
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

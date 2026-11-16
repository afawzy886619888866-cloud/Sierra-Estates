'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  badge?: string;
  description?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
  lang?: string;
}

export default function CommandPalette({
  isOpen,
  onClose,
  items,
  lang = 'en',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [items, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredItems.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>('.cmd-item.selected');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="cmd-palette-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 11, 20, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        paddingLeft: 16,
        paddingRight: 16,
        animation: 'fadeUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="cmd-palette-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'linear-gradient(180deg, rgba(15, 32, 53, 0.96) 0%, rgba(8, 18, 32, 0.98) 100%)',
          border: '1px solid rgba(0, 174, 255, 0.28)',
          boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.8), 0 0 28px rgba(0, 174, 255, 0.15)',
          borderRadius: 18,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
          direction: isAr ? 'rtl' : 'ltr',
        }}
      >
        {/* Search header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 18, color: 'var(--gold, #C8961A)' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAr
                ? 'ابحث عن التطبيقات، الإجراءات، العقارات، أو الأوامر... (Esc للإغلاق)'
                : 'Search apps, actions, pipeline, or properties... (Esc to close)'
            }
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F0EDE5',
              fontSize: 15,
              fontFamily: isAr ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif",
            }}
          />
          <span
            style={{
              fontSize: 10.5,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'rgba(240, 237, 229, 0.45)',
              padding: '2px 7px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            ESC
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            overflowY: 'auto',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: '36px 16px',
                textAlign: 'center',
                color: 'rgba(240, 237, 229, 0.4)',
                fontSize: 13,
              }}
            >
              {isAr ? 'لم يتم العثور على نتائج مطابقة.' : 'No matching commands or apps found.'}
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`cmd-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    background: isSelected
                      ? 'linear-gradient(90deg, rgba(0, 174, 255, 0.18) 0%, rgba(30, 136, 217, 0.08) 100%)'
                      : 'transparent',
                    border: isSelected
                      ? '1px solid rgba(0, 174, 255, 0.35)'
                      : '1px solid transparent',
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 8,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#FFFFFF' : 'rgba(240, 237, 229, 0.9)',
                        }}
                      >
                        {item.title}
                      </span>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: 9.5,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(52, 211, 153, 0.15)',
                            color: '#34D399',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'rgba(240, 237, 229, 0.45)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'rgba(240, 237, 229, 0.35)',
                      fontFamily: 'JetBrains Mono, monospace',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.03)',
                      flexShrink: 0,
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            padding: '10px 18px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'rgba(240, 237, 229, 0.4)',
          }}
        >
          <div style={{ display: 'flex', gap: 14 }}>
            <span><kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 3 }}>↑</kbd> <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 3 }}>↓</kbd> {isAr ? 'للتنقل' : 'Navigate'}</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 3 }}>↵</kbd> {isAr ? 'للاختيار' : 'Select'}</span>
          </div>
          <span style={{ color: 'var(--gold, #C8961A)', fontWeight: 600 }}>Sierra OS 3.0</span>
        </div>
      </div>
    </div>
  );
}

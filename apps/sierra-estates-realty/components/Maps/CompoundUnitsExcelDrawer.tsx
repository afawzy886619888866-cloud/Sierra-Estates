'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Download,
  Search,
  Camera,
  CheckCircle2,
  Clock,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  ExternalLink,
  Building,
  Sparkles,
} from 'lucide-react';
import type { CompoundLocation, MapUnitPin } from './LiveMap';
import { hasPendingPhoto } from '@/lib/inventory/normalize';

export interface CompoundUnitsExcelDrawerProps {
  compound: CompoundLocation | null;
  units: MapUnitPin[];
  lang?: 'en' | 'ar';
  onClose: () => void;
  onSelectUnit?: (unit: MapUnitPin) => void;
}

export default function CompoundUnitsExcelDrawer({
  compound,
  units,
  lang = 'ar',
  onClose,
  onSelectUnit,
}: CompoundUnitsExcelDrawerProps) {
  const isAr = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'sale' | 'rent'>('all');
  const [filterPhotosOnly, setFilterPhotosOnly] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [requestingMap, setRequestingMap] = useState<Record<string, 'loading' | 'success' | 'already' | 'error'>>({});

  // Filter units belonging to this compound
  const compoundUnits = useMemo(() => {
    if (!compound) return [];
    const compNameEn = (compound.nameEn || '').toLowerCase().trim();
    const compNameAr = (compound.nameAr || '').toLowerCase().trim();
    const compCode = (compound.code || '').toLowerCase().trim();

    return units.filter((u) => {
      const uComp = (u.compound || '').toLowerCase().trim();
      return (
        uComp === compNameEn ||
        uComp === compNameAr ||
        uComp === compCode ||
        uComp.includes(compNameEn) ||
        (compNameEn.length > 3 && compNameEn.includes(uComp))
      );
    });
  }, [compound, units]);

  // Apply search and filter toggles
  const filteredUnits = useMemo(() => {
    return compoundUnits.filter((u) => {
      if (filterMode !== 'all' && u.mode !== filterMode) return false;
      const needsPhoto = hasPendingPhoto(u.img);
      if (filterPhotosOnly && !needsPhoto) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        u.code.toLowerCase().includes(term) ||
        u.type.toLowerCase().includes(term) ||
        u.priceLabel.toLowerCase().includes(term) ||
        (u.area && u.area.toString().includes(term))
      );
    });
  }, [compoundUnits, filterMode, filterPhotosOnly, searchTerm]);

  // Handle Photo Request dispatch
  const handleRequestPhoto = async (unit: MapUnitPin) => {
    const key = unit.code;
    setRequestingMap((prev) => ({ ...prev, [key]: 'loading' }));

    try {
      const res = await fetch('/api/inventory/request-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode: unit.code,
          compound: compound?.nameEn || unit.compound,
          unitId: unit.id,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        if (data.alreadyRequested) {
          setRequestingMap((prev) => ({ ...prev, [key]: 'already' }));
        } else {
          setRequestingMap((prev) => ({ ...prev, [key]: 'success' }));
        }
      } else {
        setRequestingMap((prev) => ({ ...prev, [key]: 'error' }));
      }
    } catch {
      setRequestingMap((prev) => ({ ...prev, [key]: 'error' }));
    }
  };

  // Export filtered rows to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (!compound || filteredUnits.length === 0) return;

    const headers = ['Code', 'Type', 'Mode', 'Beds', 'Baths', 'Area_sqm', 'Price', 'Compound', 'Photo_Status'];
    const rows = filteredUnits.map((u) => [
      `"${u.code}"`,
      `"${u.type || ''}"`,
      `"${u.mode}"`,
      u.beds ?? '',
      u.baths ?? '',
      u.area ?? '',
      `"${u.priceLabel.replace(/"/g, '""')}"`,
      `"${compound.nameEn}"`,
      hasPendingPhoto(u.img) ? 'Missing_Photos' : 'Available',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${compound.code || 'compound'}_inventory_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!compound) return null;

  const totalCount = compoundUnits.length;
  const missingPhotosCount = compoundUnits.filter((u) => hasPendingPhoto(u.img)).length;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        maxHeight: isMinimized ? '56px' : '460px',
        backgroundColor: 'rgba(7, 15, 27, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 16,
        border: '1px solid rgba(200, 150, 26, 0.35)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(200, 150, 26, 0.15)',
        color: '#f8fafc',
        fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans'), system-ui, sans-serif",
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── Top Header Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'linear-gradient(90deg, rgba(13, 33, 54, 0.95), rgba(7, 21, 35, 0.95))',
          borderBottom: isMinimized ? 'none' : '1px solid rgba(200, 150, 26, 0.25)',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #f5d78e, #c8961a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#070b14',
              flexShrink: 0,
              boxShadow: '0 0 12px rgba(200, 150, 26, 0.5)',
            }}
          >
            <FileSpreadsheet size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#f5d78e', whiteSpace: 'nowrap' }}>
                {isAr ? compound.nameAr : compound.nameEn}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
                  background: 'rgba(200, 150, 26, 0.15)',
                  border: '1px solid rgba(200, 150, 26, 0.3)',
                  color: '#e9c176',
                  padding: '1px 6px',
                  borderRadius: 6,
                }}
              >
                {compound.code}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {isAr ? 'جدول وحدات الكمبوند' : 'Compound Units Sheet'} ·{' '}
              <strong style={{ color: '#ffffff' }}>{totalCount}</strong> {isAr ? 'وحدة متاحة' : 'units'}
              {missingPhotosCount > 0 && (
                <span style={{ color: '#f59e0b', margin: '0 6px' }}>
                  ({missingPhotosCount} {isAr ? 'تحتاج صور' : 'need photos'})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleExportCSV}
            title={isAr ? 'تصدير إكسل / CSV' : 'Export Excel / CSV'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#e9c176',
              borderRadius: 8,
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Download size={13} />
            <span className="hidden sm:inline">{isAr ? 'تصدير' : 'Export'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 5,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
            }}
            title={isMinimized ? (isAr ? 'تكبير' : 'Maximize') : (isAr ? 'تصغير' : 'Minimize')}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: 5,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
            }}
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Subheader Filters & Search ── */}
      {!isMinimized && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: 'rgba(9, 21, 35, 0.7)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              minWidth: 180,
              maxWidth: 280,
              flex: 1,
            }}
          >
            <Search
              size={13}
              style={{
                position: 'absolute',
                [isAr ? 'right' : 'left']: 10,
                color: '#64748b',
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isAr ? 'بحث بالكود، النوع، السعر...' : 'Search code, type, price...'}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 8,
                padding: isAr ? '4px 30px 4px 10px' : '4px 10px 4px 30px',
                fontSize: 11.5,
                color: '#ffffff',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 10.5,
                fontWeight: filterMode === 'all' ? 800 : 500,
                background: filterMode === 'all' ? '#c8961a' : 'rgba(255,255,255,0.06)',
                color: filterMode === 'all' ? '#0d0d0f' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('sale')}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 10.5,
                fontWeight: filterMode === 'sale' ? 800 : 500,
                background: filterMode === 'sale' ? '#10b981' : 'rgba(255,255,255,0.06)',
                color: filterMode === 'sale' ? '#070b14' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isAr ? 'بيع' : 'Sale'}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('rent')}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 10.5,
                fontWeight: filterMode === 'rent' ? 800 : 500,
                background: filterMode === 'rent' ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                color: filterMode === 'rent' ? '#070b14' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isAr ? 'إيجار' : 'Rent'}
            </button>

            <button
              type="button"
              onClick={() => setFilterPhotosOnly(!filterPhotosOnly)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 10.5,
                fontWeight: filterPhotosOnly ? 800 : 500,
                background: filterPhotosOnly ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.06)',
                color: filterPhotosOnly ? '#f59e0b' : '#cbd5e1',
                border: filterPhotosOnly ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Camera size={11} />
              {isAr ? 'بحاجة لصور' : 'Needs Photos'}
            </button>
          </div>
        </div>
      )}

      {/* ── Table Sheet Area ── */}
      {!isMinimized && (
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 180 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: isAr ? 'right' : 'left',
              fontSize: 11.5,
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'rgba(15, 35, 58, 0.95)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  borderBottom: '1.5px solid rgba(200, 150, 26, 0.4)',
                  color: '#e9c176',
                  fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
                  fontSize: 10,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                <th style={{ padding: '8px 12px' }}>{isAr ? 'كود الوحدة' : 'Code'}</th>
                <th style={{ padding: '8px 12px' }}>{isAr ? 'النوع' : 'Type'}</th>
                <th style={{ padding: '8px 12px' }}>{isAr ? 'النوع' : 'Mode'}</th>
                <th style={{ padding: '8px 12px' }}>{isAr ? 'الغرف / الحمام' : 'Beds/Baths'}</th>
                <th style={{ padding: '8px 12px' }}>{isAr ? 'المساحة' : 'Area'}</th>
                <th style={{ padding: '8px 12px' }}>{isAr ? 'السعر' : 'Price'}</th>
                <th style={{ padding: '8px 12px' }}>{isAr ? 'حالة الصور' : 'Photos'}</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 32,
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: 12,
                    }}
                  >
                    {isAr ? 'لا توجد وحدات تطابق معايير البحث في هذا الكمبوند' : 'No units matching filter in this compound'}
                  </td>
                </tr>
              ) : (
                filteredUnits.map((u, idx) => {
                  const needsPhoto = hasPendingPhoto(u.img);
                  const reqStatus = requestingMap[u.code];
                  const isSale = u.mode === 'sale';

                  return (
                    <tr
                      key={u.id || u.code || idx}
                      style={{
                        backgroundColor: idx % 2 === 0 ? 'rgba(7, 15, 27, 0.6)' : 'rgba(13, 27, 44, 0.6)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(200, 150, 26, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          idx % 2 === 0 ? 'rgba(7, 15, 27, 0.6)' : 'rgba(13, 27, 44, 0.6)';
                      }}
                    >
                      {/* Code */}
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <Link
                          href={`/property/${encodeURIComponent(u.id || u.code)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#f5d78e',
                            fontWeight: 700,
                            fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {u.code}
                          <ExternalLink size={10} style={{ opacity: 0.6 }} />
                        </Link>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: '#e2e8f0' }}>
                        {u.type || '-'}
                      </td>

                      {/* Mode */}
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: 9.5,
                            fontWeight: 700,
                            background: isSale ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: isSale ? '#34d399' : '#38bdf8',
                            border: `1px solid ${isSale ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                          }}
                        >
                          {isSale ? (isAr ? 'بيع' : 'Sale') : (isAr ? 'إيجار' : 'Rent')}
                        </span>
                      </td>

                      {/* Beds/Baths */}
                      <td
                        style={{
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
                          color: '#cbd5e1',
                        }}
                      >
                        {u.beds != null ? `${u.beds} غ` : '-'} / {u.baths != null ? `${u.baths} ح` : '-'}
                      </td>

                      {/* Area */}
                      <td
                        style={{
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
                          color: '#cbd5e1',
                        }}
                      >
                        {u.area ? `${u.area} م²` : '-'}
                      </td>

                      {/* Price */}
                      <td
                        style={{
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          fontWeight: 700,
                          color: '#ffffff',
                          fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
                        }}
                      >
                        {u.priceLabel}
                      </td>

                      {/* Photo Status */}
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {needsPhoto ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#f59e0b',
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            <Clock size={11} />
                            {isAr ? 'في انتظار الصور' : 'Pending'}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#10b981',
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle2 size={11} />
                            {isAr ? 'متوفرة' : 'Available'}
                          </span>
                        )}
                      </td>

                      {/* Action Button: Request Photos */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {reqStatus === 'loading' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              color: '#f5d78e',
                            }}
                          >
                            <Loader2 size={12} className="animate-spin" />
                            {isAr ? 'جارٍ الإرسال...' : 'Sending...'}
                          </span>
                        ) : reqStatus === 'success' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              color: '#34d399',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={12} />
                            {isAr ? 'تم إرسال الطلب للمالك ✓' : 'Dispatched ✓'}
                          </span>
                        ) : reqStatus === 'already' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              color: '#e9c176',
                            }}
                          >
                            <Clock size={12} />
                            {isAr ? 'قيد المتابعة مسبقاً' : 'Already Queued'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRequestPhoto(u)}
                            title={isAr ? 'إرسال طلب صور عبر واتساب للمالك أو الوسيط' : 'Dispatch WhatsApp photo request to owner/broker'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: needsPhoto
                                ? 'linear-gradient(135deg, rgba(200, 150, 26, 0.35), rgba(200, 150, 26, 0.15))'
                                : 'rgba(255, 255, 255, 0.05)',
                              border: needsPhoto
                                ? '1px solid rgba(200, 150, 26, 0.6)'
                                : '1px solid rgba(255, 255, 255, 0.12)',
                              color: needsPhoto ? '#f5d78e' : '#cbd5e1',
                              borderRadius: 6,
                              padding: '3px 8px',
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Camera size={11} />
                            {isAr ? 'طلب الصور' : 'Request Photos'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

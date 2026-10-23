'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import EasyListingStudio from '@/components/admin/EasyListingStudio';
import WhatsAppScheduledSender from '@/components/admin/WhatsAppScheduledSender';
import WhatsAppChatScanner from '@/components/admin/WhatsAppChatScanner';
import { PropertyTeaserBrochure } from '@/components/admin/PropertyTeaserBrochure';
import ValuationArbitrageStudio from '@/components/admin/ValuationArbitrageStudio';
import AccidentalDataLossGuardModal from '@/components/admin/AccidentalDataLossGuardModal';
import {
  Sparkles,
  ListFilter,
  FileText,
  Search,
  Calculator,
  Download,
  Zap,
  Eye,
  Camera,
  Globe,
  Building2,
  X,
  Star,
  Send,
  Smartphone,
} from 'lucide-react';

import consolidatedRaw from '@/data/consolidated-master-inventory.json';
import realListingsRaw from '@/data/real-listings.json';

// Stock luxury community presets for 1-click photo matching
const COMMUNITY_PHOTO_PRESETS: Record<string, string[]> = {
  Mivida: [
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7G1HG6HKMHT5G9X75RCJHR/3a18bbe1-5ebf-468d-892d-5ce1b0338681.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/0288fbc6-7ee9-46aa-8449-9db498eaa956.png',
  ],
  Eastown: [
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/b6bb617a-d76d-4162-8e44-679da8f2f0ea.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/c5182043-be29-4a20-8d65-96e532df5264.png',
  ],
  Madinaty: [
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/8ebeead8-e0da-4ce1-9491-0c9018fe6518.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/68db0632-20e0-4889-8899-2a89dcf85654.png',
  ],
  'Al Rehab': [
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/d4b30259-c27e-44bf-965e-e323f1883e9e.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/540d4c5e-4137-4be0-aa6e-948b51e56d39.png',
  ],
  'Uptown Cairo': [
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/73dae100-65c1-49b6-abfc-8a98b125f682.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/b277c467-e7e9-4312-af79-f8564402a3fb.png',
  ],
  'Fifth Settlement': [
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/b82d7eb9-b345-4c07-9dbb-ebacc9c0e158.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7H8DF01RY4ETCN5FECY525/48863c3f-b16a-4467-ae6c-89e4f09ed382.png',
  ],
  'Cairo Plaza': [
    '/cairo-plaza/site-photos/cp-portal-tower1-entrance.jpg',
    '/cairo-plaza/site-photos/cp-interior-marble-stairs.jpg',
    '/cairo-plaza/site-photos/cp-furnished-executive-office.jpg',
    '/cairo-plaza/site-photos/cp-corridor-elevator-hallway.jpg',
    '/cairo-plaza/site-photos/cp-exterior-banque-misr-frontage.png',
  ],
  Default: [
    'https://static.shared.propertyfinder.eg/media/images/listing/01JPEKVA63EPQ4R9N1H5KT2FSX/e9711840-ed1e-11ef-8cf7-0a8c5593e6a3-6d25555e-9552-4f8e-8618-847fbc423ebc.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JPEKVA63EPQ4R9N1H5KT2FSX/ea569e25-ed1e-11ef-8cf7-0a8c5593e6a3-25e91c7f-53c6-43b2-8ce6-36c944ffda8d.png',
  ],
};

function getCommunityPreset(compound: string): string[] {
  for (const [key, urls] of Object.entries(COMMUNITY_PHOTO_PRESETS)) {
    if (compound && compound.toLowerCase().includes(key.toLowerCase())) {
      return urls;
    }
  }
  return COMMUNITY_PHOTO_PRESETS.Default;
}

// Build unified baseline merging real-listings and consolidated master inventory
function buildUnifiedBaseline(): any[] {
  const map = new Map<string, any>();

  // Load real listings (with verified photos)
  if (Array.isArray(realListingsRaw)) {
    realListingsRaw.forEach((item: any) => {
      const code = item.sierraCode || item.code || `SE-${item.id}`;
      map.set(code, {
        ...item,
        sierraCode: code,
        photos: item.photos || (item.image ? [item.image] : item.img ? [item.img] : []),
        hasPhotos: Boolean((item.photos && item.photos.length > 0) || item.image || item.img),
        status: item.status || 'Available',
        publishToClient: item.publishToClient ?? true,
        syndicatedToPf: item.syncSource === 'property-finder' || Boolean(item.syndicatedToPf),
      });
    });
  }

  // Merge consolidated units
  if (Array.isArray(consolidatedRaw)) {
    consolidatedRaw.forEach((item: any) => {
      const code = item.sierraCode || item.code || `SE-${item.id}`;
      if (!map.has(code)) {
        map.set(code, {
          ...item,
          sierraCode: code,
          photos: item.photos || [],
          hasPhotos: Boolean(item.photos && item.photos.length > 0),
          status: item.status || 'Available',
          publishToClient: item.publishToClient ?? false,
          syndicatedToPf: item.syncSource === 'property-finder' || Boolean(item.syndicatedToPf),
        });
      }
    });
  }

  return Array.from(map.values());
}

export default function ListingsView({ lang = 'en', restricted = false }: { lang?: string; restricted?: boolean }) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'inventory' | 'easy-listing' | 'whatsapp-sender' | 'whatsapp-scanner' | 'brochure' | 'valuation'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Primary operational filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'rent' | 'owners' | 'villa' | 'apartment'>('all');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'has_photos' | 'missing_photos' | 'best_needing_photos'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'pending' | 'sold_rented'>('all');
  const [syndicationFilter] = useState<'all' | 'web_live' | 'pf_live'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('Available');
  const [bulkNotification, setBulkNotification] = useState<string | null>(null);
  const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [allListingsData, setAllListingsData] = useState<any[]>(() => buildUnifiedBaseline());

  // Quick valuation preview state
  const [_activeValuationUnit, setActiveValuationUnit] = useState<any | null>(null);

  // Photo Attach Modal State
  const [activePhotoModalUnit, setActivePhotoModalUnit] = useState<any | null>(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photoRequestSending, setPhotoRequestSending] = useState(false);
  const [photoRequestResult, setPhotoRequestResult] = useState<string | null>(null);

  // The WhatsApp bot accepts conversations (text) but NOT images — photos
  // enter through THIS modal. Persist to /api/admin/listings/photos so they
  // survive a refresh (the old attach was local-state only and was lost).
  const persistPhotos = useCallback(async (code: string, urls: string[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/listings/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, urls }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.details || json.error || `HTTP ${res.status}`);
      return true;
    } catch (e: any) {
      setBulkNotification(`${e?.message || 'Could not save photos'} — photos NOT saved. Retry.`);
      setTimeout(() => setBulkNotification(null), 5000);
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/listings?limit=500', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as { listings?: any[]; error?: string };
        if (!response.ok) throw new Error(payload.error || 'Failed to load live listings');
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        if (Array.isArray(payload.listings) && payload.listings.length > 0) {
          // Merge live DB listings
          setAllListingsData((prev) => {
            const map = new Map(prev.map((i) => [i.sierraCode || i.code || i.id, i]));
            payload.listings!.forEach((liveItem) => {
              const code = liveItem.sierraCode || liveItem.code || liveItem.id;
              const existing = map.get(code);
              map.set(code, {
                ...(existing || {}),
                ...liveItem,
                sierraCode: code,
                hasPhotos: Boolean(
                  (liveItem.photos && liveItem.photos.length > 0) ||
                  liveItem.image ||
                  liveItem.img ||
                  existing?.hasPhotos
                ),
                photos: liveItem.photos || existing?.photos || (liveItem.image ? [liveItem.image] : []),
              });
            });
            return Array.from(map.values());
          });
        }
      })
      .catch((_error) => {
      })
      .finally(() => {
      });

    return () => {
      active = false;
    };
  }, []);

  // Helper: check if a listing is a "Best Unit" (High Value / Luxury Community / High Cap Rate)
  const isBestUnit = (item: any): boolean => {
    const c = (item.compound || item.location || '').toLowerCase();
    const isTier1 = ['mivida', 'eastown', 'rehab', 'madinaty', 'uptown', 'palm hills', 'hyde park', 'fifth square', 'villette'].some((k) => c.includes(k));
    const price = Number(item.price) || 0;
    const isHighValue = price >= 8000000 || (item.operation === 'Rent' && price >= 35000);
    const isVillaOrDuplex = ['villa', 'twin', 'town', 'duplex', 'penthouse'].some((t) => (item.type || '').toLowerCase().includes(t));
    return isTier1 || isHighValue || isVillaOrDuplex;
  };

  // Filter listings
  const filteredListings = useMemo(() => {
    return allListingsData.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (item.sierraCode && item.sierraCode.toLowerCase().includes(q)) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.compound && item.compound.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        (item.ownerName && item.ownerName.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Type / Mode filter
      if (typeFilter === 'sale' && item.operation !== 'Sale' && item.mode !== 'sale') return false;
      if (typeFilter === 'rent' && item.operation !== 'Rent' && item.mode !== 'rent') return false;
      if (typeFilter === 'owners' && item.sourceType !== 'owner' && (item.ownerType || '').toLowerCase() !== 'owner') return false;
      if (typeFilter === 'villa') {
        const t = (item.type || '').toLowerCase();
        if (!t.includes('villa') && !t.includes('twin') && !t.includes('town')) return false;
      }
      if (typeFilter === 'apartment') {
        const t = (item.type || '').toLowerCase();
        if (!t.includes('apartment') && !t.includes('duplex') && !t.includes('studio') && !t.includes('penthouse')) return false;
      }

      // Photo Status Filter
      const hasImg = Boolean(item.hasPhotos || (item.photos && item.photos.length > 0) || item.image || item.img);
      if (photoFilter === 'has_photos' && !hasImg) return false;
      if (photoFilter === 'missing_photos' && hasImg) return false;
      if (photoFilter === 'best_needing_photos') {
        if (hasImg || !isBestUnit(item)) return false;
      }

      // Availability Filter
      const st = (item.status || 'Available').toLowerCase();
      if (availabilityFilter === 'available' && st !== 'available' && st !== 'active') return false;
      if (availabilityFilter === 'pending' && !st.includes('pending') && !st.includes('review')) return false;
      if (availabilityFilter === 'sold_rented' && !st.includes('sold') && !st.includes('rented') && !st.includes('archived')) return false;

      // Syndication Filter
      if (syndicationFilter === 'web_live' && !item.publishToClient) return false;
      if (syndicationFilter === 'pf_live' && !item.syndicatedToPf) return false;

      // Zone filter
      if (zoneFilter !== 'all') {
        const itemZone = (item.zone || item.location || '').toLowerCase();
        if (!itemZone.includes(zoneFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [allListingsData, searchQuery, typeFilter, photoFilter, availabilityFilter, syndicationFilter, zoneFilter]);

  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  }, [filteredListings, currentPage]);

  const totalPages = Math.ceil(filteredListings.length / pageSize);

  const availableZones = useMemo(() => {
    const set = new Set<string>();
    allListingsData.forEach((x) => {
      const z = x.zone || x.location;
      if (z && typeof z === 'string') set.add(z);
    });
    return Array.from(set);
  }, [allListingsData]);

  // Overall Statistics
  const stats = useMemo(() => {
    const all = allListingsData;
    const withPhotos = all.filter((x) => Boolean(x.hasPhotos || (x.photos && x.photos.length > 0) || x.image || x.img)).length;
    const missingPhotos = all.length - withPhotos;
    const bestNeedingPhotos = all.filter((x) => isBestUnit(x) && !x.hasPhotos && !(x.photos && x.photos.length > 0) && !x.image && !x.img).length;
    const available = all.filter((x) => (x.status || 'Available').toLowerCase() === 'available' || (x.status || '').toLowerCase() === 'active').length;
    const webLive = all.filter((x) => Boolean(x.publishToClient)).length;
    const pfLive = all.filter((x) => Boolean(x.syndicatedToPf)).length;

    return {
      total: all.length,
      withPhotos,
      missingPhotos,
      bestNeedingPhotos,
      available,
      webLive,
      pfLive,
      sale: all.filter((x) => x.operation === 'Sale' || x.mode === 'sale').length,
      rent: all.filter((x) => x.operation === 'Rent' || x.mode === 'rent').length,
    };
  }, [allListingsData]);

  // 1-Click Availability change
  const handleUpdateAvailability = (code: string, newStatus: string) => {
    setAllListingsData((prev) =>
      prev.map((item) => {
        if ((item.sierraCode || item.code || item.id) === code) {
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
    setBulkNotification(`Updated ${code} availability to "${newStatus}"`);
    setTimeout(() => setBulkNotification(null), 3000);
  };

  // 1-Click Toggle Website Publish
  const handleToggleWebsitePublish = (code: string) => {
    setAllListingsData((prev) =>
      prev.map((item) => {
        if ((item.sierraCode || item.code || item.id) === code) {
          const next = !item.publishToClient;
          setBulkNotification(`${code} is now ${next ? 'LIVE on Website Portal' : 'Unpublished from Website'}`);
          setTimeout(() => setBulkNotification(null), 3000);
          return { ...item, publishToClient: next };
        }
        return item;
      })
    );
  };

  // 1-Click Toggle Property Finder Syndication
  const handleTogglePfSyndicate = (code: string) => {
    setAllListingsData((prev) =>
      prev.map((item) => {
        if ((item.sierraCode || item.code || item.id) === code) {
          const next = !item.syndicatedToPf;
          setBulkNotification(`${code} is now ${next ? 'Syndicated to Property Finder Feed' : 'Removed from Property Finder'}`);
          setTimeout(() => setBulkNotification(null), 3000);
          return { ...item, syndicatedToPf: next };
        }
        return item;
      })
    );
  };

  // Attach / Apply photos to a listing — persists to the DB, then updates state.
  const handleApplyPhotos = (code: string, photoUrls: string[]) => {
    setAllListingsData((prev) =>
      prev.map((item) => {
        if ((item.sierraCode || item.code || item.id) === code) {
          const merged = Array.from(
            new Set([...(item.photos || []), ...photoUrls])
          ).filter(Boolean);
          return {
            ...item,
            photos: merged,
            hasPhotos: merged.length > 0,
            image: merged[0],
          };
        }
        return item;
      })
    );
    setActivePhotoModalUnit(null);
    setCustomPhotoUrl('');
    setBulkNotification(`Attaching ${photoUrls.length} verified photo(s) to ${code}…`);
    setTimeout(() => setBulkNotification(null), 4000);
    // Persistence: photos now live on the listing row, not just in this tab's
    // memory. Failure is surfaced — never a silent local-only "success".
    void persistPhotos(code, photoUrls);
  };

  // Upload photos straight from the team's device (the bot never accepts
  // images, so this button is the images' front door).
  const handleDevicePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activePhotoModalUnit) return;
    const code = activePhotoModalUnit.sierraCode || activePhotoModalUnit.code || activePhotoModalUnit.id;
    setUploadingPhotos(true);
    setUploadError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 10)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('code', String(code));
        const res = await fetch('/api/admin/listings/photos', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.details || json.error || `HTTP ${res.status}`);
        if (json.url) uploaded.push(json.url as string);
      }
      setAllListingsData((prev) =>
        prev.map((item) => {
          if ((item.sierraCode || item.code || item.id) === code) {
            const merged = Array.from(
              new Set([...(item.photos || []), ...uploaded])
            ).filter(Boolean);
            return { ...item, photos: merged, hasPhotos: merged.length > 0, image: merged[0] };
          }
          return item;
        })
      );
      setActivePhotoModalUnit(null);
      setBulkNotification(`Uploaded ${uploaded.length} photo(s) to ${code} ✓ (saved on the unit)`);
      setTimeout(() => setBulkNotification(null), 4000);
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed');
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Ask the unit's owner/broker for photos over WhatsApp (outbound queue).
  const handleRequestPhotos = async () => {
    if (!activePhotoModalUnit) return;
    const code = activePhotoModalUnit.sierraCode || activePhotoModalUnit.code || activePhotoModalUnit.id;
    setPhotoRequestSending(true);
    setPhotoRequestResult(null);
    try {
      const res = await fetch('/api/admin/listings/photos/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: String(code) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setPhotoRequestResult(isAr ? '✓ تم إرسال طلب الصور على واتساب (في قائمة الإرسال)' : '✓ Photo request queued on WhatsApp');
    } catch (e: any) {
      setPhotoRequestResult(e?.message || 'Request failed');
    } finally {
      setPhotoRequestSending(false);
    }
  };

  const handleToggleSelectAllPage = () => {
    const pageIds = paginatedListings.map((item) => item.sierraCode || item.code || `SE-${item.id}`);
    const allSelected = pageIds.every((id) => selectedListingIds.includes(id));
    if (allSelected) {
      setSelectedListingIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedListingIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedListingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExportSelectedCSV = () => {
    const selectedRows = allListingsData.filter((x) => {
      const id = x.sierraCode || x.code || `SE-${x.id}`;
      return selectedListingIds.includes(id);
    });
    if (selectedRows.length === 0) return;

    const headers = ['Code', 'Compound', 'Location', 'Type', 'Bedrooms', 'Area_SQM', 'Price_EGP', 'Mode', 'Status', 'Has_Photos', 'Web_Live', 'PF_Syndicated'];
    const rows = selectedRows.map((r) => [
      `"${r.sierraCode || r.code || r.id || ''}"`,
      `"${r.compound || ''}"`,
      `"${r.location || ''}"`,
      `"${r.type || ''}"`,
      r.bedrooms || r.beds || '',
      r.area_sqm || r.area || '',
      r.price || '',
      r.operation || r.mode || 'Sale',
      `"${r.status || 'Available'}"`,
      r.hasPhotos ? 'Yes' : 'No',
      r.publishToClient ? 'Yes' : 'No',
      r.syndicatedToPf ? 'Yes' : 'No',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sierra-selected-inventory-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setBulkNotification(`Exported ${selectedRows.length} listings to CSV`);
    setTimeout(() => setBulkNotification(null), 3000);
  };

  const handleApplyBulkStatus = () => {
    if (selectedListingIds.length === 0) return;
    if (bulkStatus === 'Archived') {
      setIsGuardModalOpen(true);
      return;
    }
    setAllListingsData((prev) =>
      prev.map((item) => {
        const id = item.sierraCode || item.code || `SE-${item.id}`;
        if (selectedListingIds.includes(id)) {
          return { ...item, status: bulkStatus };
        }
        return item;
      })
    );
    setBulkNotification(`Updated status of ${selectedListingIds.length} properties to ${bulkStatus}`);
    setSelectedListingIds([]);
    setTimeout(() => setBulkNotification(null), 3000);
  };

  return (
    <div className="fade-up space-y-6" style={{ color: 'var(--tx)' }}>
      {/* Top Header & Subnav */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          paddingBottom: 16,
          borderBottom: '1px solid var(--bd)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--tx-s)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{isAr ? 'المخزون العقاري، الصور، وتوزيع البوابات' : 'Inventory, Photos & Multi-Channel Syndication'}</span>
            <span
              style={{
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 20,
                background: 'rgba(0, 174, 255, 0.15)',
                color: 'var(--gold)',
                border: '1px solid rgba(0, 174, 255, 0.3)',
                fontWeight: 600,
              }}
            >
              {stats.total.toLocaleString()} {isAr ? 'وحدة' : 'Units'}
            </span>
          </h2>
          <p style={{ fontSize: 13, color: 'var(--tx-m)', marginTop: 4 }}>
            {isAr
              ? 'التحكم في توفر الوحدات، فحص واقتناص الصور للعقارات المميزة، والنشر الفوري على بروبرتي فايندر وموقع سييرا'
              : 'Control availability, hunt photos for premier units, and syndicate live across Property Finder & Sierra Portal.'}
          </p>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Download Spreadsheets links (staff only — the master sheets carry
              the whole company's data, not a partner's scoped portfolio) */}
          {!restricted && (
            <>
            <a
              href="/downloads/Sierra_Estates_Owners_Rent_Master.xlsx"
              download="Sierra_Estates_Owners_Rent_Master.xlsx"
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                background: 'var(--bg-e)',
                border: '1px solid var(--bd)',
                color: 'var(--tx)',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                textDecoration: 'none',
              }}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'شيت إيجارات الملاك' : 'Owners Rent (.xlsx)'}</span>
            </a>

            <a
              href="/downloads/Sierra_Estates_Rent_Master_Inventory.xlsx"
              download="Sierra_Estates_Rent_Master_Inventory.xlsx"
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                background: 'var(--bg-e)',
                border: '1px solid var(--bd)',
                color: 'var(--tx)',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                textDecoration: 'none',
              }}
            >
              <Download className="w-3.5 h-3.5 text-[#E9C176]" />
              <span>{isAr ? 'شيت الإيجار الشامل' : 'Rent Master (.xlsx)'}</span>
            </a>
            </>
          )}

          {/* Tab Controls */}
          <div style={{ display: 'flex', padding: 3, borderRadius: 12, background: 'var(--surf)', border: '1px solid var(--bd)' }}>
            <button
              onClick={() => setActiveTab('inventory')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'inventory' ? 'var(--gold)' : 'transparent',
                color: activeTab === 'inventory' ? '#07111E' : 'var(--tx-m)',
              }}
            >
              <ListFilter className="w-3.5 h-3.5 inline mr-1" />
              <span>{isAr ? 'المخزون الموحد' : 'All Listings'}</span>
            </button>
            <button
              onClick={() => setActiveTab('easy-listing')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'easy-listing' ? 'var(--purple)' : 'transparent',
                color: activeTab === 'easy-listing' ? '#fff' : 'var(--tx-m)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1" />
              <span>{isAr ? 'إدراج ذكي' : 'Easy Add'}</span>
            </button>
            {/* Internal marketing tools — staff only (partner accounts see the
                listing grid + Easy Add, never the outreach/scanner/AVM/brochure) */}
            {!restricted && (
              <>
            <button
              onClick={() => setActiveTab('valuation')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'valuation' ? 'var(--emerald)' : 'transparent',
                color: activeTab === 'valuation' ? '#07111E' : 'var(--tx-m)',
              }}
            >
              <Calculator className="w-3.5 h-3.5 inline mr-1" />
              <span>{isAr ? 'التقييم والمراجحة' : 'AVM Arbitrage'}</span>
            </button>
            <button
              onClick={() => setActiveTab('whatsapp-sender')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'whatsapp-sender' ? '#25D366' : 'transparent',
                color: activeTab === 'whatsapp-sender' ? '#07111E' : 'var(--tx-m)',
              }}
            >
              <Send className="w-3.5 h-3.5 inline mr-1" />
              <span>{isAr ? 'مرسل واتساب' : 'WhatsApp Outreach'}</span>
            </button>
            <button
              onClick={() => setActiveTab('whatsapp-scanner')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'whatsapp-scanner' ? 'var(--emerald)' : 'transparent',
                color: activeTab === 'whatsapp-scanner' ? '#07111E' : 'var(--tx-m)',
              }}
            >
              <Smartphone className="w-3.5 h-3.5 inline mr-1" />
              <span>{isAr ? 'ماسح الموبايل' : 'Mobile Harvester'}</span>
            </button>
            <button
              onClick={() => setActiveTab('brochure')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'brochure' ? 'var(--blue)' : 'transparent',
                color: activeTab === 'brochure' ? '#fff' : 'var(--tx-m)',
              }}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              <span>PDF Teaser</span>
            </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content — restricted (partner) sessions can never land on the
          staff-only tools even if a stale tab id survives in state */}
      {activeTab === 'valuation' && !restricted && <ValuationArbitrageStudio lang={lang} />}
      {activeTab === 'easy-listing' && <EasyListingStudio lang={lang} onListingPublishedAction={() => setActiveTab('inventory')} />}
      {activeTab === 'whatsapp-sender' && !restricted && <WhatsAppScheduledSender lang={lang} />}
      {activeTab === 'whatsapp-scanner' && !restricted && (
        <WhatsAppChatScanner
          lang={lang}
          onUnitsIngested={() => {
            fetch('/api/admin/listings?limit=500', { cache: 'no-store' })
              .then((r) => r.json())
              .then((d: any) => {
                if (Array.isArray(d?.listings) && d.listings.length > 0) {
                  setAllListingsData((prev) => {
                    const map = new Map(prev.map((i) => [i.sierraCode || i.code || i.id, i]));
                    d.listings.forEach((item: any) => {
                      const code = item.sierraCode || item.code || item.id;
                      map.set(code, { ...(map.get(code) || {}), ...item });
                    });
                    return Array.from(map.values());
                  });
                }
              })
              .catch(() => {});
          }}
        />
      )}
      {activeTab === 'brochure' && !restricted && <PropertyTeaserBrochure />}

      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Priority Callout Banner: Best Units Needing Photos */}
          {stats.bestNeedingPhotos > 0 && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(212, 175, 55, 0.15))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f59e0b',
                  }}
                >
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx-s)' }}>
                    {isAr ? 'رادار اقتناص الصور: وحدات استثمارية ممتازة بحاجة لصور عاجلة!' : 'Photo Hunter Radar: Prime High-Yield Units Need Photos!'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx-m)', marginTop: 2 }}>
                    {isAr
                      ? `تم اكتشاف ${stats.bestNeedingPhotos} وحدة في كمبوندات النخبة (ميفيدا، إيستاون، الرحاب، مدينتي) ليس لها صور. إرفاق الصور يزيد نسبة إغلاق الصفقات بـ 4.2 أضعاف.`
                      : `${stats.bestNeedingPhotos} premier units in flagship compounds (Mivida, Eastown, Rehab, Madinaty) currently have NO photos. Bringing photos unlocks client syndication!`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPhotoFilter(photoFilter === 'best_needing_photos' ? 'all' : 'best_needing_photos')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  background: photoFilter === 'best_needing_photos' ? '#f59e0b' : 'var(--bg-e)',
                  color: photoFilter === 'best_needing_photos' ? '#07111E' : '#f59e0b',
                  border: '1px solid #f59e0b',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Camera className="w-4 h-4" />
                <span>
                  {photoFilter === 'best_needing_photos'
                    ? (isAr ? 'عرض كل الوحدات' : 'Show All Units')
                    : (isAr ? `تصفية الوحدات الأفضل (${stats.bestNeedingPhotos})` : `View Best Units Needing Photos (${stats.bestNeedingPhotos})`)}
                </span>
              </button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            {[
              { label: isAr ? 'إجمالي المخزون' : 'Total Portfolio', val: stats.total.toLocaleString(), color: 'var(--gold)' },
              { label: isAr ? 'الوحدات المتاحة' : 'Available (Active)', val: stats.available.toLocaleString(), color: 'var(--emerald)' },
              { label: isAr ? 'وحدات بها صور' : 'With Verified Photos', val: `${stats.withPhotos} units`, color: 'var(--cyan)' },
              { label: isAr ? 'بحاجة لصور' : 'Missing Photos', val: `${stats.missingPhotos} units`, color: 'var(--amber)' },
              { label: isAr ? 'منشورة على الموقع' : 'Website Live', val: `${stats.webLive} live`, color: 'var(--purple)' },
              { label: isAr ? 'بروبرتي فايندر' : 'Property Finder', val: `${stats.pfLive} synced`, color: '#f97316' },
            ].map((m, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-e)',
                  border: '1px solid var(--bd)',
                  boxShadow: 'var(--clay-card-shadow)',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* Multi-Dimensional Filter Bar */}
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: 'var(--bg-e)',
              border: '1px solid var(--bd)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: 'var(--clay-card-shadow)',
            }}
          >
            {/* Search Input + Zone selector */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-f)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={isAr ? 'بحث بالكود، الكمبوند، نوع العقار، أو اسم المالك...' : 'Search by code, compound, type, owner, keyword...'}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 9,
                    background: 'var(--bg-e2)',
                    border: '1px solid var(--bd-s)',
                    color: 'var(--tx)',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Zone / Compound Selector */}
              <select
                aria-label={isAr ? 'تصفية حسب المنطقة أو الكمبوند' : 'Filter by Zone or Compound'}
                title={isAr ? 'تصفية حسب المنطقة أو الكمبوند' : 'Filter by Zone or Compound'}
                value={zoneFilter}
                onChange={(e) => {
                  setZoneFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 9,
                  background: 'var(--bg-e2)',
                  border: '1px solid var(--bd-s)',
                  color: 'var(--gold)',
                  fontSize: 12,
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="all">{isAr ? 'كل المناطق والكمبوندات' : 'All Zones & Compounds'}</option>
                {availableZones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            {/* Filter Pills Row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Type / Deal Pills */}
              <span style={{ fontSize: 11, color: 'var(--tx-f)', marginRight: 4 }}>Type:</span>
              {[
                { key: 'all', label: isAr ? 'الكل' : 'All' },
                { key: 'sale', label: isAr ? 'بيع' : 'Sale' },
                { key: 'rent', label: isAr ? 'إيجار' : 'Rent' },
                { key: 'owners', label: isAr ? 'مالك مباشر' : 'Direct Owners' },
                { key: 'villa', label: isAr ? 'فيلات' : 'Villas' },
                { key: 'apartment', label: isAr ? 'شقق' : 'Apartments' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setTypeFilter(f.key as any);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: typeFilter === f.key ? 'var(--gold)' : 'var(--surf)',
                    color: typeFilter === f.key ? '#07111E' : 'var(--tx)',
                    border: '1px solid var(--bd)',
                  }}
                >
                  {f.label}
                </button>
              ))}

              <span style={{ width: 1, height: 16, background: 'var(--bd)', margin: '0 4px' }} />

              {/* Photo Filter Pills */}
              <span style={{ fontSize: 11, color: 'var(--tx-f)', marginRight: 4 }}>Photos:</span>
              {[
                { key: 'all', label: 'All' },
                { key: 'has_photos', label: '📸 With Photos' },
                { key: 'missing_photos', label: '⚠️ Needs Photos' },
                { key: 'best_needing_photos', label: '⭐ Best Units Needing Photos' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setPhotoFilter(f.key as any);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background:
                      photoFilter === f.key
                        ? f.key === 'best_needing_photos'
                          ? '#f59e0b'
                          : 'var(--gold)'
                        : 'var(--surf)',
                    color: photoFilter === f.key ? '#07111E' : 'var(--tx)',
                    border: f.key === 'best_needing_photos' ? '1px solid #f59e0b' : '1px solid var(--bd)',
                  }}
                >
                  {f.label}
                </button>
              ))}

              <span style={{ width: 1, height: 16, background: 'var(--bd)', margin: '0 4px' }} />

              {/* Availability Filter Pills */}
              <span style={{ fontSize: 11, color: 'var(--tx-f)', marginRight: 4 }}>Availability:</span>
              {[
                { key: 'all', label: 'All' },
                { key: 'available', label: 'Available' },
                { key: 'pending', label: 'Pending' },
                { key: 'sold_rented', label: 'Rented / Sold' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setAvailabilityFilter(f.key as any);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: availabilityFilter === f.key ? 'var(--emerald)' : 'var(--surf)',
                    color: availabilityFilter === f.key ? '#07111E' : 'var(--tx)',
                    border: '1px solid var(--bd)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Notification Banner */}
          {bulkNotification && (
            <div
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                background: 'rgba(52, 211, 153, 0.15)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                color: 'var(--emerald)',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sparkles className="w-4 h-4" />
              <span>{bulkNotification}</span>
            </div>
          )}

          {/* Bulk Action Bar */}
          {selectedListingIds.length > 0 && (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: 'var(--bg-e)',
                border: '1px solid var(--gold)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'var(--gold)',
                    color: '#07111E',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {selectedListingIds.length} Selected
                </span>
                <button
                  onClick={() => setSelectedListingIds([])}
                  style={{ background: 'none', border: 'none', color: 'var(--tx-f)', fontSize: 11, textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Deselect All
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--tx-f)' }}>Set Availability:</span>
                <select
                  aria-label={isAr ? 'تغيير حالة التوفر المجمعة' : 'Set Bulk Availability Status'}
                  title={isAr ? 'تغيير حالة التوفر المجمعة' : 'Set Bulk Availability Status'}
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'var(--bg-e2)',
                    color: 'var(--tx)',
                    border: '1px solid var(--bd)',
                    fontSize: 11,
                  }}
                >
                  <option value="Available">Available</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Sold">Sold</option>
                  <option value="Archived">Archived</option>
                </select>
                <button
                  onClick={handleApplyBulkStatus}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'var(--emerald)',
                    color: '#07111E',
                    fontSize: 11,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Apply
                </button>
                <button
                  onClick={handleExportSelectedCSV}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'var(--surf)',
                    color: 'var(--tx)',
                    border: '1px solid var(--bd)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Download className="w-3 h-3" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          )}

          {/* Results Counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--tx-m)', padding: '0 4px' }}>
            <span>
              Showing <strong style={{ color: 'var(--tx-s)' }}>{filteredListings.length}</strong> matching properties (Page {currentPage} of {totalPages || 1})
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}
              >
                Clear search
              </button>
            )}
          </div>

          {/* Table Container */}
          <div
            style={{
              overflowX: 'auto',
              borderRadius: 14,
              border: '1px solid var(--bd)',
              background: 'var(--bg-e)',
              boxShadow: 'var(--clay-card-shadow)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--surf)',
                    borderBottom: '1px solid var(--bd)',
                    color: 'var(--tx-f)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <th style={{ padding: '12px 14px', width: 36, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      aria-label="Select all listings on this page"
                      title="Select all listings on this page"
                      checked={paginatedListings.length > 0 && paginatedListings.every((i) => selectedListingIds.includes(i.sierraCode || i.code || `SE-${i.id}`))}
                      onChange={handleToggleSelectAllPage}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 14px', width: 80 }}>Photo</th>
                  <th style={{ padding: '12px 14px' }}>Unit & Ref</th>
                  <th style={{ padding: '12px 14px' }}>Compound & Zone</th>
                  <th style={{ padding: '12px 14px' }}>Specs</th>
                  <th style={{ padding: '12px 14px' }}>Price & Mode</th>
                  <th style={{ padding: '12px 14px' }}>Availability</th>
                  <th style={{ padding: '12px 14px' }}>Syndication</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedListings.map((item, idx) => {
                  const code = item.sierraCode || item.code || `SE-${item.id}`;
                  const isSelected = selectedListingIds.includes(code);
                  const isRent = item.operation === 'Rent' || item.mode === 'rent';
                  const hasImg = Boolean(item.hasPhotos || (item.photos && item.photos.length > 0) || item.image || item.img);
                  const photoUrl = item.image || (item.photos && item.photos[0]) || (typeof item.img === 'string' ? item.img : null);
                  const topUnit = isBestUnit(item);
                  const needsPhotos = topUnit && !hasImg;

                  return (
                    <tr
                      key={code || idx}
                      style={{
                        borderBottom: '1px solid var(--bd)',
                        background: isSelected ? 'rgba(0, 174, 255, 0.08)' : needsPhotos ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          aria-label={`Select listing ${code}`}
                          title={`Select listing ${code}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(code)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Photo Thumbnail */}
                      <td style={{ padding: '12px 14px' }}>
                        {hasImg && photoUrl ? (
                          <div style={{ position: 'relative', width: 56, height: 42 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrl}
                              alt={code}
                              style={{ width: 56, height: 42, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--bd)' }}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                bottom: -2,
                                right: -2,
                                background: 'var(--emerald)',
                                color: '#07111E',
                                fontSize: 9,
                                fontWeight: 700,
                                borderRadius: 4,
                                padding: '1px 3px',
                              }}
                            >
                              ✓
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActivePhotoModalUnit(item)}
                            title="Bring photos for this unit"
                            style={{
                              width: 56,
                              height: 42,
                              borderRadius: 8,
                              background: needsPhotos ? 'rgba(245, 158, 11, 0.18)' : 'var(--surf)',
                              border: needsPhotos ? '1px dashed #f59e0b' : '1px dashed var(--bd-s)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              cursor: 'pointer',
                              color: needsPhotos ? '#f59e0b' : 'var(--tx-f)',
                            }}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span style={{ fontSize: 8, fontWeight: 700 }}>{needsPhotos ? 'BRING' : 'Add'}</span>
                          </button>
                        )}
                      </td>

                      {/* Unit Code & Tags */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--gold)', fontSize: 13 }}>{code}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {topUnit && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                              }}
                            >
                              ⭐ TOP ASSET
                            </span>
                          )}
                          {needsPhotos && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: 'rgba(230, 57, 70, 0.15)',
                                color: 'var(--red)',
                                border: '1px solid rgba(230, 57, 70, 0.3)',
                              }}
                            >
                              📸 NEEDS PHOTOS
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Compound & Location */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--tx-s)' }}>{item.compound || item.location || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--tx-f)', marginTop: 2 }}>{item.location || item.zone || '—'}</div>
                      </td>

                      {/* Specs */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--tx)' }}>{item.type || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--tx-f)', marginTop: 2 }}>
                          {item.bedrooms || item.beds || '?'} Beds · {item.bathrooms || item.baths || '?'} Baths · {item.area_sqm || item.area || '?'}m²
                        </div>
                      </td>

                      {/* Price & Mode */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--tx-s)' }}>
                          {item.priceFormatted || (item.price > 0 ? `${item.price.toLocaleString()} EGP` : 'Price on Call')}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: 4,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            background: isRent ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 174, 255, 0.15)',
                            color: isRent ? 'var(--amber)' : 'var(--gold)',
                          }}
                        >
                          {isRent ? 'RENT' : 'SALE'}
                        </span>
                      </td>

                      {/* Availability Dropdown */}
                      <td style={{ padding: '12px 14px' }}>
                        <select
                          aria-label={`Update status for unit ${code}`}
                          title={`Update status for unit ${code}`}
                          value={item.status || 'Available'}
                          onChange={(e) => handleUpdateAvailability(code, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none',
                            background:
                              (item.status || 'Available') === 'Available'
                                ? 'rgba(52, 211, 153, 0.15)'
                                : (item.status || '') === 'Reserved'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(230, 57, 70, 0.15)',
                            color:
                              (item.status || 'Available') === 'Available'
                                ? 'var(--emerald)'
                                : (item.status || '') === 'Reserved'
                                ? 'var(--amber)'
                                : 'var(--red)',
                            border: '1px solid var(--bd)',
                          }}
                        >
                          <option value="Available">Available</option>
                          <option value="Reserved">Reserved</option>
                          <option value="Rented">Rented</option>
                          <option value="Sold">Sold</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </td>

                      {/* Syndication Switches (Website & Property Finder) */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {/* Website Toggle */}
                          <button
                            onClick={() => handleToggleWebsitePublish(code)}
                            title={item.publishToClient ? 'Published to website — Click to unpublish' : 'Hidden from website — Click to publish'}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: item.publishToClient ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid var(--bd)',
                              background: item.publishToClient ? 'rgba(52, 211, 153, 0.15)' : 'var(--surf)',
                              color: item.publishToClient ? 'var(--emerald)' : 'var(--tx-f)',
                            }}
                          >
                            <Globe className="w-3 h-3" />
                            <span>{item.publishToClient ? 'Website: LIVE' : 'Website: DRAFT'}</span>
                          </button>

                          {/* Property Finder Toggle */}
                          <button
                            onClick={() => handleTogglePfSyndicate(code)}
                            title={item.syndicatedToPf ? 'Syndicated to Property Finder — Click to remove' : 'Not syndicated — Click to push to Property Finder'}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: item.syndicatedToPf ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid var(--bd)',
                              background: item.syndicatedToPf ? 'rgba(249, 115, 22, 0.15)' : 'var(--surf)',
                              color: item.syndicatedToPf ? '#f97316' : 'var(--tx-f)',
                            }}
                          >
                            <Building2 className="w-3 h-3" />
                            <span>{item.syndicatedToPf ? 'PF: SYNCED' : 'PF: QUEUED'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                          <button
                            onClick={() => setActivePhotoModalUnit(item)}
                            title="Manage Photos"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: needsPhotos ? 'rgba(245, 158, 11, 0.2)' : 'var(--surf)',
                              border: needsPhotos ? '1px solid #f59e0b' : '1px solid var(--bd)',
                              color: needsPhotos ? '#f59e0b' : 'var(--tx)',
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <Camera className="w-3 h-3" />
                            <span>{needsPhotos ? 'Bring Photos' : 'Photos'}</span>
                          </button>

                          <button
                            onClick={() => setActiveValuationUnit(item)}
                            title="Instant AVM Valuation"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: 'var(--surf)',
                              border: '1px solid var(--bd)',
                              color: 'var(--emerald)',
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <Zap className="w-3 h-3" />
                            <span>AVM</span>
                          </button>

                          <a
                            href={`/property/${encodeURIComponent(code)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on Client Portal"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: 'var(--surf)',
                              border: '1px solid var(--bd)',
                              color: 'var(--gold)',
                              fontSize: 11,
                              display: 'flex',
                              alignItems: 'center',
                              textDecoration: 'none',
                            }}
                          >
                            <Eye className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-e)',
                  border: '1px solid var(--bd)',
                  color: 'var(--tx)',
                  fontSize: 11,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, color: 'var(--tx-m)', fontFamily: 'monospace' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-e)',
                  border: '1px solid var(--bd)',
                  color: 'var(--tx)',
                  fontSize: 11,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHOTO ATTACH / HUNTER MODAL */}
      {activePhotoModalUnit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7, 17, 30, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivePhotoModalUnit(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              background: 'var(--bg-e)',
              border: '1px solid var(--bd)',
              borderRadius: 18,
              padding: 24,
              boxShadow: 'var(--clay-card-shadow)',
              color: 'var(--tx)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx-s)' }}>
                  Attach Photos · {activePhotoModalUnit.sierraCode || activePhotoModalUnit.code}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                title="Close"
                onClick={() => setActivePhotoModalUnit(null)}
                style={{ background: 'none', border: 'none', color: 'var(--tx-f)', cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--tx-m)', lineHeight: 1.5 }}>
              Attach verified photos for <strong>{activePhotoModalUnit.compound}</strong> ({activePhotoModalUnit.type} · {activePhotoModalUnit.priceFormatted || `${activePhotoModalUnit.price?.toLocaleString()} EGP`}). Units with photos achieve 4.2x higher conversion on Property Finder and Client Portal.
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--tx-f)' }}>
                {isAr
                  ? 'ℹ️ البوت بيستقبل النصوص فقط — الصور بتترفع من هنا وتتحفظ على الوحدة مباشرة.'
                  : 'ℹ️ The bot accepts text only — photos are uploaded HERE and saved onto the unit.'}
              </div>
            </div>

            {/* Upload from device — the photos' front door (bot never accepts images) */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 6 }}>
                {isAr ? '⬆️ رفع صور من الجهاز / الموبايل' : '⬆️ Upload Photos From Device'}
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px 12px',
                  borderRadius: 10,
                  border: '2px dashed rgba(200, 150, 26, 0.45)',
                  background: 'rgba(200, 150, 26, 0.06)',
                  cursor: uploadingPhotos ? 'wait' : 'pointer',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--gold)',
                }}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  multiple
                  disabled={uploadingPhotos}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    void handleDevicePhotoUpload(e.target.files);
                    e.currentTarget.value = '';
                  }}
                />
                <Camera className="w-4 h-4" />
                {uploadingPhotos
                  ? isAr ? 'جاري الرفع…' : 'Uploading…'
                  : isAr ? 'اختر صور (حتى 10) — هتتحفظ على الوحدة فوراً'
                         : 'Choose photos (up to 10) — saved onto the unit instantly'}
              </label>
              {uploadError && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#FCA5A5' }}>⚠ {uploadError}</div>
              )}
            </div>

            {/* Request photos from the owner/broker over WhatsApp */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase' }}>
                {isAr ? '💬 طلب الصور من المالك/الوسيط (واتساب)' : '💬 Request Photos From Owner/Broker (WhatsApp)'}
              </div>
              <button
                type="button"
                onClick={() => void handleRequestPhotos()}
                disabled={photoRequestSending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(37, 211, 102, 0.12)',
                  border: '1px solid rgba(37, 211, 102, 0.4)',
                  color: '#25D366',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: photoRequestSending ? 'wait' : 'pointer',
                  opacity: photoRequestSending ? 0.6 : 1,
                }}
              >
                <Send className="w-4 h-4" />
                {photoRequestSending
                  ? isAr ? 'جاري الإرسال…' : 'Queueing…'
                  : isAr ? 'ابعت طلب الصور على واتساب'
                         : 'Send Photo Request via WhatsApp'}
              </button>
              {photoRequestResult && (
                <div style={{ fontSize: 11, color: photoRequestResult.startsWith('✓') ? '#34D399' : '#FCA5A5' }}>
                  {photoRequestResult}
                </div>
              )}
            </div>

            {/* Presets based on compound */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 6 }}>
                Recommended Verified Community Presets ({activePhotoModalUnit.compound})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {getCommunityPreset(activePhotoModalUnit.compound).map((url, i) => (
                  <div
                    key={i}
                    onClick={() => handleApplyPhotos(activePhotoModalUnit.sierraCode || activePhotoModalUnit.code, [url])}
                    style={{
                      border: '1px solid var(--bd)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: 'var(--surf)',
                      transition: 'transform 0.15s',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Preset" style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                    <div style={{ padding: '6px 8px', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>
                      Apply Preset {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom URL Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx-f)' }}>
                Or Paste Image URL (from Cloud Storage / WhatsApp / Unsplash):
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="url"
                  placeholder="https://static.shared.propertyfinder.eg/media/images/listing/01JPEKVA63EPQ4R9N1H5KT2FSX/e1e2eba5-ed1e-11ef-8cf7-0a8c5593e6a3-eb58b4d5-7931-4ccf-8873-c1315a729f60.png or https://gaxfqcietzoonlmatiot.supabase.co/storage/..."
                  value={customPhotoUrl}
                  onChange={(e) => setCustomPhotoUrl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-e2)',
                    border: '1px solid var(--bd-s)',
                    color: 'var(--tx)',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
                <button
                  disabled={!customPhotoUrl.trim()}
                  onClick={() => {
                    if (customPhotoUrl.trim()) {
                      handleApplyPhotos(activePhotoModalUnit.sierraCode || activePhotoModalUnit.code, [customPhotoUrl.trim()]);
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: 'var(--gold)',
                    color: '#07111E',
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: customPhotoUrl.trim() ? 'pointer' : 'not-allowed',
                    opacity: customPhotoUrl.trim() ? 1 : 0.5,
                  }}
                >
                  Save Photo
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setActivePhotoModalUnit(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: 'var(--surf)',
                  border: '1px solid var(--bd)',
                  color: 'var(--tx)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCIDENTAL DATA LOSS GUARD MODAL FOR BULK ARCHIVE */}
      <AccidentalDataLossGuardModal
        isOpen={isGuardModalOpen}
        lang={lang}
        affectedCount={selectedListingIds.length}
        title={{
          en: 'Confirm Bulk Archive Listings',
          ar: 'تأكيد أرشفة العقارات المحددة',
        }}
        actionDescription={{
          en: 'You are about to archive multiple selected listings. Archived listings will be hidden from client feeds.',
          ar: 'أنت على وشك أرشفة مجموعة من العقارات. سيتم إخفاء العقارات المؤرشفة من واجهة العملاء.',
        }}
        impactSummary={{
          en: `${selectedListingIds.length} property listing(s) will be marked as Archived.`,
          ar: `سيتم تحديد ${selectedListingIds.length} عقار كعقارات مؤرشفة.`,
        }}
        onConfirm={() => {
          setAllListingsData((prev) =>
            prev.map((item) => {
              const id = item.sierraCode || item.code || `SE-${item.id}`;
              if (selectedListingIds.includes(id)) {
                return { ...item, status: 'Archived' };
              }
              return item;
            })
          );
          setBulkNotification(`Archived ${selectedListingIds.length} properties`);
          setSelectedListingIds([]);
          setIsGuardModalOpen(false);
          setTimeout(() => setBulkNotification(null), 3000);
        }}
        onCancel={() => setIsGuardModalOpen(false)}
      />
    </div>
  );
}

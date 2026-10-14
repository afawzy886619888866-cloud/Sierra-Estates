'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  ExternalLink,
  Download,
  RefreshCw,
  Building,
  Phone,
  Calendar,
  MapPin,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import defaultOnlineUnits from '@/data/online-sheet-units.json';

export interface InventoryUnitRow {
  id?: string;
  code?: string;
  lastUpdate?: string;
  availability?: string; // 'Available' | 'Under Offer' | 'Sold' | 'Rented'
  compound?: string;
  compoundCluster?: string;
  price?: number | string;
  rooms?: number | string | null;
  beds?: number | string | null;
  bathrooms?: number | string | null;
  space?: string | null;
  propertyType?: string | null;
  phone?: string | null;
  contactPhone?: string | null;
  sender?: string | null;
  groupName?: string | null;
  deal?: string; // 'Sale' | 'Rent'
  advertiserType?: string; // 'Owner' | 'Broker'
  [key: string]: any;
}

export interface AdminInventoryTableProps {
  units?: InventoryUnitRow[];
}

export const MASTER_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit?gid=341562911#gid=341562911';

// Canonical compound cluster dictionary with multilingual labels and all real-estate variations
export const COMPOUND_CLUSTERS: Record<
  string,
  { labelEn: string; labelAr: string; aliases: string[] }
> = {
  mivida: {
    labelEn: 'Mivida (All Phases)',
    labelAr: 'ميفيدا (كافة المراحل والبوليفارد)',
    aliases: [
      'mivida',
      'mivida (blue views)',
      'mivida boulevard',
      'mivida (boulevard)',
      'mivida gardens',
      'mivida (p10)',
      'mivida parks',
      'mevida',
      'ميفيدا',
    ],
  },
  fifth_square: {
    labelEn: 'Fifth Square (Al Marasem)',
    labelAr: 'فيفث سكوير (المراسم)',
    aliases: [
      'fifth square',
      '5th square',
      '5th square al marasem',
      'fifth square al marasem',
      'fifth square marasem',
      'the square, 5th square',
      'المراسم',
      'مراسم',
    ],
  },
  villette: {
    labelEn: 'Villette / SODIC',
    labelAr: 'فيليت / سوديك (سكاي كوندوز وفي ريزيدنس)',
    aliases: [
      'villette',
      'v residence',
      'villette (v residence)',
      'villette (sky condos)',
      'villette (skycondos)',
      'villette (sodic)',
      'فيليت',
      'سوديك',
    ],
  },
  mountain_view: {
    labelEn: 'Mountain View',
    labelAr: 'ماونتن فيو (هايد بارك، آي سيتي، إي آر كي)',
    aliases: [
      'mountain view hyde park',
      'mv hp',
      'mountain view icity',
      'mountain view i-city',
      'mountain view erk',
      'mountain view executive',
      'mountain view',
      'ماونتن فيو',
    ],
  },
  hyde_park: {
    labelEn: 'Hyde Park',
    labelAr: 'هايد بارك (التجمع الخامس)',
    aliases: ['hyde park', 'the square hyde park', 'hyde park new cairo', 'هايد بارك'],
  },
  uptown_cairo: {
    labelEn: 'Uptown Cairo',
    labelAr: 'أب تاون كايرو (أورورا وإعمار)',
    aliases: [
      'uptown cairo',
      'aurora, uptown cairo',
      'aurora uptown cairo',
      'up town cairo',
      'uptown',
      'أب تاون كايرو',
    ],
  },
  lake_view: {
    labelEn: 'Lake View Residence',
    labelAr: 'ليك فيو ريزيدنس',
    aliases: ['lake view', 'lake view res.', 'lake view residence', 'ليك فيو'],
  },
  rehab: {
    labelEn: 'Al Rehab City',
    labelAr: 'مدينة الرحاب (الرحاب 1 و 2)',
    aliases: ['al rehab', 'el rehab', 'الرحاب', 'الرحاب 2', 'rehab'],
  },
  madinaty: {
    labelEn: 'Madinaty',
    labelAr: 'مدينتي',
    aliases: ['madinaty', 'مدينتي'],
  },
  eastown: {
    labelEn: 'Eastown (SODIC)',
    labelAr: 'إيستاون (سوديك)',
    aliases: ['eastown', 'sodic east', 'east town', 'ايستاون'],
  },
  the_address_east: {
    labelEn: 'The Address East',
    labelAr: 'ذي أدريس إيست',
    aliases: ['the address east', 'address east', 'ذي أدريس إيست'],
  },
  galleria: {
    labelEn: 'Galleria Moon Valley',
    labelAr: 'جاليريا مون فالي',
    aliases: ['galleria moon valley', 'galleria', 'جاليريا'],
  },
  first_settlement: {
    labelEn: 'First Settlement',
    labelAr: 'التجمع الأول',
    aliases: ['التجمع الأول', 'first settlement'],
  },
  south_academy: {
    labelEn: 'South Academy Villas',
    labelAr: 'فيلات جنوب الأكاديمية',
    aliases: ['فيلات جنوب الاكاديميه', 'south academy'],
  },
  jayd: {
    labelEn: 'Jayd Compound',
    labelAr: 'كمبوند جايد',
    aliases: ['كمبوند جايد', 'jayd'],
  },
  lotus: {
    labelEn: 'El Lotus',
    labelAr: 'حي اللوتس',
    aliases: ['اللوتس', 'lotus', 'el lotus'],
  },
  other: {
    labelEn: 'Other Prime Enclaves',
    labelAr: 'كمبوندات أخرى (ستون، ميراد، كابيتال جاردنز)',
    aliases: [
      'stone residence',
      'la mirada',
      'palm hills capital gardens',
      'porto new cairo',
      'the avenues',
      'top view',
      'الميراج جاردن',
      'فاميلي المستثمرين',
    ],
  },
};

function resolveClusterKey(compoundName?: string): string {
  if (!compoundName) return 'other';
  const norm = compoundName.trim().toLowerCase();
  for (const [key, cluster] of Object.entries(COMPOUND_CLUSTERS)) {
    if (key === 'other') continue;
    if (cluster.aliases.some((a) => norm.includes(a.toLowerCase()) || a.toLowerCase().includes(norm))) {
      return key;
    }
  }
  return 'other';
}

export default function AdminInventoryTable({ units }: AdminInventoryTableProps) {
  // Master data: use passed units or default to the parsed 102 units from online Google Sheet gid=341562911
  const [data, setData] = useState<InventoryUnitRow[]>(() => {
    const raw = units && units.length > 0 ? units : (defaultOnlineUnits as InventoryUnitRow[]);
    return raw.map((u, i) => {
      const comp = u.compound || (u as any).location || 'القاهرة الجديدة';
      const clusterKey = resolveClusterKey(comp);
      const clusterObj = COMPOUND_CLUSTERS[clusterKey];
      return {
        id: u.id || `UNIT-${i + 1}`,
        code: u.code || `SE-ONL-${(i + 1).toString().padStart(3, '0')}`,
        lastUpdate: u.lastUpdate || 'Synced',
        availability: u.availability || (u as any).status || 'Available',
        compound: comp,
        compoundCluster: clusterObj ? clusterObj.labelEn : 'Other Compounds',
        compoundClusterKey: clusterKey,
        price: u.price != null && !isNaN(Number(u.price)) ? Number(u.price) : 0,
        rooms: u.rooms ?? u.beds ?? null,
        bathrooms: u.bathrooms ?? (u as any).bath ?? null,
        space: u.space ?? (u as any).area ?? null,
        propertyType: u.propertyType ?? (u as any).property_type ?? 'Apartment',
        phone: u.phone || u.contactPhone || null,
        sender: u.sender || null,
        groupName: u.groupName || null,
        deal: u.deal || ((u as any).mode === 'rent' ? 'Rent' : 'Sale'),
        advertiserType: u.advertiserType || ((u as any).isDirectOwner ? 'Owner' : 'Broker'),
      };
    });
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [selectedDeal, setSelectedDeal] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRooms, setSelectedRooms] = useState<string>('all');
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status Change Callback
  const handleStatusChange = (index: number, newStatus: string) => {
    setData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], availability: newStatus };
      return updated;
    });
  };

  // Re-fetch / Reload from online master sheet
  const handleRefreshSheet = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/inventory?limit=500', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.units && json.units.length > 0) {
          setData(
            json.units.map((u: any, i: number) => {
              const comp = u.compound || u.location || 'القاهرة الجديدة';
              const clusterKey = resolveClusterKey(comp);
              return {
                id: u.id || `UNIT-${i + 1}`,
                code: u.code || `SE-ONL-${(i + 1).toString().padStart(3, '0')}`,
                lastUpdate: u.updatedAt || 'Synced',
                availability: u.status === 'available' ? 'Available' : u.status || 'Available',
                compound: comp,
                compoundCluster: COMPOUND_CLUSTERS[clusterKey]?.labelEn || 'Other Compounds',
                compoundClusterKey: clusterKey,
                price: u.price || 0,
                rooms: u.beds || null,
                bathrooms: u.bath || null,
                space: u.area ? `${u.area} m²` : null,
                propertyType: u.propertyType || 'Apartment',
                phone: u.phone || null,
                sender: u.comment || 'Online Master',
                deal: u.mode === 'rent' ? 'Rent' : 'Sale',
                advertiserType: u.party || 'Broker',
              };
            })
          );
        }
      }
    } catch {
      // keep existing data gracefully
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSearch =
          (row.compound && row.compound.toLowerCase().includes(q)) ||
          (row.code && row.code.toLowerCase().includes(q)) ||
          (row.propertyType && row.propertyType.toLowerCase().includes(q)) ||
          (row.phone && row.phone.toLowerCase().includes(q)) ||
          (row.sender && row.sender.toLowerCase().includes(q)) ||
          (row.groupName && row.groupName.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }

      // Cluster filter
      if (selectedCluster !== 'all') {
        const cluster = COMPOUND_CLUSTERS[selectedCluster];
        if (cluster) {
          const normCompound = (row.compound || '').toLowerCase();
          const matchAlias = cluster.aliases.some((alias) =>
            normCompound.includes(alias.toLowerCase()) || alias.toLowerCase().includes(normCompound)
          );
          if (!matchAlias && row.compoundClusterKey !== selectedCluster) return false;
        }
      }

      // Deal filter
      if (selectedDeal !== 'all' && row.deal !== selectedDeal) return false;

      // Status filter
      if (selectedStatus !== 'all' && row.availability !== selectedStatus) return false;

      // Rooms filter
      if (selectedRooms !== 'all') {
        if (selectedRooms === 'unspecified') {
          if (row.rooms != null && Number(row.rooms) > 0) return false;
        } else if (selectedRooms === '4+') {
          if (!row.rooms || Number(row.rooms) < 4) return false;
        } else {
          if (String(row.rooms) !== selectedRooms) return false;
        }
      }

      // Advertiser filter
      if (selectedAdvertiser !== 'all' && row.advertiserType !== selectedAdvertiser) return false;

      return true;
    });
  }, [data, search, selectedCluster, selectedDeal, selectedStatus, selectedRooms, selectedAdvertiser]);

  // Export CSV
  const handleExportExcel = () => {
    const headers = [
      'Code',
      'Last Update',
      'Status',
      'Compound',
      'Similar Cluster',
      'Property Type',
      'Price (EGP)',
      'Rooms',
      'Bathrooms',
      'Area',
      'Deal',
      'Advertiser',
      'Sender / Source',
      'Phone',
    ];
    const csvRows = [
      headers.join(','),
      ...filteredData.map((r) =>
        [
          `"${r.code || ''}"`,
          `"${r.lastUpdate || ''}"`,
          `"${r.availability || ''}"`,
          `"${r.compound || ''}"`,
          `"${r.compoundCluster || ''}"`,
          `"${r.propertyType || 'Apartment'}"`,
          r.price || 0,
          `"${r.rooms ?? 'غير مذكور'}"`,
          `"${r.bathrooms ?? 'غير مذكور'}"`,
          `"${r.space ?? 'غير مذكور'}"`,
          `"${r.deal || ''}"`,
          `"${r.advertiserType || ''}"`,
          `"${r.sender || ''}"`,
          `"${r.phone || ''}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sierra_online_master_inventory_gid_341562911_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setSelectedCluster('all');
    setSelectedDeal('all');
    setSelectedStatus('all');
    setSelectedRooms('all');
    setSelectedAdvertiser('all');
  };

  // Compound counts per cluster for the dropdown
  const clusterCounts = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((u) => {
      const k = u.compoundClusterKey || resolveClusterKey(u.compound);
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [data]);

  return (
    <div className="w-full bg-[#07111E] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-4 sm:p-6 font-sans">
      <div className="space-y-6">
        {/* Top Header & Live Google Sheet Integration */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Building className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>المخزون الرئيسي الأونلاين</span>
                <span className="text-slate-400 font-normal text-sm">| Online Master Inventory</span>
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Tab gid=341562911
              </span>
            </div>
            <p className="text-xs text-slate-400 font-arabic">
              الشيت الأونلاين المعتمد لوحدات التجمع الخامس مع تجميع الكمبوندات المتشابهة ومعالجة البيانات الناقصة
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <a
              href={MASTER_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/60 hover:bg-emerald-600/30 text-emerald-300 hover:text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              title="Open Google Sheet in new tab"
            >
              <span>📊 فتح الشيت المباشر</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={handleRefreshSheet}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer disabled:opacity-50"
              title="Refresh / Sync with Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#C9A84C] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-linear-to-r from-[#C9A84C] to-[#E9C176] hover:brightness-110 text-[#07111E] text-xs font-bold transition cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">
              إجمالي الوحدات المعروضة
            </div>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">
              {filteredData.length} <span className="text-xs text-slate-400 font-sans">من {data.length}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50">
            <div className="text-[11px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
              الوحدات المتاحة
            </div>
            <div className="text-2xl font-extrabold text-emerald-300 font-mono mt-1">
              {filteredData.filter((u) => u.availability === 'Available').length}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#211A0D]/60 border border-[#C9A84C]/40">
            <div className="text-[11px] font-mono text-[#E9C176] uppercase font-bold tracking-wider">
              عقود الإيجار النشطة
            </div>
            <div className="text-2xl font-extrabold text-[#F5D78E] font-mono mt-1">
              {filteredData.filter((u) => u.deal === 'Rent').length}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/50">
            <div className="text-[11px] font-mono text-blue-400 uppercase font-bold tracking-wider">
              الكمبوندات النشطة
            </div>
            <div className="text-2xl font-extrabold text-blue-300 font-mono mt-1">
              {new Set(filteredData.map((u) => u.compound)).size} <span className="text-xs text-blue-400/80">كمبوند</span>
            </div>
          </div>
        </div>

        {/* Dropdown Filters & Search Controls */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-mono uppercase">
              <SlidersHorizontal className="w-4 h-4 text-[#C9A84C]" />
              <span>فلاتر البحث الذكية والتجميع</span>
            </div>
            {(selectedCluster !== 'all' ||
              selectedDeal !== 'all' ||
              selectedStatus !== 'all' ||
              selectedRooms !== 'all' ||
              selectedAdvertiser !== 'all' ||
              search) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-[#C9A84C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالكمبوند، الكود، الهاتف، المرسل..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 focus:border-[#C9A84C] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            {/* Compound Cluster Dropdown (Similar Compounds Menu) */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                الكمبوندات المتشابهة
              </label>
              <select
                value={selectedCluster}
                onChange={(e) => setSelectedCluster(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700/80 focus:border-[#C9A84C] rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">🏢 جميع الكمبوندات ({data.length})</option>
                {Object.entries(COMPOUND_CLUSTERS).map(([key, cluster]) => {
                  const count = clusterCounts[key] || 0;
                  return (
                    <option key={key} value={key}>
                      {cluster.labelEn} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Deal Type Dropdown */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">نوع العملية</label>
              <select
                value={selectedDeal}
                onChange={(e) => setSelectedDeal(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700/80 focus:border-[#C9A84C] rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">الكل (إيجار وبيع)</option>
                <option value="Rent">إيجار (Rent)</option>
                <option value="Sale">بيع (Sale)</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">حالة الوحدة</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700/80 focus:border-[#C9A84C] rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">كل الحالات</option>
                <option value="Available">Available (متاح)</option>
                <option value="Under Offer">Under Offer (تحت العرض)</option>
                <option value="Rented">Rented (مؤجر)</option>
                <option value="Sold">Sold (تم البيع)</option>
              </select>
            </div>

            {/* Rooms Dropdown */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">عدد الغرف</label>
              <select
                value={selectedRooms}
                onChange={(e) => setSelectedRooms(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700/80 focus:border-[#C9A84C] rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">أي عدد</option>
                <option value="1">غرفة واحدة</option>
                <option value="2">غرفتان (2 Beds)</option>
                <option value="3">3 غرف (3 Beds)</option>
                <option value="4+">4 غرف أو أكثر (4+)</option>
                <option value="unspecified">غير مذكور (—)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Master Inventory Data Table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-300 text-[11px] uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">الكود والوقت</th>
                  <th className="py-3 px-3.5">الكمبوند والتجميع</th>
                  <th className="py-3 px-3.5">النوع</th>
                  <th className="py-3 px-3.5">السعر (EGP)</th>
                  <th className="py-3 px-3.5">الغرف</th>
                  <th className="py-3 px-3.5">الحمامات</th>
                  <th className="py-3 px-3.5">المساحة</th>
                  <th className="py-3 px-3.5">العملية</th>
                  <th className="py-3 px-3.5">الحالة</th>
                  <th className="py-3 px-3.5">المرسل / التواصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Building className="w-8 h-8 text-slate-600" />
                        <span className="text-sm font-medium">لا توجد وحدات مطابقة للفلاتر المحددة</span>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-xs text-[#C9A84C] hover:underline cursor-pointer"
                        >
                          إعادة ضبط الفلاتر لعرض كافة الوحدات
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Code & Update */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono text-white font-bold block">{row.code}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {row.lastUpdate || 'Synced'}
                        </span>
                      </td>

                      {/* Compound with Cluster Badge */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#C9A84C] shrink-0" />
                          <span className="truncate max-w-45">{row.compound}</span>
                        </div>
                        {row.compoundCluster && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60 mt-1">
                            {row.compoundCluster}
                          </span>
                        )}
                      </td>

                      {/* Property Type (with graceful fallback) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {row.propertyType ? (
                          <span className="text-slate-300 font-medium">{row.propertyType}</span>
                        ) : (
                          <span className="text-slate-500 italic">عقار سكني</span>
                        )}
                      </td>

                      {/* Price (EGP) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {row.price && Number(row.price) > 0 ? (
                          <div>
                            <span className="font-bold text-[#F5D78E] font-mono block">
                              {Number(row.price).toLocaleString('en-US')} EGP
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {row.deal === 'Rent' ? '/شهرياً' : 'إجمالي'}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/50">
                            عند الطلب
                          </span>
                        )}
                      </td>

                      {/* Rooms (Graceful fallback) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {row.rooms != null && Number(row.rooms) > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-slate-800 font-mono font-bold text-slate-200">
                            {row.rooms} {Number(row.rooms) === 1 ? 'غرفة' : 'غرف'}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px] italic">غير مذكور (—)</span>
                        )}
                      </td>

                      {/* Bathrooms (Graceful fallback) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {row.bathrooms != null && Number(row.bathrooms) > 0 ? (
                          <span className="text-slate-300 font-mono">
                            {row.bathrooms} حمام
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px] italic">غير مذكور (—)</span>
                        )}
                      </td>

                      {/* Space / Area (Graceful fallback) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {row.space ? (
                          <span className="text-slate-300 font-mono">{row.space}</span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px] italic">غير مذكور (—)</span>
                        )}
                      </td>

                      {/* Deal Type */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            row.deal === 'Rent'
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                              : 'bg-blue-950/60 text-blue-300 border border-blue-800/60'
                          }`}
                        >
                          {row.deal === 'Rent' ? 'إيجار' : 'بيع'}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <select
                          value={row.availability || 'Available'}
                          onChange={(e) => handleStatusChange(idx, e.target.value)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded border outline-none cursor-pointer ${
                            row.availability === 'Sold'
                              ? 'bg-red-950/60 text-red-300 border-red-800/60'
                              : row.availability === 'Rented'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                              : row.availability === 'Under Offer'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                          }`}
                        >
                          <option value="Available" className="bg-[#0A1628] text-white">متاح (Available)</option>
                          <option value="Under Offer" className="bg-[#0A1628] text-white">تحت التفاوض (Under Offer)</option>
                          <option value="Rented" className="bg-[#0A1628] text-white">تم التأجير (Rented)</option>
                          <option value="Sold" className="bg-[#0A1628] text-white">تم البيع (Sold)</option>
                        </select>
                      </td>

                      {/* Sender & Contact Phone */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="text-slate-300 font-medium text-[11px] truncate max-w-37.5">
                          {row.sender || 'وسيط معتمد'}
                        </div>
                        {row.phone ? (
                          <a
                            href={`https://wa.me/${row.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 hover:underline mt-0.5"
                          >
                            <Phone className="w-3 h-3 text-emerald-500" />
                            {row.phone}
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">فريق سييرا</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-400">
            <div>
              عرض <span className="font-bold text-white">{filteredData.length}</span> من أصل{' '}
              <span className="font-bold text-white">{data.length}</span> وحدة من الشيت الأونلاين المباشر
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span>مصدر البيانات:</span>
              <a
                href={MASTER_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C9A84C] hover:underline flex items-center gap-1"
              >
                Google Sheet (gid=341562911)
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

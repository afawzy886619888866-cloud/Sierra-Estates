'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Search,
  ExternalLink,
  Download,
  RefreshCw,
  Building,
  Phone,
  Calendar,
  MapPin,
  X,
  UserCheck,
  Image as ImageIcon,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from 'lucide-react';
import defaultOnlineUnits from '@/data/online-sheet-units.json';

export const ACCOUNT_MANAGERS = [
  'Ahmed Fawzy',
  'Farida',
  'Omar El-Sayed',
  'Sarah Mostafa',
  'Mohamed Hassan',
  'Nour El-Din',
] as const;

export interface InventoryUnitRow {
  id?: string;
  code?: string;
  lastUpdate?: string;
  availability?: string; // 'Available' | 'Under Offer' | 'Sold' | 'Rented'
  compound?: string;
  compoundCluster?: string;
  compoundClusterKey?: string;
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
  accountManager?: string | null;
  images?: string[];
  assignedAt?: string | null;
  comment?: string;
  [key: string]: any;
}

export interface AdminInventoryTableProps {
  units?: InventoryUnitRow[];
}

export const MASTER_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit?gid=1127958606#gid=1127958606';

export const CLEAN_PROCESSED_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit?gid=341562911#gid=341562911';

// Canonical compound cluster dictionary with multilingual labels and all real-estate variations
export const COMPOUND_CLUSTERS: Record<
  string,
  { labelEn: string; labelAr: string; aliases: string[] }
> = {
  mivida: {
    labelEn: 'Mivida (Emaar)',
    labelAr: 'ميفيدا (إعمار)',
    aliases: ['mivida', 'mivida boulevard', 'mivida gardens', 'mevida', 'ميفيدا'],
  },
  fifth_square: {
    labelEn: 'Fifth Square (Al Marasem)',
    labelAr: 'فيفث سكوير (المراسم)',
    aliases: ['fifth square', '5th square', 'المراسم', 'مراسم'],
  },
  villette: {
    labelEn: 'Villette (SODIC)',
    labelAr: 'فيليت (سوديك)',
    aliases: ['villette', 'v residence', 'sky condos', 'فيليت', 'سوديك'],
  },
  mountain_view: {
    labelEn: 'Mountain View',
    labelAr: 'ماونتن فيو (هايد بارك، آي سيتي)',
    aliases: ['mountain view', 'mv hp', 'mv icity', 'icity', 'ماونتن فيو'],
  },
  hyde_park: {
    labelEn: 'Hyde Park',
    labelAr: 'هايد بارك (التجمع الخامس)',
    aliases: ['hyde park', 'هايد بارك'],
  },
  uptown_cairo: {
    labelEn: 'Uptown Cairo',
    labelAr: 'أب تاون كايرو',
    aliases: ['uptown cairo', 'aurora', 'up town', 'أب تاون كايرو'],
  },
  lake_view: {
    labelEn: 'Lake View Residence',
    labelAr: 'ليك فيو ريزيدنس',
    aliases: ['lake view', 'lake view res', 'ليك فيو'],
  },
  rehab: {
    labelEn: 'Al Rehab City',
    labelAr: 'مدينة الرحاب',
    aliases: ['al rehab', 'el rehab', 'الرحاب', 'rehab'],
  },
  madinaty: {
    labelEn: 'Madinaty',
    labelAr: 'مدينتي',
    aliases: ['madinaty', 'مدينتي'],
  },
  eastown: {
    labelEn: 'Eastown (SODIC)',
    labelAr: 'إيستاون (سوديك)',
    aliases: ['eastown', 'east town', 'ايستاون'],
  },
  the_address_east: {
    labelEn: 'The Address East',
    labelAr: 'ذي أدريس إيست',
    aliases: ['the address east', 'address east', 'ذي أدريس إيست'],
  },
  galleria: {
    labelEn: 'Galleria Moon Valley',
    labelAr: 'جاليريا مون فالي',
    aliases: ['galleria', 'جاليريا'],
  },
  other: {
    labelEn: 'Other Enclaves',
    labelAr: 'كمبوندات أخرى ومناطق التجمع',
    aliases: ['stone', 'mirada', 'palm hills', 'capital gardens', 'porto', 'avenues', 'south academy', 'lotus', 'جايد'],
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

type SortField = 'code' | 'compound' | 'price' | 'rooms' | 'space' | 'lastUpdate';
type SortDirection = 'asc' | 'desc';

export default function AdminInventoryTable({ units }: AdminInventoryTableProps) {
  // Master data state initialized from merged dataset or props
  const [data, setData] = useState<InventoryUnitRow[]>(() => {
    const raw = units && units.length > 0 ? units : (defaultOnlineUnits as InventoryUnitRow[]);
    return raw.map((u, i) => {
      const comp = u.compound || (u as any).location || 'القاهرة الجديدة';
      const clusterKey = resolveClusterKey(comp);
      const clusterObj = COMPOUND_CLUSTERS[clusterKey];
      return {
        id: u.id || `UNIT-${i + 1}`,
        code: u.code || `SE-INV-${(i + 1).toString().padStart(4, '0')}`,
        lastUpdate: u.lastUpdate || 'Synced',
        availability: u.availability || (u as any).status || 'Available',
        compound: comp,
        compoundCluster: clusterObj ? clusterObj.labelEn : 'Other Enclaves',
        compoundClusterKey: clusterKey,
        price: u.price != null && !isNaN(Number(u.price)) ? Number(u.price) : 0,
        rooms: u.rooms ?? u.beds ?? null,
        bathrooms: u.bathrooms ?? (u as any).bath ?? null,
        space: u.space ?? (u as any).area ?? null,
        propertyType: u.propertyType ?? (u as any).property_type ?? 'Apartment',
        phone: u.phone || u.contactPhone || null,
        sender: u.sender || (u.advertiserType === 'Owner' ? 'المالك المباشر' : 'وسيط معتمد'),
        deal: u.deal || ((u as any).mode === 'rent' ? 'Rent' : 'Sale'),
        advertiserType: u.advertiserType || ((u as any).isDirectOwner ? 'Owner' : 'Broker'),
        accountManager:
          u.accountManager ||
          (u as any).assigned_account_manager ||
          (i % 5 === 0 ? ACCOUNT_MANAGERS[i % ACCOUNT_MANAGERS.length] : null),
        images: u.images || (u as any).photos || [],
        assignedAt: u.assignedAt || (u as any).assigned_at || null,
        comment: u.comment || '',
      };
    });
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [activeQuickTab, setActiveQuickTab] = useState<'all' | 'owners' | 'rent' | 'sale' | 'available' | 'assigned'>('all');
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [selectedDeal, setSelectedDeal] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRooms, setSelectedRooms] = useState<string>('all');
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>('all');
  const [selectedManager, setSelectedManager] = useState<string>('all');
  const [priceBracket, setPriceBracket] = useState<string>('all');
  const [myAssignedOnly, setMyAssignedOnly] = useState<boolean>(false);

  // Sorting and Pagination States
  const [sortField, setSortField] = useState<SortField>('price');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Selection & UI feedback states
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [previewUnit, setPreviewUnit] = useState<InventoryUnitRow | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Quick preset tab handler
  const handleQuickTab = (tab: 'all' | 'owners' | 'rent' | 'sale' | 'available' | 'assigned') => {
    setActiveQuickTab(tab);
    setCurrentPage(1);

    if (tab === 'all') {
      setSelectedDeal('all');
      setSelectedStatus('all');
      setSelectedAdvertiser('all');
      setMyAssignedOnly(false);
    } else if (tab === 'owners') {
      setSelectedAdvertiser('Owner');
      setSelectedDeal('all');
      setSelectedStatus('all');
      setMyAssignedOnly(false);
    } else if (tab === 'rent') {
      setSelectedDeal('Rent');
      setSelectedAdvertiser('all');
      setSelectedStatus('all');
      setMyAssignedOnly(false);
    } else if (tab === 'sale') {
      setSelectedDeal('Sale');
      setSelectedAdvertiser('all');
      setSelectedStatus('all');
      setMyAssignedOnly(false);
    } else if (tab === 'available') {
      setSelectedStatus('Available');
      setSelectedDeal('all');
      setSelectedAdvertiser('all');
      setMyAssignedOnly(false);
    } else if (tab === 'assigned') {
      setMyAssignedOnly(true);
      setSelectedAdvertiser('all');
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setActiveQuickTab('all');
    setSelectedCluster('all');
    setSelectedDeal('all');
    setSelectedStatus('all');
    setSelectedRooms('all');
    setSelectedAdvertiser('all');
    setSelectedManager('all');
    setPriceBracket('all');
    setMyAssignedOnly(false);
    setSelectedUnitIds(new Set());
    setCurrentPage(1);
    showToast('تمت إعادة ضبط جميع الفلاتر');
  };

  // Copy details to clipboard
  const handleCopySummary = (u: InventoryUnitRow) => {
    const summary = `[${u.code}] ${u.compound} - ${u.propertyType || 'عقار'} | ${u.rooms ? u.rooms + ' غرف' : ''} | ${u.deal === 'Rent' ? 'إيجار' : 'بيع'}: ${u.price ? Number(u.price).toLocaleString('en-US') + ' EGP' : 'طلب'} | هاتف: ${u.phone || 'سييرا'}`;
    navigator.clipboard.writeText(summary);
    setCopiedId(u.id || u.code || 'copied');
    setTimeout(() => setCopiedId(null), 2000);
    showToast('تم نسخ تفاصيل الوحدة إلى الحافظة');
  };

  // Open WhatsApp with prefilled Arabic inquiry
  const handleOpenWhatsApp = (u: InventoryUnitRow) => {
    if (!u.phone) {
      showToast('لا يوجد رقم هاتف مسجل لهذه الوحدة');
      return;
    }
    const cleanNum = u.phone.replace(/\D/g, '');
    const locationStr = u.compound ? `في كمبوند ${u.compound}` : 'بالتجمع الخامس';
    const dealStr = u.deal === 'Rent' ? 'للإيجار' : 'للبيع';
    const msg = `السلام عليكم ورحمة الله، مع حضرتك فريق Sierra Estates للتسويق العقاري بالتجمع الخامس. بعتذر للإزعاج، كنا حابين نستفسر لو عند حضرتك وحدة معروضة ${dealStr} ${locationStr}؟ وحابين نتأكد من التفاصيل الحالية من حضرتك مباشرة لو مناسب نتعاون في تسويقها لعملائنا. شكراً جزيلاً لحضرتك 🤝`;
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Status Change Callback
  const handleStatusChange = (unitKey: string, newStatus: string) => {
    setData((prev) =>
      prev.map((u) => {
        const k = u.id || u.code || '';
        return k === unitKey ? { ...u, availability: newStatus } : u;
      })
    );
    showToast(`تم تحديث حالة الوحدة إلى ${newStatus}`);
  };

  // Assign Account Manager Callback
  const handleAssignManager = (unitId: string, manager: string | null) => {
    setData((prev) =>
      prev.map((u) =>
        u.id === unitId || u.code === unitId
          ? { ...u, accountManager: manager, assignedAt: new Date().toISOString() }
          : u
      )
    );
    showToast(manager ? `تم إسناد الوحدة إلى ${manager}` : 'تم إلغاء إسناد الوحدة');
  };

  // Bulk Actions
  const handleBulkAssign = (manager: string) => {
    if (selectedUnitIds.size === 0) return;
    const targetManager = manager === 'unassign' ? null : manager;
    setData((prev) =>
      prev.map((u) => {
        const key = u.id || u.code || '';
        return selectedUnitIds.has(key)
          ? { ...u, accountManager: targetManager, assignedAt: new Date().toISOString() }
          : u;
      })
    );
    showToast(`تم إسناد ${selectedUnitIds.size} وحدة إلى ${targetManager || 'غير مسند'}`);
    setSelectedUnitIds(new Set());
  };

  const handleBulkStatusChange = (status: string) => {
    if (selectedUnitIds.size === 0) return;
    setData((prev) =>
      prev.map((u) => {
        const key = u.id || u.code || '';
        return selectedUnitIds.has(key) ? { ...u, availability: status } : u;
      })
    );
    showToast(`تم تحديث حالة ${selectedUnitIds.size} وحدة إلى ${status}`);
    setSelectedUnitIds(new Set());
  };

  const handleToggleSelect = (unitId: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  // Refresh from server / API
  const handleRefreshSheet = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/inventory?limit=2500', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.units && json.units.length > 0) {
          setData(
            json.units.map((u: any, i: number) => {
              const comp = u.compound || u.location || 'القاهرة الجديدة';
              const clusterKey = resolveClusterKey(comp);
              return {
                id: u.id || `UNIT-${i + 1}`,
                code: u.code || `SE-INV-${(i + 1).toString().padStart(4, '0')}`,
                lastUpdate: u.updatedAt || 'Synced',
                availability: u.status === 'available' ? 'Available' : u.status || 'Available',
                compound: comp,
                compoundCluster: COMPOUND_CLUSTERS[clusterKey]?.labelEn || 'Other Enclaves',
                compoundClusterKey: clusterKey,
                price: u.price || 0,
                rooms: u.beds || null,
                bathrooms: u.bath || null,
                space: u.area ? `${u.area} m²` : null,
                propertyType: u.propertyType || 'Apartment',
                phone: u.phone || null,
                sender: u.comment || 'Verified Contact',
                deal: u.mode === 'rent' ? 'Rent' : 'Sale',
                advertiserType: u.party || (u.isDirectOwner ? 'Owner' : 'Broker'),
                accountManager:
                  u.assigned_account_manager ||
                  (i % 5 === 0 ? ACCOUNT_MANAGERS[i % ACCOUNT_MANAGERS.length] : null),
                images: u.images || u.photos || [],
                assignedAt: u.assigned_at || null,
                comment: u.notes || '',
              };
            })
          );
          showToast(`تم تحديث المخزون بنجاح (${json.units.length} وحدة)`);
        }
      }
    } catch {
      showToast('تم الحفاظ على المخزون الحالي');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
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
          (row.comment && row.comment.toLowerCase().includes(q)) ||
          (row.accountManager && row.accountManager.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }

      // Cluster filter
      if (selectedCluster !== 'all') {
        const cluster = COMPOUND_CLUSTERS[selectedCluster];
        if (cluster) {
          const normCompound = (row.compound || '').toLowerCase();
          const matchAlias = cluster.aliases.some(
            (alias) => normCompound.includes(alias.toLowerCase()) || alias.toLowerCase().includes(normCompound)
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
        if (selectedRooms === '1') {
          if (row.rooms !== 1 && String(row.rooms) !== '1') return false;
        } else if (selectedRooms === '2') {
          if (row.rooms !== 2 && String(row.rooms) !== '2') return false;
        } else if (selectedRooms === '3') {
          if (row.rooms !== 3 && String(row.rooms) !== '3') return false;
        } else if (selectedRooms === '4+') {
          if (!row.rooms || Number(row.rooms) < 4) return false;
        }
      }

      // Price Bracket Filter
      if (priceBracket !== 'all') {
        const p = Number(row.price || 0);
        if (priceBracket === 'rent_under_50k' && (p <= 0 || p > 50000)) return false;
        if (priceBracket === 'rent_50k_100k' && (p <= 50000 || p > 100000)) return false;
        if (priceBracket === 'rent_100k_plus' && p <= 100000) return false;
        if (priceBracket === 'sale_under_10m' && (p <= 0 || p > 10000000)) return false;
        if (priceBracket === 'sale_10m_25m' && (p <= 10000000 || p > 25000000)) return false;
        if (priceBracket === 'sale_25m_50m' && (p <= 25000000 || p > 50000000)) return false;
        if (priceBracket === 'sale_50m_plus' && p <= 50000000) return false;
      }

      // Advertiser filter
      if (selectedAdvertiser !== 'all' && row.advertiserType !== selectedAdvertiser) return false;

      // Account Manager filter
      if (selectedManager !== 'all') {
        if (selectedManager === 'unassigned') {
          if (row.accountManager) return false;
        } else {
          if (row.accountManager !== selectedManager) return false;
        }
      }

      // My Assigned Only filter
      if (myAssignedOnly) {
        if (row.accountManager !== 'Ahmed Fawzy') return false;
      }

      return true;
    });
  }, [
    data,
    search,
    selectedCluster,
    selectedDeal,
    selectedStatus,
    selectedRooms,
    selectedAdvertiser,
    selectedManager,
    priceBracket,
    myAssignedOnly,
  ]);

  // Sorted dataset
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'price') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else if (sortField === 'rooms') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // Paginated slice
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectAllCurrentPage = () => {
    const pageKeys = paginatedData.map((u) => u.id || u.code || '');
    const allSelected = pageKeys.every((k) => selectedUnitIds.has(k));
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageKeys.forEach((k) => next.delete(k));
      } else {
        pageKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Code',
      'Compound',
      'Property Type',
      'Deal',
      'Price (EGP)',
      'Rooms',
      'Bathrooms',
      'Area',
      'Status',
      'Advertiser',
      'Contact Name',
      'Phone',
      'Account Manager',
      'Last Update',
    ];
    const csvRows = [
      headers.join(','),
      ...sortedData.map((r) =>
        [
          `"${r.code || ''}"`,
          `"${r.compound || ''}"`,
          `"${r.propertyType || 'Apartment'}"`,
          `"${r.deal || ''}"`,
          r.price || 0,
          `"${r.rooms ?? '—'}"`,
          `"${r.bathrooms ?? '—'}"`,
          `"${r.space ?? '—'}"`,
          `"${r.availability || ''}"`,
          `"${r.advertiserType || ''}"`,
          `"${r.sender || ''}"`,
          `"${r.phone || ''}"`,
          `"${r.accountManager || 'Unassigned'}"`,
          `"${r.lastUpdate || ''}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sierra_merged_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`تم تصدير ${sortedData.length} وحدة كملف CSV`);
  };

  // Compound counts per cluster for dropdown
  const clusterCounts = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((u) => {
      const k = u.compoundClusterKey || resolveClusterKey(u.compound);
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [data]);

  return (
    <div className="w-full bg-[#080D18] text-slate-100 rounded-2xl border border-slate-800/90 shadow-2xl p-4 sm:p-6 font-sans">
      <div className="space-y-5">
        {/* Top Header & Live Google Sheet Integration */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-[#C9A84C]/30 flex items-center justify-center text-[#E9C176]">
                <Building className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 font-arabic">
                <span>جدول المخزون الشامل الموحد</span>
                <span className="text-slate-400 font-normal text-xs sm:text-sm font-sans hidden sm:inline">
                  | Master Live Inventory
                </span>
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {data.length.toLocaleString('en-US')} وحدة مدمجة
              </span>
            </div>
            <p className="text-xs text-slate-400 font-arabic leading-relaxed">
              تصفية فائقة السرعة، متابعة الملاك المباشرين، وإدارة تعيينات مدراء الحسابات مع التواصل الفوري عبر الواتساب.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={MASTER_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 hover:text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              title="Open Google Sheet in new tab"
            >
              <span>📊 فتح الشيت أونلاين</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={handleRefreshSheet}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer disabled:opacity-50"
              title="تحديث البيانات من السيرفر"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#C9A84C] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-[#C9A84C] to-[#E9C176] hover:brightness-105 text-[#07111E] text-xs font-bold transition cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">
              الوحدات المعروضة
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1">
              {sortedData.length.toLocaleString('en-US')}{' '}
              <span className="text-xs text-slate-400 font-sans">من {data.length.toLocaleString('en-US')}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
            <div className="text-[11px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
              ملاك مباشرين (Direct)
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 font-mono mt-1">
              {data.filter((u) => u.advertiserType === 'Owner').length.toLocaleString('en-US')}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20">
            <div className="text-[11px] font-mono text-amber-300 uppercase font-bold tracking-wider">
              إيجار فاخر (Rent)
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#F5D78E] font-mono mt-1">
              {data.filter((u) => u.deal === 'Rent').length.toLocaleString('en-US')}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/20">
            <div className="text-[11px] font-mono text-sky-400 uppercase font-bold tracking-wider">
              وحدات البيع (Resale)
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-sky-300 font-mono mt-1">
              {data.filter((u) => u.deal === 'Sale').length.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        {/* Quick Filter Segmented Pills (Comfortable One-Click Toggle) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium scrollbar-none">
          <span className="text-slate-400 text-[11px] font-mono uppercase shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
            فلاتر سريعة:
          </span>

          <button
            type="button"
            onClick={() => handleQuickTab('all')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 border ${
              activeQuickTab === 'all'
                ? 'bg-[#C9A84C] text-[#07111E] border-[#C9A84C] font-bold shadow-md'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            الكل ({data.length})
          </button>

          <button
            type="button"
            onClick={() => handleQuickTab('owners')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 border flex items-center gap-1.5 ${
              activeQuickTab === 'owners'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md'
                : 'bg-slate-900 text-emerald-400 border-slate-800 hover:border-emerald-500/40'
            }`}
          >
            <span>💎 ملاك مباشرين</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickTab('rent')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 border flex items-center gap-1.5 ${
              activeQuickTab === 'rent'
                ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-md'
                : 'bg-slate-900 text-amber-300 border-slate-800 hover:border-amber-500/40'
            }`}
          >
            <span>🔑 إيجار (Rent)</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickTab('sale')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 border flex items-center gap-1.5 ${
              activeQuickTab === 'sale'
                ? 'bg-sky-400 text-slate-950 border-sky-400 font-bold shadow-md'
                : 'bg-slate-900 text-sky-300 border-slate-800 hover:border-sky-500/40'
            }`}
          >
            <span>🏡 بيع (Sale)</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickTab('available')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 border flex items-center gap-1.5 ${
              activeQuickTab === 'available'
                ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-md'
                : 'bg-slate-900 text-emerald-300 border-slate-800 hover:border-emerald-500/40'
            }`}
          >
            <span>🟢 متاح فوراً</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickTab('assigned')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 border flex items-center gap-1.5 ${
              activeQuickTab === 'assigned'
                ? 'bg-[#C9A84C] text-[#07111E] border-[#C9A84C] font-bold shadow-md'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-[#C9A84C]/40'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>وحداتي المسندة</span>
          </button>

          {(search ||
            selectedCluster !== 'all' ||
            selectedDeal !== 'all' ||
            selectedStatus !== 'all' ||
            selectedRooms !== 'all' ||
            selectedAdvertiser !== 'all' ||
            selectedManager !== 'all' ||
            priceBracket !== 'all' ||
            myAssignedOnly) && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-2.5 py-1.5 rounded-xl text-xs text-[#C9A84C] hover:text-[#F5D78E] flex items-center gap-1 cursor-pointer shrink-0 ml-auto hover:bg-[#C9A84C]/10 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>إلغاء الفلاتر</span>
            </button>
          )}
        </div>

        {/* Detailed Filter Matrix (Comfortable Layout) */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {/* Search Input with Instant Clear */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="بحث بالكمبوند، الكود، الهاتف، المالك..."
                className="w-full pl-9 pr-8 py-2 bg-slate-950/90 border border-slate-800 focus:border-[#C9A84C] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Compound Cluster Dropdown */}
            <div>
              <select
                value={selectedCluster}
                onChange={(e) => {
                  setSelectedCluster(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-2 bg-slate-950/90 border border-slate-800 focus:border-[#C9A84C] rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">🏢 جميع الكمبوندات</option>
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

            {/* Price Bracket Filter */}
            <div>
              <select
                value={priceBracket}
                onChange={(e) => {
                  setPriceBracket(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-2 bg-slate-950/90 border border-slate-800 focus:border-[#C9A84C] rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">💰 نطاق السعر (الكل)</option>
                <option value="rent_under_50k">إيجار: أقل من 50,000 ج.م</option>
                <option value="rent_50k_100k">إيجار: 50,000 - 100,000 ج.م</option>
                <option value="rent_100k_plus">إيجار: أكثر من 100,000 ج.م</option>
                <option value="sale_under_10m">بيع: أقل من 10 مليون</option>
                <option value="sale_10m_25m">بيع: 10 - 25 مليون</option>
                <option value="sale_25m_50m">بيع: 25 - 50 مليون</option>
                <option value="sale_50m_plus">بيع: أكثر من 50 مليون</option>
              </select>
            </div>

            {/* Bedrooms Dropdown */}
            <div>
              <select
                value={selectedRooms}
                onChange={(e) => {
                  setSelectedRooms(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-2 bg-slate-950/90 border border-slate-800 focus:border-[#C9A84C] rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">🛏️ عدد الغرف (الكل)</option>
                <option value="1">غرفة واحدة / استوديو</option>
                <option value="2">غرفتان (2 Beds)</option>
                <option value="3">3 غرف (3 Beds)</option>
                <option value="4+">4 غرف فأكثر (4+ Beds)</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-2 bg-slate-950/90 border border-slate-800 focus:border-[#C9A84C] rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">حالة الوحدة (الكل)</option>
                <option value="Available">🟢 Available (متاح)</option>
                <option value="Under Offer">🟡 Under Offer (تحت العرض)</option>
                <option value="Rented">🟣 Rented (مؤجر)</option>
                <option value="Sold">🔴 Sold (تم البيع)</option>
              </select>
            </div>

            {/* Account Manager Dropdown */}
            <div>
              <select
                value={selectedManager}
                onChange={(e) => {
                  setSelectedManager(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-2 bg-slate-950/90 border border-slate-800 focus:border-[#C9A84C] rounded-xl text-xs text-white outline-none cursor-pointer"
              >
                <option value="all">👥 مدير الحساب (الكل)</option>
                <option value="unassigned">⚠️ غير مسند</option>
                {ACCOUNT_MANAGERS.map((m) => (
                  <option key={m} value={m}>
                    {m} ({data.filter((u) => u.accountManager === m).length})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar (Visible when units are selected) */}
        {selectedUnitIds.size > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-linear-to-r from-emerald-950/80 via-slate-900 to-amber-950/80 border border-emerald-500/40 shadow-xl">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-bold text-white text-sm">{selectedUnitIds.size}</span>
              <span className="text-xs text-slate-200">وحدة محددة للعمليات السريعة</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-xs">إسناد إلى:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleBulkAssign(e.target.value);
                    e.target.value = '';
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none cursor-pointer"
                >
                  <option value="">اختر مدير حساب...</option>
                  {ACCOUNT_MANAGERS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="unassign">إلغاء الإسناد (Unassign)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-xs">الحالة:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleBulkStatusChange(e.target.value);
                    e.target.value = '';
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none cursor-pointer"
                >
                  <option value="">تغيير الحالة...</option>
                  <option value="Available">Available (متاح)</option>
                  <option value="Under Offer">Under Offer (تحت العرض)</option>
                  <option value="Rented">Rented (مؤجر)</option>
                  <option value="Sold">Sold (تم البيع)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUnitIds(new Set())}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        )}

        {/* Master Inventory Data Table */}
        <div className="bg-slate-950/70 rounded-xl border border-slate-800/90 overflow-hidden shadow-inner">
          <div className="overflow-x-auto max-h-160 relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              {/* Sticky Table Header with Sort Triggers */}
              <thead className="sticky top-0 z-20 bg-[#0C1322] backdrop-blur-md text-slate-300 text-[11px] uppercase font-mono tracking-wider border-b border-slate-800 shadow-sm">
                <tr>
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((u) => selectedUnitIds.has(u.id || u.code || ''))
                      }
                      onChange={handleSelectAllCurrentPage}
                      className="rounded border-slate-700 text-[#C9A84C] focus:ring-0 cursor-pointer"
                      title="تحديد كل وحدات هذه الصفحة"
                    />
                  </th>
                  <th
                    onClick={() => handleSort('code')}
                    className="py-3 px-3.5 cursor-pointer hover:text-white transition select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>الكود</span>
                      {sortField === 'code' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#C9A84C]" /> : <ArrowDown className="w-3 h-3 text-[#C9A84C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('compound')}
                    className="py-3 px-3.5 cursor-pointer hover:text-white transition select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>الكمبوند والموقع</span>
                      {sortField === 'compound' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#C9A84C]" /> : <ArrowDown className="w-3 h-3 text-[#C9A84C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3.5">النوع</th>
                  <th
                    onClick={() => handleSort('price')}
                    className="py-3 px-3.5 cursor-pointer hover:text-white transition select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>السعر (EGP)</span>
                      {sortField === 'price' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#C9A84C]" /> : <ArrowDown className="w-3 h-3 text-[#C9A84C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('rooms')}
                    className="py-3 px-3.5 cursor-pointer hover:text-white transition select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>الغرف</span>
                      {sortField === 'rooms' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#C9A84C]" /> : <ArrowDown className="w-3 h-3 text-[#C9A84C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('space')}
                    className="py-3 px-3.5 cursor-pointer hover:text-white transition select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>المساحة</span>
                      {sortField === 'space' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#C9A84C]" /> : <ArrowDown className="w-3 h-3 text-[#C9A84C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3.5">العملية والمصدر</th>
                  <th className="py-3 px-3.5">حالة الوحدة</th>
                  <th className="py-3 px-3.5">مدير الحساب</th>
                  <th className="py-3 px-4 text-center">إجراءات سريعة</th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Building className="w-9 h-9 text-slate-600" />
                        <span className="text-sm font-medium">لا توجد وحدات مطابقة للبحث والفلاتر المحددة</span>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-xs text-[#C9A84C] hover:underline cursor-pointer mt-1"
                        >
                          إعادة ضبط الفلاتر لعرض كافة الوحدات
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => {
                    const rowKey = row.id || row.code || `row-${idx}`;
                    const isSelected = selectedUnitIds.has(rowKey);
                    return (
                      <tr
                        key={rowKey}
                        className={`transition-colors duration-150 ${
                          isSelected
                            ? 'bg-[#C9A84C]/15 hover:bg-[#C9A84C]/20 border-l-2 border-[#C9A84C]'
                            : idx % 2 === 0
                            ? 'bg-slate-900/30 hover:bg-slate-800/50'
                            : 'bg-transparent hover:bg-slate-800/50'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(rowKey)}
                            className="rounded border-slate-700 text-[#C9A84C] focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Code & Last Update */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-white font-bold tracking-tight">{row.code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopySummary(row)}
                              className="text-slate-500 hover:text-[#C9A84C] transition cursor-pointer p-0.5"
                              title="نسخ كود ومواصفات الوحدة"
                            >
                              {copiedId === rowKey ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {row.lastUpdate || 'Synced'}
                          </span>
                        </td>

                        {/* Compound & Cluster */}
                        <td className="py-3.5 px-3.5">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#C9A84C] shrink-0" />
                            <span className="truncate max-w-44 text-[13px]">{row.compound}</span>
                          </div>
                          {row.compoundCluster && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 text-slate-400 border border-slate-700/60 mt-1">
                              {row.compoundCluster}
                            </span>
                          )}
                        </td>

                        {/* Property Type */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <span className="text-slate-300 font-medium text-xs">
                            {row.propertyType || 'عقار سكني'}
                          </span>
                        </td>

                        {/* Price (EGP) */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          {row.price && Number(row.price) > 0 ? (
                            <div>
                              <span className="font-bold text-[#F5D78E] font-mono text-sm tabular-nums block">
                                {Number(row.price).toLocaleString('en-US')} EGP
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {row.deal === 'Rent' ? '/ شهرياً' : 'إجمالي السعر'}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              عند الطلب
                            </span>
                          )}
                        </td>

                        {/* Rooms */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          {row.rooms != null && Number(row.rooms) > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono font-bold text-slate-200 text-xs">
                              {row.rooms} {Number(row.rooms) === 1 ? 'غرفة' : 'غرف'}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Space / Area */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          {row.space ? (
                            <span className="text-slate-300 font-mono text-xs">{row.space}</span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Deal & Advertiser */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                row.deal === 'Rent'
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                  : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                              }`}
                            >
                              {row.deal === 'Rent' ? 'إيجار' : 'بيع'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                row.advertiserType === 'Owner'
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-bold'
                                  : 'bg-slate-800 text-slate-400 border-slate-700/60'
                              }`}
                            >
                              {row.advertiserType === 'Owner' ? 'مالك' : 'وسيط'}
                            </span>
                          </div>
                        </td>

                        {/* Status Dropdown */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <select
                            value={row.availability || 'Available'}
                            onChange={(e) => handleStatusChange(rowKey, e.target.value)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-lg border outline-none cursor-pointer transition ${
                              row.availability === 'Sold'
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                : row.availability === 'Rented'
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                : row.availability === 'Under Offer'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            <option value="Available" className="bg-[#0A1628] text-white">
                              🟢 متاح (Available)
                            </option>
                            <option value="Under Offer" className="bg-[#0A1628] text-white">
                              🟡 تحت العرض (Under Offer)
                            </option>
                            <option value="Rented" className="bg-[#0A1628] text-white">
                              🟣 مؤجر (Rented)
                            </option>
                            <option value="Sold" className="bg-[#0A1628] text-white">
                              🔴 تم البيع (Sold)
                            </option>
                          </select>
                        </td>

                        {/* Account Manager Assignment */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                row.accountManager
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700'
                              }`}
                            >
                              {row.accountManager ? row.accountManager.charAt(0) : '—'}
                            </div>
                            <select
                              value={row.accountManager || 'unassigned'}
                              onChange={(e) =>
                                handleAssignManager(rowKey, e.target.value === 'unassigned' ? null : e.target.value)
                              }
                              className="bg-transparent text-[11px] font-medium text-slate-200 hover:text-white border-b border-transparent hover:border-slate-600 focus:border-[#C9A84C] outline-none cursor-pointer"
                            >
                              <option value="unassigned" className="bg-[#0A1628] text-slate-400">
                                غير مسند
                              </option>
                              {ACCOUNT_MANAGERS.map((m) => (
                                <option key={m} value={m} className="bg-[#0A1628] text-white">
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Quick Row Actions (WhatsApp, Preview, Copy) */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* WhatsApp Direct */}
                            {row.phone && (
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsApp(row)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-white transition cursor-pointer"
                                title="مراسلة سريعة عبر واتساب"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Preview Modal Trigger */}
                            <button
                              type="button"
                              onClick={() => setPreviewUnit(row)}
                              className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-[#C9A84C]/20 border border-slate-700 hover:border-[#C9A84C]/50 text-slate-300 hover:text-[#F5D78E] transition cursor-pointer"
                              title="معاينة الصور والمواصفات الكاملة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination Controls */}
          <div className="px-4 py-3.5 bg-[#0A101C] border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-400">
            {/* Range Counter */}
            <div className="flex items-center gap-2">
              <span>
                عرض{' '}
                <span className="font-bold text-white font-mono">
                  {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </span>{' '}
                إلى{' '}
                <span className="font-bold text-white font-mono">
                  {Math.min(currentPage * pageSize, sortedData.length)}
                </span>{' '}
                من إجمالي{' '}
                <span className="font-bold text-[#F5D78E] font-mono">
                  {sortedData.length.toLocaleString('en-US')}
                </span>{' '}
                وحدة
              </span>

              {/* Page Size Selector */}
              <div className="flex items-center gap-1 mr-3">
                <span className="text-[11px] text-slate-500">حجم الصفحة:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 text-white rounded-md px-2 py-0.5 text-xs outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Pagination Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
                title="الصفحة الأولى"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
                title="السابق"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <span className="px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-white">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
                title="التالي"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
                title="الصفحة الأخيرة"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Photo & Specs Preview Modal */}
      {previewUnit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1524] border border-slate-700/80 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-[#C9A84C]" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {previewUnit.compound} - {previewUnit.code}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {previewUnit.propertyType || 'عقار سكني'} · {previewUnit.deal === 'Rent' ? 'إيجار' : 'بيع'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUnit(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center relative">
                {previewUnit.images && previewUnit.images.length > 0 ? (
                  <Image
                    src={previewUnit.images[0]}
                    alt={previewUnit.compound || 'صورة الوحدة'}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="text-center p-6 text-slate-500">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs">لم يتم رفع صور لهذه الوحدة بعد</p>
                    <span className="text-[10px] text-[#C9A84C] mt-1 block">
                      يمكن لمدير الحساب طلب الصور من المالك عبر الواتساب
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">السعر</span>
                  <span className="font-bold text-[#F5D78E] font-mono text-sm">
                    {Number(previewUnit.price || 0).toLocaleString('en-US')} EGP
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">مدير الحساب</span>
                  <span className="font-bold text-emerald-300 text-xs">
                    {previewUnit.accountManager || 'غير مسند'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">المواصفات</span>
                  <span className="text-white text-xs">
                    {previewUnit.rooms || '—'} غرف · {previewUnit.bathrooms || '—'} حمام · {previewUnit.space || '—'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">معلومات التواصل</span>
                  {previewUnit.phone ? (
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(previewUnit)}
                      className="text-emerald-400 hover:underline flex items-center gap-1 font-mono text-xs mt-0.5 cursor-pointer"
                    >
                      <Phone className="w-3 h-3 text-emerald-500" />
                      {previewUnit.phone}
                    </button>
                  ) : (
                    <span className="text-slate-500 text-xs">فريق سييرا</span>
                  )}
                </div>
              </div>

              {previewUnit.comment && (
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
                  <span className="text-[10px] text-slate-500 block mb-1">ملاحظات الوحدة:</span>
                  {previewUnit.comment}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handleCopySummary(previewUnit)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ التفاصيل</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewUnit(null)}
                className="px-4 py-1.5 rounded-lg bg-[#C9A84C] hover:brightness-110 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 text-xs shadow-2xl font-mono flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

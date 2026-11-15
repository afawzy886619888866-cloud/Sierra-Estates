'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table2,
  Search,
  RefreshCw,
  ExternalLink,
  Download,
  Phone,
  Sparkles,
  Briefcase,
  FileText,
  Plus,
  X,
} from 'lucide-react';
import type { RequestSheetRow } from '@/lib/services/RequestSheetSyncService';
import type { CareerSheetRow } from '@/lib/services/CareerSheetSyncService';

interface RequestsStats {
  total: number;
  buyerDemands: number;
  viewingRequests: number;
  campaigns: number;
  newCount: number;
  contactedCount: number;
  scheduledCount: number;
}

interface CareersStats {
  total: number;
  salesCount: number;
  adminCount: number;
  withVehicle: number;
  withCv: number;
  newCount: number;
  reviewedCount: number;
  hiredCount: number;
}

export default function RequestsSpreadsheetView({ lang = 'ar' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'requests' | 'careers'>('requests');

  // Requests state
  const [reqRows, setReqRows] = useState<RequestSheetRow[]>([]);
  const [reqStats, setReqStats] = useState<RequestsStats | null>(null);

  // Careers state
  const [careerRows, setCareerRows] = useState<CareerSheetRow[]>([]);
  const [careerStats, setCareerStats] = useState<CareersStats | null>(null);

  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus] = useState<string>('all');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Add Request / Add Candidate Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newReq, setNewReq] = useState({
    type: 'buyer_demand' as 'buyer_demand' | 'viewing_request',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    mode: 'sale' as 'sale' | 'rent',
    preferredZone: 'New Cairo',
    unitType: 'Apartment',
    bedrooms: '3',
    budget: '',
    notes: '',
  });
  const [newCareer, setNewCareer] = useState({
    role: 'sales' as 'sales' | 'admin',
    fullName: '',
    phone: '',
    email: '',
    position: 'Senior Real Estate Sales Consultant',
    experience: '2',
    hasVehicle: true,
    expectedSalary: '',
    cvUrl: '',
    notes: '',
  });

  const fetchSpreadsheetData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/requests/sheet?tab=${activeTab}`);
      const data = await res.json();
      if (data.ok) {
        if (activeTab === 'careers') {
          setCareerRows(data.rows || []);
          setCareerStats(data.stats || null);
        } else {
          setReqRows(data.rows || []);
          setReqStats(data.stats || null);
        }
        if (data.sheetUrl) setSheetUrl(data.sheetUrl);
      }
    } catch (err: any) {
      console.error('Failed to load spreadsheet data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchSpreadsheetData();
    const interval = setInterval(fetchSpreadsheetData, 30000);
    return () => clearInterval(interval);
  }, [fetchSpreadsheetData]);

  const handleSyncToGoogle = async () => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/requests/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_sheet', tab: activeTab }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatusMsg({
          type: 'ok',
          text: isAr
            ? `✓ تمت مزامنة ${data.synced || 0} صف مع جوجل شيت بنجاح!`
            : `✓ Successfully synced ${data.synced || 0} rows to Google Sheet!`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: isAr ? `✕ خطأ أثناء المزامنة: ${err.message}` : `✕ Sync error: ${err.message}`,
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const handleStatusChange = async (id: string, status: string, tab: 'requests' | 'careers') => {
    try {
      const res = await fetch('/api/admin/requests/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', tab, id, status }),
      });
      const data = await res.json();
      if (data.ok) {
        if (tab === 'careers') {
          setCareerRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: status as CareerSheetRow['status'] } : r)));
        } else {
          setReqRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: status as RequestSheetRow['status'] } : r)));
        }
        setStatusMsg({
          type: 'ok',
          text: isAr ? `✓ تم تحديث الحالة إلى ${status}` : `✓ Updated status to ${status}`,
        });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err.message || 'Status update failed' });
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNew(true);
    setStatusMsg(null);
    try {
      const payload =
        activeTab === 'requests'
          ? {
              action: 'add',
              requestData: {
                type: newReq.type,
                clientName: newReq.clientName.trim(),
                clientPhone: newReq.clientPhone.trim(),
                clientEmail: newReq.clientEmail.trim(),
                mode: newReq.mode,
                preferredZone: newReq.preferredZone.trim() || 'New Cairo',
                unitType: newReq.unitType,
                bedrooms: Number(newReq.bedrooms || 0),
                budget: newReq.budget.trim() || 'Open',
                notes: newReq.notes.trim(),
                source: 'admin_online_sheet',
              },
            }
          : {
              action: 'add_career',
              careerData: {
                role: newCareer.role,
                fullName: newCareer.fullName.trim(),
                phone: newCareer.phone.trim(),
                email: newCareer.email.trim(),
                position: newCareer.position.trim(),
                experience: newCareer.experience.trim() || '1',
                hasVehicle: newCareer.hasVehicle,
                expectedSalary: newCareer.expectedSalary.trim(),
                cvUrl: newCareer.cvUrl.trim(),
                notes: newCareer.notes.trim(),
                source: 'admin_online_sheet',
              },
            };

      const res = await fetch('/api/admin/requests/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to save entry');

      setShowAddModal(false);
      await fetchSpreadsheetData();
      setStatusMsg({
        type: 'ok',
        text: isAr
          ? '✓ تم إضافة السجل ومزامنته مع الشيت أونلاين فوراً!'
          : '✓ Entry added and synchronized to the Online Sheet!',
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: isAr ? `✕ تعذر الحفظ: ${err.message}` : `✕ Save failed: ${err.message}`,
      });
    } finally {
      setSavingNew(false);
    }
  };

  // Filtered Requests
  const filteredReqRows = useMemo(() => {
    return reqRows.filter((row) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        row.clientName?.toLowerCase().includes(term) ||
        row.clientPhone?.includes(term) ||
        row.preferredZone?.toLowerCase().includes(term) ||
        row.id?.toLowerCase().includes(term) ||
        row.voucherCode?.toLowerCase().includes(term) ||
        row.notes?.toLowerCase().includes(term);

      const matchType = filterType === 'all' || row.type === filterType;
      const matchStatus = filterStatus === 'all' || row.status === filterStatus;

      return matchSearch && matchType && matchStatus;
    });
  }, [reqRows, searchTerm, filterType, filterStatus]);

  // Filtered Careers
  const filteredCareerRows = useMemo(() => {
    return careerRows.filter((row) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        row.fullName?.toLowerCase().includes(term) ||
        row.phone?.includes(term) ||
        row.position?.toLowerCase().includes(term) ||
        row.email?.toLowerCase().includes(term) ||
        row.id?.toLowerCase().includes(term) ||
        row.notes?.toLowerCase().includes(term);

      const matchType = filterType === 'all' || row.role === filterType;
      const matchStatus = filterStatus === 'all' || row.status === filterStatus;

      return matchSearch && matchType && matchStatus;
    });
  }, [careerRows, searchTerm, filterType, filterStatus]);

  const exportCsv = () => {
    if (activeTab === 'requests') {
      const headers = [
        'ID',
        'Date',
        'Type',
        'Client Name',
        'Phone',
        'Email',
        'Mode',
        'Preferred Zone',
        'Unit Type',
        'Bedrooms',
        'Budget',
        'Campaign/Voucher',
        'Target Date',
        'Status',
        'Notes',
      ];
      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [
          headers.join(','),
          ...filteredReqRows.map((r) =>
            [
              `"${r.id}"`,
              `"${r.createdAt}"`,
              `"${r.type}"`,
              `"${r.clientName}"`,
              `"'${r.clientPhone}"`,
              `"${r.clientEmail || ''}"`,
              `"${r.mode}"`,
              `"${r.preferredZone}"`,
              `"${r.unitType}"`,
              `"${r.bedrooms || ''}"`,
              `"${r.budget || ''}"`,
              `"${r.voucherCode || r.campaign || ''}"`,
              `"${r.targetDate || ''}"`,
              `"${r.status}"`,
              `"${(r.notes || '').replace(/"/g, '""')}"`,
            ].join(',')
          ),
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Sierra_Requests_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'ID',
        'Date',
        'Role',
        'Full Name',
        'Phone',
        'Email',
        'Position',
        'Experience (Years)',
        'Has Vehicle',
        'Expected Salary',
        'CV URL',
        'Status',
        'Notes',
      ];
      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [
          headers.join(','),
          ...filteredCareerRows.map((r) =>
            [
              `"${r.id}"`,
              `"${r.createdAt}"`,
              `"${r.role}"`,
              `"${r.fullName}"`,
              `"'${r.phone}"`,
              `"${r.email}"`,
              `"${r.position}"`,
              `"${r.experience}"`,
              `"${r.hasVehicle ? 'Yes' : 'No'}"`,
              `"${r.expectedSalary || ''}"`,
              `"${r.cvUrl || ''}"`,
              `"${r.status}"`,
              `"${(r.notes || '').replace(/"/g, '""')}"`,
            ].join(',')
          ),
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Sierra_Careers_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      style={{
        padding: '24px 28px',
        color: '#0f172a',
        fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', system-ui, sans-serif)",
      }}
    >
      {/* ── Top Header & Tab Controls ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              <Table2 style={{ width: 20, height: 20 }} />
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#0f172a' }}>
              {isAr ? 'شيت البيانات أونلاين والمزامنة الحية' : 'Live Online Spreadsheet & Sync'}
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            {isAr
              ? 'مزامنة ثنائية الاتجاه مع جوجل شيت وقاعدة بيانات سوبابيس لكافة طلبات العقارات والوظائف'
              : 'Real-time multi-sync across Google Sheets, Supabase & Webhooks for Requests & Careers'}
          </p>
        </div>

        {/* Tab Switcher & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 4,
              borderRadius: 12,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('requests');
                setFilterType('all');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'requests' ? '#0ea5e9' : 'transparent',
                color: activeTab === 'requests' ? '#ffffff' : '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              <Sparkles style={{ width: 14, height: 14 }} />
              <span>{isAr ? 'طلبات العقارات والمعاينات' : 'Property Requests'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('careers');
                setFilterType('all');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'careers' ? '#6366f1' : 'transparent',
                color: activeTab === 'careers' ? '#ffffff' : '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              <Briefcase style={{ width: 14, height: 14 }} />
              <span>{isAr ? 'طلبات التوظيف والمتقدمين' : 'Career Applications'}</span>
            </button>
          </div>

          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                background: '#047857',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <ExternalLink style={{ width: 14, height: 14 }} />
              <span>{isAr ? 'فتح جوجل شيت' : 'Open Google Sheet'}</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleSyncToGoogle}
            disabled={syncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              background: syncing ? '#94a3b8' : '#0284c7',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: syncing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw style={{ width: 14, height: 14, animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{syncing ? (isAr ? 'جاري المزامنة…' : 'Syncing…') : isAr ? 'مزامنة مع الشيت' : 'Sync to Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              background: activeTab === 'careers' ? '#4f46e5' : '#0ea5e9',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(14, 165, 233, 0.22)',
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            <span>
              {activeTab === 'careers'
                ? isAr
                  ? '+ إضافة متقدم'
                  : '+ Add Applicant'
                : isAr
                ? '+ إضافة طلب'
                : '+ Add Request'}
            </span>
          </button>

          <button
            type="button"
            onClick={exportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Download style={{ width: 14, height: 14 }} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusMsg && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            background: statusMsg.type === 'ok' ? '#ecfdf5' : '#fef2f2',
            color: statusMsg.type === 'ok' ? '#065f46' : '#991b1b',
            border: `1px solid ${statusMsg.type === 'ok' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {statusMsg.text}
        </div>
      )}

      {/* ── KPI Summary Cards ── */}
      {activeTab === 'requests' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{isAr ? 'إجمالي الطلبات' : 'Total Requests'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>{reqStats?.total || 0}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7' }}>{isAr ? 'طلبات شراء/إيجار' : 'Buyer Demands'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0284c7', marginTop: 4 }}>{reqStats?.buyerDemands || 0}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>{isAr ? 'طلبات معاينة' : 'Viewing Requests'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#d97706', marginTop: 4 }}>{reqStats?.viewingRequests || 0}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>{isAr ? 'طلبات بعروض خصم' : 'Campaign Promos'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', marginTop: 4 }}>{reqStats?.campaigns || 0}</div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{isAr ? 'إجمالي المتقدمين' : 'Total Applicants'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>{careerStats?.total || 0}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>{isAr ? 'مستشاري مبيعات' : 'Sales Advisors'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#6366f1', marginTop: 4 }}>{careerStats?.salesCount || 0}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7' }}>{isAr ? 'إدارة وعمليات' : 'Admin & Ops'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0284c7', marginTop: 4 }}>{careerStats?.adminCount || 0}</div>
          </div>
          <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>{isAr ? 'يمتلك سيارة خاصة' : 'With Vehicle'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', marginTop: 4 }}>{careerStats?.withVehicle || 0}</div>
          </div>
        </div>
      )}

      {/* ── Filters & Search ── */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 16,
          background: '#ffffff',
          padding: 12,
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              left: isAr ? 'auto' : 10,
              right: isAr ? 10 : 'auto',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'requests'
                ? isAr
                  ? 'بحث بالاسم، الموبايل، الكومباوند، كود الخصم…'
                  : 'Search by client, phone, compound, voucher…'
                : isAr
                ? 'بحث بالاسم، الموبايل، الوظيفة، الخبرة…'
                : 'Search by candidate, phone, position…'
            }
            style={{
              width: '100%',
              padding: isAr ? '8px 34px 8px 12px' : '8px 12px 8px 34px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        {activeTab === 'requests' ? (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
          >
            <option value="all">{isAr ? 'كافة أنواع الطلبات' : 'All Request Types'}</option>
            <option value="buyer_demand">{isAr ? 'طلب شراء / إيجار' : 'Buyer Demand'}</option>
            <option value="viewing_request">{isAr ? 'طلب معاينة ميدانية' : 'Viewing Request'}</option>
          </select>
        ) : (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
          >
            <option value="all">{isAr ? 'كافة التخصصات' : 'All Roles'}</option>
            <option value="sales">{isAr ? 'المبيعات والاستشارات' : 'Sales & Advisory'}</option>
            <option value="admin">{isAr ? 'الإدارة والعمليات' : 'Admin & Operations'}</option>
          </select>
        )}

        <button
          type="button"
          onClick={fetchSpreadsheetData}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <RefreshCw style={{ width: 13, height: 13 }} />
          <span>{isAr ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── Data Spreadsheet Table ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ overflowX: 'auto', maxHeight: '65vh' }}>
          {activeTab === 'requests' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isAr ? 'right' : 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'كود الطلب' : 'ID'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'العميل والموبايل' : 'Client & Phone'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'النوع والهدف' : 'Type & Mode'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'المنطقة / الكومباوند' : 'Zone / Compound'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'الوحدة والميزانية' : 'Unit & Budget'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'العرض والكود' : 'Voucher / Promo'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'الحالة' : 'Status'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {loading && reqRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                      {isAr ? 'جاري تحميل شيت طلبات العملاء…' : 'Loading Requests Spreadsheet…'}
                    </td>
                  </tr>
                ) : filteredReqRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                      {isAr ? 'لا توجد طلبات مطابقة لخيارات البحث.' : 'No matching requests found.'}
                    </td>
                  </tr>
                ) : (
                  filteredReqRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                        {row.id}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#64748b', fontSize: 11.5 }}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.clientName}</div>
                        <div style={{ color: '#059669', fontSize: 12, fontFamily: 'monospace' }}>{row.clientPhone}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: row.type === 'viewing_request' ? '#fef3c7' : '#e0f2fe',
                            color: row.type === 'viewing_request' ? '#92400e' : '#0369a1',
                          }}
                        >
                          {row.type === 'viewing_request'
                            ? isAr
                              ? 'معاينة'
                              : 'Viewing'
                            : row.mode === 'rent'
                            ? isAr
                              ? 'طلب إيجار'
                              : 'Rent Demand'
                            : isAr
                            ? 'طلب شراء'
                            : 'Sale Demand'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>{row.preferredZone || 'New Cairo'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{row.unitType}</div>
                        <div style={{ color: '#64748b', fontSize: 11.5 }}>{row.budget}</div>
                        {row.matchedUnits && row.matchedUnits.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            {row.matchedUnits.slice(0, 3).map((code) => (
                              <span
                                key={code}
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                  border: '1px solid #fde68a',
                                }}
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {row.voucherCode ? (
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: 6,
                              background: '#fef9c3',
                              color: '#854d0e',
                              fontSize: 11,
                              fontWeight: 800,
                              fontFamily: 'monospace',
                            }}
                          >
                            {row.voucherCode}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <select
                          value={row.status}
                          onChange={(e) => handleStatusChange(row.id, e.target.value, 'requests')}
                          style={{
                            padding: '3px 6px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: row.status === 'new' ? '#dbeafe' : '#f1f5f9',
                            color: row.status === 'new' ? '#1e40af' : '#475569',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          <option value="new">new</option>
                          <option value="contacted">contacted</option>
                          <option value="viewing_scheduled">viewing_scheduled</option>
                          <option value="closed">closed</option>
                        </select>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <a
                          href={`https://wa.me/${row.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            isAr
                              ? `مرحباً أستاذ ${row.clientName}، بخصوص طلبك العقاري كود (${row.id}) في سييرا إيستيتس.`
                              : `Hello ${row.clientName}, regarding your property request (${row.id}) with Sierra Estates.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: '#ecfdf5',
                            color: '#047857',
                            fontSize: 11,
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Phone style={{ width: 12, height: 12 }} />
                          <span>WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isAr ? 'right' : 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'كود المتقدم' : 'ID'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'المرشح والموبايل' : 'Candidate & Phone'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'الوظيفة والمسار' : 'Position & Track'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'سنوات الخبرة' : 'Experience'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'سيارة خاصة' : 'Vehicle'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'الراتب المتوقع' : 'Expected Salary'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'السيرة الذاتية' : 'CV / Profile'}</th>
                  <th style={{ padding: '12px 14px' }}>{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {loading && careerRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                      {isAr ? 'جاري تحميل شيت طلبات التوظيف…' : 'Loading Career Applications Spreadsheet…'}
                    </td>
                  </tr>
                ) : filteredCareerRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                      {isAr ? 'لا يوجد متقدمين مطابقين للبحث.' : 'No matching applications found.'}
                    </td>
                  </tr>
                ) : (
                  filteredCareerRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>
                        {row.id}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#64748b', fontSize: 11.5 }}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.fullName}</div>
                        <div style={{ color: '#059669', fontSize: 12, fontFamily: 'monospace' }}>{row.phone}</div>
                        {row.email && <div style={{ color: '#64748b', fontSize: 11 }}>{row.email}</div>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#334155' }}>{row.position}</div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: row.role === 'admin' ? '#f1f5f9' : '#e0e7ff',
                            color: row.role === 'admin' ? '#475569' : '#4338ca',
                            marginTop: 2,
                          }}
                        >
                          {row.role === 'admin' ? (isAr ? 'إدارة وعمليات' : 'Admin & Ops') : isAr ? 'مبيعات' : 'Sales'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {row.experience} {isAr ? 'سنوات' : 'years'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: row.hasVehicle ? '#ecfdf5' : '#f8fafc',
                            color: row.hasVehicle ? '#047857' : '#94a3b8',
                          }}
                        >
                          {row.hasVehicle ? (isAr ? 'متوفرة ✓' : 'Yes ✓') : isAr ? 'لا يوجد' : 'No'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>
                        {row.expectedSalary || 'Negotiable'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {row.cvUrl ? (
                          <a
                            href={row.cvUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#0284c7',
                              fontSize: 11.5,
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            <FileText style={{ width: 13, height: 13 }} />
                            <span>{isAr ? 'عرض CV' : 'Open CV'}</span>
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <a
                          href={`https://wa.me/${row.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            isAr
                              ? `مرحباً ${row.fullName}، يسعدنا التواصل معك من إدارة الموارد البشرية في سييرا إيستيتس بخصوص تقديمك لوظيفة (${row.position}).`
                              : `Hello ${row.fullName}, contacting you from Sierra Estates HR regarding your application for (${row.position}).`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: '#ecfdf5',
                            color: '#047857',
                            fontSize: 11,
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Phone style={{ width: 12, height: 12 }} />
                          <span>WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Inline Add Request / Add Candidate Modal ── */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#ffffff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
              direction: isAr ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                {activeTab === 'careers'
                  ? isAr
                    ? 'إضافة مرشح / موظف جديد للشيت أونلاين'
                    : 'Add Candidate to Careers Online Sheet'
                  : isAr
                  ? 'إضافة طلب عقاري جديد للشيت أونلاين'
                  : 'Add Client Request to Online Sheet'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeTab === 'requests' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      required
                      placeholder={isAr ? 'اسم العميل' : 'Client Name'}
                      value={newReq.clientName}
                      onChange={(e) => setNewReq((p) => ({ ...p, clientName: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                    <input
                      required
                      placeholder={isAr ? 'رقم الموبايل (01xxxxxxxxx)' : 'Phone (01xxxxxxxxx)'}
                      value={newReq.clientPhone}
                      onChange={(e) => setNewReq((p) => ({ ...p, clientPhone: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <select
                      value={newReq.type}
                      onChange={(e) => setNewReq((p) => ({ ...p, type: e.target.value as 'buyer_demand' | 'viewing_request' }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="buyer_demand">{isAr ? 'طلب شراء / إيجار' : 'Buyer Demand'}</option>
                      <option value="viewing_request">{isAr ? 'طلب معاينة' : 'Viewing Request'}</option>
                    </select>
                    <select
                      value={newReq.mode}
                      onChange={(e) => setNewReq((p) => ({ ...p, mode: e.target.value as 'sale' | 'rent' }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="sale">{isAr ? 'شراء (Sale)' : 'Sale'}</option>
                      <option value="rent">{isAr ? 'إيجار (Rent)' : 'Rent'}</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      placeholder={isAr ? 'الكومباوند / المنطقة المفضلة' : 'Preferred Zone / Compound'}
                      value={newReq.preferredZone}
                      onChange={(e) => setNewReq((p) => ({ ...p, preferredZone: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                    <input
                      placeholder={isAr ? 'الميزانية (مثال: 14M)' : 'Budget (e.g. 14M)'}
                      value={newReq.budget}
                      onChange={(e) => setNewReq((p) => ({ ...p, budget: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder={isAr ? 'ملاحظات إضافية...' : 'Additional notes...'}
                    value={newReq.notes}
                    onChange={(e) => setNewReq((p) => ({ ...p, notes: e.target.value }))}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      required
                      placeholder={isAr ? 'الاسم بالكامل' : 'Full Name'}
                      value={newCareer.fullName}
                      onChange={(e) => setNewCareer((p) => ({ ...p, fullName: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                    <input
                      required
                      placeholder={isAr ? 'رقم الموبايل (01xxxxxxxxx)' : 'Phone (01xxxxxxxxx)'}
                      value={newCareer.phone}
                      onChange={(e) => setNewCareer((p) => ({ ...p, phone: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <select
                      value={newCareer.role}
                      onChange={(e) => setNewCareer((p) => ({ ...p, role: e.target.value as 'sales' | 'admin' }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="sales">{isAr ? 'مبيعات (Sales)' : 'Sales & Advisory'}</option>
                      <option value="admin">{isAr ? 'إدارة (Admin / Ops)' : 'Admin & Operations'}</option>
                    </select>
                    <input
                      placeholder={isAr ? 'المسمى الوظيفي' : 'Position Title'}
                      value={newCareer.position}
                      onChange={(e) => setNewCareer((p) => ({ ...p, position: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      placeholder={isAr ? 'سنوات الخبرة' : 'Experience Years'}
                      value={newCareer.experience}
                      onChange={(e) => setNewCareer((p) => ({ ...p, experience: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                    <input
                      placeholder={isAr ? 'الراتب المتوقع' : 'Expected Salary'}
                      value={newCareer.expectedSalary}
                      onChange={(e) => setNewCareer((p) => ({ ...p, expectedSalary: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder={isAr ? 'ملاحظات أو رابط CV...' : 'Notes or CV summary...'}
                    value={newCareer.notes}
                    onChange={(e) => setNewCareer((p) => ({ ...p, notes: e.target.value }))}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: savingNew ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingNew ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isAr ? 'حفظ ومزامنة مع الشيت' : 'Save & Sync to Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

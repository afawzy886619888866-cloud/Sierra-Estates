import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, query, where, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
import { SearchLog } from '../types';
import { motion } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  Brush
} from 'recharts';

interface SearchInsightsPageProps {
  T: (key: string) => string;
  isAr?: boolean;
}

export default function SearchInsightsPage({ T, isAr = false }: SearchInsightsPageProps) {
  const [searches, setSearches] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // DB Query Constraints
  const [dbUserId, setDbUserId] = useState<string>('');
  const [dbDateStart, setDbDateStart] = useState<string>('');
  const [dbDateEnd, setDbDateEnd] = useState<string>('');
  
  // Local UI filters
  const [scopeFilter, setScopeFilter] = useState<'all' | 'leads' | 'listings' | 'agents' | 'workflows'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'voice' | 'typed'>('all');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | 'all'>('7d');
  const [brushIndices, setBrushIndices] = useState<{ start: number; end: number } | null>(null);

  // Heatmap interactive state
  const [hoveredHeatmapCell, setHoveredHeatmapCell] = useState<{
    dayIndex: number;
    hour: number;
    count: number;
    queries: string[];
  } | null>(null);

  // Translate-safe and RTL-safe day & hour values
  const daysOfWeekEN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daysOfWeekAR = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
  const daysOfWeekAbbrevEN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const daysOfWeekAbbrevAR = ['إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت', 'أحد'];

  const daysLabels = isAr ? daysOfWeekAbbrevAR : daysOfWeekAbbrevEN;
  const daysFullLabels = isAr ? daysOfWeekAR : daysOfWeekEN;

  const formatHourLabel = (hour: number) => {
    if (isAr) {
      if (hour === 0) return '12 ص';
      if (hour === 12) return '12 م';
      return hour > 12 ? `${hour - 12} م` : `${hour} ص`;
    } else {
      if (hour === 0) return '12 AM';
      if (hour === 12) return '12 PM';
      return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
    }
  };

  // Real-time listener for the searches collection
  useEffect(() => {
    setLoading(true);
    const searchesCol = collection(db, 'searches');

    const constraints: QueryConstraint[] = [];
    if (dbUserId.trim()) {
      constraints.push(where('userId', '==', dbUserId.trim()));
    }
    if (dbDateStart) {
      constraints.push(where('timestamp', '>=', new Date(dbDateStart)));
    }
    if (dbDateEnd) {
      // Set boundary to end of chosen day
      const ed = new Date(dbDateEnd);
      ed.setHours(23, 59, 59, 999);
      constraints.push(where('timestamp', '<=', ed));
    }

    const finalQuery = constraints.length > 0 ? query(searchesCol, ...constraints) : searchesCol;

    const unsub = onSnapshot(finalQuery, (snapshot) => {
      const logs: SearchLog[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        logs.push({
          id: doc.id,
          query: d.query || '',
          scope: d.scope || 'all',
          timestamp: d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp || Date.now()),
          userId: d.userId || 'anonymous',
          isVoice: !!d.isVoice,
        });
      });
      
      // Sort logs by newest first
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setSearches(logs);
      setLoading(false);
    }, (err) => {
      console.error("Searches loading failed:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [dbUserId, dbDateStart, dbDateEnd]);

  // Quick Seed helper to give users a rich interactive experience right out of the box
  const seedMockSearches = async () => {
    setLoading(true);
    const mockSearches = [
      { query: 'Cairo Festival City', scope: 'listings', isVoice: true, offsetMin: 5 },
      { query: 'Apartment with pool', scope: 'listings', isVoice: false, offsetMin: 12 },
      { query: 'New Giza Mansion', scope: 'listings', isVoice: true, offsetMin: 22 },
      { query: 'Mohamed Salah', scope: 'agents', isVoice: false, offsetMin: 35 },
      { query: 'Send WhatsApp contract', scope: 'workflows', isVoice: true, offsetMin: 48 },
      { query: 'Hot buyers', scope: 'leads', isVoice: false, offsetMin: 65 },
      { query: 'AI lead qualification', scope: 'workflows', isVoice: true, offsetMin: 80 },
      { query: 'Villas in Marassi', scope: 'listings', isVoice: false, offsetMin: 95 },
      { query: 'Viewing scheduled', scope: 'leads', isVoice: false, offsetMin: 120 },
      { query: 'Zayed Regency 3-bed', scope: 'listings', isVoice: true, offsetMin: 140 },
      { query: 'Nader Omar', scope: 'agents', isVoice: false, offsetMin: 180 },
      { query: 'Auto matching system', scope: 'workflows', isVoice: false, offsetMin: 220 },
      { query: 'Abdelrahman Fawzy', scope: 'agents', isVoice: true, offsetMin: 260 },
      { query: 'Contract draft approved', scope: 'leads', isVoice: false, offsetMin: 300 },
      { query: 'Villas in Marassi', scope: 'listings', isVoice: true, offsetMin: 350 },
      { query: 'Cairo Festival City', scope: 'listings', isVoice: false, offsetMin: 400 },
      { query: 'Zayed Regency 3-bed', scope: 'listings', isVoice: false, offsetMin: 450 },
      { query: 'Mohamed Salah', scope: 'agents', isVoice: true, offsetMin: 500 },
      { query: 'Cairo Festival City', scope: 'listings', isVoice: true, offsetMin: 550 },
      { query: 'Hot buyers', scope: 'leads', isVoice: true, offsetMin: 600 },
    ];

    const extraMockSearches: { query: string; scope: string; isVoice: boolean; offsetMin: number }[] = [];
    const queriesByScope = [
      { query: 'Apartment in Zayed', scope: 'listings', isVoice: false },
      { query: 'Townhouse Marassi', scope: 'listings', isVoice: true },
      { query: 'Tagamoa Commercial', scope: 'listings', isVoice: false },
      { query: 'Verify client KYC', scope: 'workflows', isVoice: false },
      { query: 'Send brochure to lead', scope: 'workflows', isVoice: true },
      { query: 'Nader Omar chatbot', scope: 'agents', isVoice: false },
      { query: 'Fady Agent online', scope: 'agents', isVoice: true },
      { query: 'New Cash Buyer lead', scope: 'leads', isVoice: false },
      { query: 'Viewing scheduled Villa', scope: 'leads', isVoice: false }
    ];

    // Distribute they evenly over the previous days of the week to populate the heatmap with multiple coordinates
    for (let day = 1; day <= 6; day++) {
      // morning peak (~10:00 AM)
      const morningOffset = day * 24 * 60 + (14 * 60) + Math.floor(Math.random() * 60) - 30;
      // afternoon peak (~3:00 PM)
      const afternoonOffset = day * 24 * 60 + (9 * 60) + Math.floor(Math.random() * 60) - 30;
      // evening peak (~9:00 PM)
      const eveningOffset = day * 24 * 60 + (3 * 60) + Math.floor(Math.random() * 60) - 30;

      const q1 = queriesByScope[Math.floor(Math.random() * queriesByScope.length)];
      extraMockSearches.push({ ...q1, offsetMin: morningOffset });

      const q2 = queriesByScope[Math.floor(Math.random() * queriesByScope.length)];
      extraMockSearches.push({ ...q2, offsetMin: afternoonOffset });

      const q3 = queriesByScope[Math.floor(Math.random() * queriesByScope.length)];
      extraMockSearches.push({ ...q3, offsetMin: eveningOffset });
    }

    try {
      // Write the standard mock searches
      for (const s of mockSearches) {
        await addDoc(collection(db, 'searches'), {
          query: s.query,
          scope: s.scope,
          isVoice: s.isVoice,
          timestamp: new Date(Date.now() - s.offsetMin * 60000),
          userId: 'seed-runner'
        });
      }
      // Write the extra distributed heatmap mock searches
      for (const s of extraMockSearches) {
        await addDoc(collection(db, 'searches'), {
          query: s.query,
          scope: s.scope,
          isVoice: s.isVoice,
          timestamp: new Date(Date.now() - s.offsetMin * 60000),
          userId: 'seed-runner'
        });
      }
    } catch (e) {
      console.error('Failed to seed searches:', e);
    }
    setLoading(false);
  };

  // Extract and download search telemetry logs as a JSON file
  const downloadTelemetryLogs = () => {
    try {
      const exportData = searches.map(item => ({
        timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : new Date(item.timestamp).toISOString(),
        query: item.query,
        scope: item.scope,
        isVoice: item.isVoice
      }));
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `crm_search_telemetry_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download telemetry logs:", err);
    }
  };

  // Export search telemetry logs as a CSV file
  const downloadCsvLogs = () => {
    try {
      const headers = ['Timestamp', 'Query', 'Scope', 'Input Method'];
      const rows = searches.map(item => {
        const timestamp = item.timestamp instanceof Date ? item.timestamp.toISOString() : new Date(item.timestamp).toISOString();
        const query = `"${item.query.replace(/"/g, '""')}"`; // escape quotes
        const scope = item.scope;
        const method = item.isVoice ? 'Voice' : 'Typed';
        return [timestamp, query, scope, method].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `crm_search_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download CSV logs:", err);
    }
  };

  const downloadPDFReport = async () => {
    try {
      setGeneratingPdf(true);
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin; // 190mm
      let currentY = 15;

      // 1. Draw PDF Header Title Banner
      pdf.setFillColor(12, 19, 40); // Darker base (#0c1328)
      pdf.rect(margin, currentY, contentWidth, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(isAr ? 'تقرير تحليلات محرك بحث CRM' : 'SIERRA CRM - SEARCH INSIGHTS REPORT', margin + 5, currentY + 10);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184); // Slate color
      pdf.text(isAr ? 'تحليلات تفاعلية لعمليات البحث في الوقت الفعلي للوكلاء والوسطاء' : 'Real-time telemetry and search performance overview for real estate brokers.', margin + 5, currentY + 17);

      currentY += 25 + 5;

      // 2. Metadata sub-table
      pdf.setFillColor(16, 23, 48); // Dark card (#101730)
      pdf.rect(margin, currentY, contentWidth, 18, 'F');
      
      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isAr ? 'الفترة الزمنية:' : 'TIMEFRAME:', margin + 5, currentY + 7);
      pdf.text(isAr ? 'نطاق البحث:' : 'SCOPE FILTER:', margin + 65, currentY + 7);
      pdf.text(isAr ? 'طريقة المدخلات:' : 'INPUT METHOD:', margin + 125, currentY + 7);
      
      pdf.setTextColor(34, 211, 238); // Cyan (#22d3ee)
      pdf.setFont('helvetica', 'normal');
      const timeLabel = timeFilter === '7d' ? (isAr ? 'آخر 7 أيام' : 'Last 7 Days') : timeFilter === '30d' ? (isAr ? 'آخر 30 يوم' : 'Last 30 Days') : (isAr ? 'كل الأوقات' : 'All Time');
      pdf.text(timeLabel, margin + 5, currentY + 13);
      pdf.text(scopeFilter.toUpperCase(), margin + 65, currentY + 13);
      pdf.text(methodFilter.toUpperCase(), margin + 125, currentY + 13);
      
      currentY += 18 + 8;

      // 3. Capture KPI cards
      const kpisElement = document.getElementById('insights-kpi-cards');
      if (kpisElement) {
        const kpisCanvas = await html2canvas(kpisElement, {
          scale: 2,
          backgroundColor: '#0a0f1d',
          useCORS: true,
          logging: false
        });
        const kpisImg = kpisCanvas.toDataURL('image/png');
        const kpisHeight = (kpisCanvas.height * contentWidth) / kpisCanvas.width;
        pdf.addImage(kpisImg, 'PNG', margin, currentY, contentWidth, kpisHeight);
        currentY += kpisHeight + 8;
      }

      // 4. Capture Keywords Chart and Leaderboard
      const chartsElement = document.getElementById('insights-charts-card');
      if (chartsElement) {
        const chartsCanvas = await html2canvas(chartsElement, {
          scale: 2,
          backgroundColor: '#0a0f1d',
          useCORS: true,
          logging: false
        });
        const chartsImg = chartsCanvas.toDataURL('image/png');
        const chartsHeight = (chartsCanvas.height * contentWidth) / chartsCanvas.width;

        if (currentY + chartsHeight > pageHeight - 15) {
          pdf.addPage();
          currentY = 15;
          
          // Header on Page 2
          pdf.setFillColor(12, 19, 40);
          pdf.rect(margin, currentY, contentWidth, 10, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.text(isAr ? 'تحليلات الكلمات الأكثر بحثاً والاتجاهات المباشرة' : 'MOST SEARCHED ANALYTICS & POPULARITY TRENDS', margin + 3, currentY + 6.5);
          currentY += 10 + 5;
        }

        pdf.addImage(chartsImg, 'PNG', margin, currentY, contentWidth, chartsHeight);
        currentY += chartsHeight + 8;
      }

      // 5. Capture Weekly Traffic Heatmap
      const heatmapElement = document.getElementById('insights-heatmap-card');
      if (heatmapElement) {
        const heatmapCanvas = await html2canvas(heatmapElement, {
          scale: 2,
          backgroundColor: '#0a0f1d',
          useCORS: true,
          logging: false
        });
        const heatmapImg = heatmapCanvas.toDataURL('image/png');
        const heatmapHeight = (heatmapCanvas.height * contentWidth) / heatmapCanvas.width;

        if (currentY + heatmapHeight > pageHeight - 15) {
          pdf.addPage();
          currentY = 15;
        }

        // Section divider banner for Heatmap page
        pdf.setFillColor(12, 19, 40);
        pdf.rect(margin, currentY, contentWidth, 10, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(isAr ? 'خريطة توزيع حركة البحث الأسبوعية' : 'WEEKLY HOURLY TRAFFIC HEATMAP DATA', margin + 3, currentY + 6.5);
        currentY += 10 + 5;

        pdf.addImage(heatmapImg, 'PNG', margin, currentY, contentWidth, heatmapHeight);
        currentY += heatmapHeight + 8;
      }

      // 6. Draw automated recommendation summary
      if (currentY + 25 > pageHeight - 15) {
        pdf.addPage();
        currentY = 15;
      }

      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(margin, currentY, contentWidth, 22, 'F');
      
      pdf.setDrawColor(30, 41, 59); // slate-800
      pdf.rect(margin, currentY, contentWidth, 22, 'S');

      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isAr ? 'ملاحظة وتوصية أتمتة الذكاء الاصطناعي:' : 'INTELLIGENT INTEGRATION & OPERATIONS DIRECTIVE:', margin + 4, currentY + 6);
      
      pdf.setTextColor(226, 232, 240); // slate-200
      pdf.setFont('helvetica', 'normal');
      const noteText = isAr 
        ? 'تم تجميع هذا التقرير بدقة وبشكل تلقائي بناءا على نشاط البحث الحالي لوساطة Emerald Estates. الرجاء استخدام البيانات لتوجيه حملات التسويق وتحسين توزيع الميزانية العقارية.'
        : 'This analytics document highlights real user search frequencies captured in the Sierra CRM database. Use these query telemetry profiles to align active inventory and streamline automated agent match parameters.';
      
      const noteSplit = pdf.splitTextToSize(noteText, contentWidth - 10);
      pdf.text(noteSplit, margin + 4, currentY + 11);

      // 7. Dynamic pagination footer overlay
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(isAr ? `سييرا CRM - صفحة ${i} من ${totalPages}` : `Sierra Real Estate CRM • Page ${i} of ${totalPages}`, margin, pageHeight - 8);
        
        const reportRef = `REF: SEC-LOG-${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`;
        pdf.text(reportRef, pageWidth - margin - 45, pageHeight - 8);
      }

      const reportDateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`crm_insights_report_${reportDateStr}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF Report:", err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Reset brush selection whenever main global filters change to prevent out of bounds
  useEffect(() => {
    setBrushIndices(null);
  }, [timeFilter, scopeFilter, methodFilter]);

  // Construct a stable and continuous list of days based on the selected time filter
  const timeSeriesDays = useMemo(() => {
    const now = new Date();
    const days: Date[] = [];
    
    let numDays = 7;
    if (timeFilter === '30d') {
      numDays = 30;
    } else if (timeFilter === 'all') {
      if (searches.length > 0) {
        const oldest = new Date(Math.min(...searches.map(s => {
          const t = s.timestamp;
          return t instanceof Date ? t.getTime() : new Date(t).getTime();
        })));
        const diffTime = Math.abs(now.getTime() - oldest.getTime());
        numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        // Cap at 60 days to keep the timeline container responsive and elegant
        if (numDays > 60) numDays = 60;
        if (numDays < 7) numDays = 7;
      } else {
        numDays = 7;
      }
    }

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push(d);
    }
    return days;
  }, [searches, timeFilter]);

  // Map each day in the time series to its search volume
  const timelineData = useMemo(() => {
    return timeSeriesDays.map((day) => {
      const startOfDay = new Date(day);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(day);
      endOfDay.setHours(23, 59, 59, 999);

      let count = 0;
      let voiceCount = 0;

      searches.forEach((item) => {
        const matchScope = scopeFilter === 'all' || item.scope === scopeFilter;
        const matchMethod = methodFilter === 'all' || 
          (methodFilter === 'voice' && item.isVoice) || 
          (methodFilter === 'typed' && !item.isVoice);

        const itemTime = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);

        if (matchScope && matchMethod && itemTime >= startOfDay && itemTime <= endOfDay) {
          count++;
          if (item.isVoice) voiceCount++;
        }
      });

      // Format date label
      const formattedDate = day.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });

      return {
        date: day,
        formattedTime: formattedDate,
        count: count,
        voiceCount: voiceCount,
      };
    });
  }, [timeSeriesDays, searches, scopeFilter, methodFilter, isAr]);

  // Derive the active custom time window from the brush selection
  const activeTimeWindow = useMemo(() => {
    if (!brushIndices) {
      return null;
    }
    const { start, end } = brushIndices;
    const startPoint = timelineData[start];
    const endPoint = timelineData[end];
    
    if (!startPoint || !endPoint) {
      return null;
    }
    
    const startDate = new Date(startPoint.date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(endPoint.date);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }, [brushIndices, timelineData]);

  // Threshold Monitor: Check for > 50 searches in a 1-minute window
  const hasTrafficAnomaly = useMemo(() => {
    // We check if the time difference between i and i+50 within searches is <= 60000 ms
    // The searches array is sorted descending (newest first)
    if (searches.length <= 50) return false;
    for (let i = 0; i <= searches.length - 51; i++) {
        const timeNewest = searches[i].timestamp.getTime();
        const timeOldest = searches[i + 50].timestamp.getTime();
        if (timeNewest - timeOldest <= 60000) {
           return true;
        }
    }
    return false;
  }, [searches]);

  // Filter logs with base constraints + the dynamic brush time range
  const filteredSearches = useMemo(() => {
    const now = new Date();
    return searches.filter((item) => {
      const matchScope = scopeFilter === 'all' || item.scope === scopeFilter;
      const matchMethod = methodFilter === 'all' || 
        (methodFilter === 'voice' && item.isVoice) || 
        (methodFilter === 'typed' && !item.isVoice);
        
      if (!matchScope || !matchMethod) return false;

      const itemTime = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);

      // Base timefilter constraint
      if (timeFilter === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (itemTime < sevenDaysAgo) return false;
      } else if (timeFilter === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (itemTime < thirtyDaysAgo) return false;
      }

      // AND custom brush time window constraint
      if (activeTimeWindow) {
        if (itemTime < activeTimeWindow.startDate || itemTime > activeTimeWindow.endDate) {
          return false;
        }
      }

      return true;
    });
  }, [searches, scopeFilter, methodFilter, timeFilter, activeTimeWindow]);

  // Aggregate word frequencies and trends (by comparing youngest half of dataset vs older half)
  const chartData = useMemo(() => {
    const frequencies: { 
      [key: string]: { 
        count: number; 
        voiceCount: number; 
        scope: string; 
        recentHalfCount: number; 
        olderHalfCount: number; 
      } 
    } = {};
    
    const midPoint = Math.ceil(filteredSearches.length / 2);
    
    filteredSearches.forEach((item, idx) => {
      const q = item.query.trim();
      if (!q) return;
      const key = q.toLowerCase();
      if (!frequencies[key]) {
        frequencies[key] = { 
          count: 0, 
          voiceCount: 0, 
          scope: item.scope,
          recentHalfCount: 0,
          olderHalfCount: 0
        };
      }
      frequencies[key].count += 1;
      if (item.isVoice) {
        frequencies[key].voiceCount += 1;
      }
      
      // Since filteredSearches are sorted newest first, the lower indices are more recent
      if (idx < midPoint) {
        frequencies[key].recentHalfCount += 1;
      } else {
        frequencies[key].olderHalfCount += 1;
      }
    });

    return Object.entries(frequencies)
      .map(([key, info]) => {
        // Find matching raw string format with maximum occurrence
        const rawMatch = filteredSearches.find(s => s.query.toLowerCase() === key)?.query || key;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (info.recentHalfCount > info.olderHalfCount) {
          trend = 'up';
        } else if (info.recentHalfCount < info.olderHalfCount) {
          trend = 'down';
        }

        return {
          name: rawMatch,
          count: info.count,
          voiceCount: info.voiceCount,
          scope: info.scope,
          trend: trend
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 queries
  }, [filteredSearches]);

  // Insights statistics calculation
  const stats = useMemo(() => {
    const total = filteredSearches.length;
    const voice = filteredSearches.filter(s => s.isVoice).length;
    
    // Most popular category from logs
    const categoryCounts: { [key: string]: number } = {};
    filteredSearches.forEach(s => {
      categoryCounts[s.scope] = (categoryCounts[s.scope] || 0) + 1;
    });
    
    let popularCat = 'n/a';
    let maxCount = 0;
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        popularCat = cat;
      }
    });

    return {
      total,
      voice,
      voicePercent: total > 0 ? Math.round((voice / total) * 100) : 0,
      popularCat: popularCat === 'all' ? 'All categories' : popularCat
    };
  }, [filteredSearches]);

  // Heatmap hourly data matrix for current week
  const heatmapData = useMemo(() => {
    const now = new Date();
    
    // Find Monday of current week at 00:00:00
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const queriesMatrix: string[][][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => []));

    searches.forEach((item) => {
      const timestamp = item.timestamp;
      if (timestamp >= startOfWeek) {
        const day = timestamp.getDay(); // 0 is Sunday, 1 is Monday...
        const matrixDayIndex = day === 0 ? 6 : day - 1; // Mon=0, Tue=1, ... Sun=6
        const hour = timestamp.getHours();
        
        if (matrixDayIndex >= 0 && matrixDayIndex < 7 && hour >= 0 && hour < 24) {
          matrix[matrixDayIndex][hour] += 1;
          if (item.query && item.query.trim()) {
            queriesMatrix[matrixDayIndex][hour].push(item.query);
          }
        }
      }
    });

    let maxCountInMatrix = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (matrix[d][h] > maxCountInMatrix) {
          maxCountInMatrix = matrix[d][h];
        }
      }
    }

    return { matrix, queriesMatrix, startOfWeek, maxCountInMatrix };
  }, [searches]);

  const weeklyTotalSearches = useMemo(() => {
    let count = 0;
    heatmapData.matrix.forEach(row => {
      row.forEach(cell => {
        count += cell;
      });
    });
    return count;
  }, [heatmapData]);

  const getCellColorClass = (count: number, maxCount: number) => {
    if (count === 0) return 'bg-[#0a0f1d] border border-slate-900 opacity-30 hover:opacity-100 hover:bg-slate-850/40';
    if (maxCount <= 1) {
      return 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 hover:scale-[1.12] transition-transform shadow-[0_0_6px_rgba(6,182,212,0.15)]';
    }
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:scale-[1.12] transition-transform hover:shadow-[0_0_8px_rgba(6,182,212,0.25)]';
    if (ratio <= 0.5) return 'bg-cyan-500/45 text-cyan-200 border border-cyan-500/45 hover:scale-[1.15] transition-transform hover:shadow-[0_0_12px_rgba(6,182,212,0.45)]';
    if (ratio <= 0.75) return 'bg-cyan-500/75 text-white border border-cyan-400/60 hover:scale-[1.18] transition-transform hover:shadow-[0_0_15px_rgba(34,211,238,0.65)]';
    return 'bg-cyan-400 text-slate-950 font-bold border border-cyan-200 hover:scale-[1.22] transition-transform shadow-[0_0_18px_rgba(34,211,238,0.85)]';
  };

  return (
    <div className="space-y-6" id="search-insights-dashboard-root">
      
      {/* Header and Seeding Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-[#0c1328]/70 border border-slate-800/80 rounded-xl gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-white tracking-tight flex items-center gap-2">
            📊 {isAr ? "تحليلات البحث والعمليات" : "CRM Search Insights"}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {isAr 
              ? "حلل عمليات البحث الأكثر تكراراً للتعرف على اهتمامات الوكلاء واستعلاماتهم الشائعة في الوقت الفعلي."
              : "Discover what CRM properties and inquiries real-estate brokers search for the most. Log voice and typed queries dynamically."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {searches.length > 0 && (
            <>
              <button
                onClick={downloadPDFReport}
                disabled={generatingPdf}
                className="px-3.5 py-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 active:bg-cyan-500/30 rounded border border-cyan-500/30 transition-all font-semibold uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                id="btn-download-pdf-report"
              >
                {generatingPdf ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full mr-1" />
                    {isAr ? 'جاري التجهيز...' : 'GENERATING...'}
                  </>
                ) : (
                  <>
                    📄 {isAr ? 'تحميل تقرير PDF' : 'Download PDF Report'}
                  </>
                )}
              </button>

              <button
                onClick={downloadTelemetryLogs}
                className="px-3.5 py-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 active:bg-cyan-500/30 rounded border border-cyan-500/30 transition-all font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
                id="btn-download-search-telemetry"
              >
                📥 {isAr ? 'تنزيل القياسات الفورية' : 'Export Logs (.JSON)'}
              </button>

              <button
                onClick={downloadCsvLogs}
                className="px-3.5 py-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 rounded border border-emerald-500/30 transition-all font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
                id="btn-download-search-csv"
              >
                📊 {isAr ? 'تصدير بصيغة CSV' : 'Download CSV'}
              </button>
            </>
          )}

          {searches.length === 0 && !loading && (
            <button
              onClick={seedMockSearches}
              className="px-3.5 py-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 rounded border border-cyan-500/30 transition-all font-semibold uppercase animate-pulse flex items-center gap-1.5"
              id="btn-seed-search-telemetry"
            >
              ⚡ {isAr ? 'توليد عينة بيانات بحث' : 'Seed Sample Insights Data'}
            </button>
          )}
        </div>
      </div>

      {/* Grid of Key Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="insights-kpi-cards">
        {/* Metric 1 */}
        <div className="p-5 bg-gradient-to-br from-[#0c1328]/90 to-[#0e1730]/90 border border-slate-800/80 rounded-xl relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
            {isAr ? "إجمالي عمليات البحث" : "TOTAL CRM QUERIES LOGGED"}
          </div>
          <div className="text-3xl font-extrabold text-white mt-1.5 font-mono flex items-baseline gap-2">
            {stats.total}
            <span className="text-[10px] font-normal text-slate-400 font-sans">
              {isAr ? "استعلام تم رصده" : "queries tracked"}
            </span>
          </div>
          <div className="absolute right-4 bottom-4 text-3xl font-bold opacity-10 select-none">🔍</div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 bg-gradient-to-br from-[#0c1328]/90 to-[#0e1730]/90 border border-slate-800/80 rounded-xl relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
            {isAr ? "البحث بالصوت" : "VOICE CONTROL ADOPTION"}
          </div>
          <div className="text-3xl font-extrabold text-red-400 mt-1.5 font-mono flex items-baseline gap-2">
            {stats.voicePercent}%
            <span className="text-[10px] font-normal text-slate-400 font-sans">
              ({stats.voice} {isAr ? "بحث صوتي" : "voice searches"})
            </span>
          </div>
          <div className="absolute right-4 bottom-4 text-3xl font-bold opacity-10 select-none">🎙️</div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 bg-gradient-to-br from-[#0c1328]/90 to-[#0e1730]/90 border border-slate-800/80 rounded-xl relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
            {isAr ? "الفئة الأكثر رواجاً" : "HOTTEST CATEGORY RANGE"}
          </div>
          <div className="text-xl font-bold text-cyan-400 mt-2 font-mono uppercase truncate">
            {stats.popularCat === 'leads' ? T('leads') :
             stats.popularCat === 'listings' ? T('listings') :
             stats.popularCat === 'agents' ? T('agents') :
             stats.popularCat === 'workflows' ? T('workflows') :
             'n/a'}
          </div>
          <div className="absolute right-4 bottom-4 text-3xl font-bold opacity-10 select-none">🏢</div>
        </div>
      </div>

      {/* Database Filter Level */}
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-wrap items-end gap-4" id="db-query-toolbar">
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase">
            {isAr ? "معرف المستخدم (UID)" : "User ID Constraint"}
          </label>
          <input
            type="text"
            placeholder={isAr ? "تصفية بواسطة User ID..." : "Filter by User ID..."}
            value={dbUserId}
            onChange={e => setDbUserId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded text-xs font-mono text-white w-48"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase">
            {isAr ? "من تاريخ" : "Start Date"}
          </label>
          <input
            type="date"
            value={dbDateStart}
            onChange={e => setDbDateStart(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded text-xs font-mono text-white w-36"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase">
            {isAr ? "إلى تاريخ" : "End Date"}
          </label>
          <input
            type="date"
            value={dbDateEnd}
            onChange={e => setDbDateEnd(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded text-xs font-mono text-white w-36"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div className="text-[10px] font-mono text-cyan-500/70 py-1.5 px-3 bg-cyan-500/10 border border-cyan-500/20 rounded ml-auto">
          {isAr ? "تصفية على مستوى قاعدة البيانات Firestore" : "Firestore Server-Side Querying"}
        </div>
      </div>

      {hasTrafficAnomaly && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-4"
        >
          <div className="p-2 bg-rose-500/20 rounded-full text-rose-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-400">
              {isAr ? "تحذير: حركة بحث غير عادية" : "Warning: High Search Traffic Anomaly detected"}
            </h4>
            <p className="text-xs text-rose-400/80 mt-1">
              {isAr
                ? "تم اكتشاف أكثر من 50 عملية بحث في نافذة زمنية مدتها دقيقة واحدة. قد يشير هذا إلى نشاط مكثف."
                : "> 50 searches were performed within a rolling 1-minute window in the active query criteria."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Main Bar Chart Panel */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800/80 rounded-xl" id="insights-charts-card">
        {/* Interactive Filters Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/60 pb-4 mb-5">
          <div>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              📈 {isAr ? "الكلمات الأكثر تكراراً" : "Most Searched Analytics Keywords"}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAr ? "تحليل الكلمات المفتاحية الـ 10 الأولى التي تكرر استخدامها." : "Analyzing top 10 CRM queries categorized by frequency and search context."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope dropdown */}
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as any)}
              className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">🌐 {isAr ? 'جميع الفئات' : 'All Fields'}</option>
              <option value="leads">👤 {T('leads')}</option>
              <option value="listings">🏢 {T('listings')}</option>
              <option value="agents">🤖 {T('agents')}</option>
              <option value="workflows">⚡ {T('workflows')}</option>
            </select>

            {/* Time filter dropdown */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="7d">📅 {isAr ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
              <option value="30d">📅 {isAr ? 'آخر 30 يوم' : 'Last 30 Days'}</option>
              <option value="all">📅 {isAr ? 'كل الأوقات' : 'All Time'}</option>
            </select>

            {/* Input method selection button */}
            <div className="flex items-center border border-slate-800 bg-slate-950/80 p-0.5 rounded text-[10px] font-mono">
              {[
                { id: 'all', label: isAr ? 'الكل' : 'All' },
                { id: 'voice', label: isAr ? 'صوت' : 'Voice' },
                { id: 'typed', label: isAr ? 'لوحة المفاتيح' : 'Typed' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethodFilter(m.id as any)}
                  className={`px-2 py-0.5 rounded transition ${
                    methodFilter === m.id
                      ? 'bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart UI */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs font-mono text-slate-500">
            {isAr ? 'جاري تحميل البيانات الفورية...' : 'Loading analytics logs...'}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800/60 rounded-lg">
            <span className="text-2xl mb-2">🔍</span>
            <div className="text-xs font-mono text-slate-400 font-semibold">
              {isAr ? "لا توجد عمليات بحث تطابق معايير التصفية" : "No matching query telemetry logged yet"}
            </div>
            <p className="text-[10px] text-slate-500 max-w-xs mt-1">
              {isAr
                ? "ابدأ بكتابة كلمات في شريط البحث بالأعلى أو جرب البحث الصوتي لتسجيل البيانات."
                : "Try typing multiple keyword terms in the top search bar or testing voice queries to populate analytics."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Block with Keywords Bar Chart & Interactive Time Window Brush Slider */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              
              {/* Keywords Bar Chart (Filters dynamically as user brushes the timeline below) */}
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontFamily="monospace"
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontFamily="monospace"
                      allowDecimals={false}
                      tickLine={false} 
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0b101f] border border-slate-800 p-2.5 rounded shadow-xl text-[11px] font-mono">
                              <p className="text-white font-bold mb-1">"{data.name}"</p>
                              <p className="text-cyan-400">{isAr ? 'إجمالي البحث:' : 'Total Queries:'} <span className="font-bold">{data.count}</span></p>
                              <p className="text-red-400">{isAr ? 'منها بالصوت:' : 'Voice-triggered:'} <span className="font-bold">{data.voiceCount}</span></p>
                              <p className={`${
                                data.trend === 'up' ? 'text-emerald-400' :
                                data.trend === 'down' ? 'text-rose-400' :
                                'text-slate-400'
                              }`}>
                                {isAr ? 'الاتجاه:' : 'Trend:'}{' '}
                                <span className="font-bold text-xs">
                                  {data.trend === 'up' ? '▲ (صاعد)' :
                                   data.trend === 'down' ? '▼ (هابط)' :
                                   '■ (مستقر)'}
                                </span>
                              </p>
                              <p className="text-slate-500 text-[10px] mt-1 capitalize">Category: {data.scope}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => {
                        // Custom colors per matching search category
                        let barColor = '#06b6d4'; // listings / default cyan
                        if (entry.scope === 'leads') barColor = '#ef4444';
                        if (entry.scope === 'agents') barColor = '#10b981';
                        if (entry.scope === 'workflows') barColor = '#3b82f6';
                        return <Cell key={`cell-${index}`} fill={barColor} opacity={0.85} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Interactive Timeline with Recharts Brush component */}
              <div className="bg-[#050914] border border-slate-800/60 p-3.5 rounded-lg select-none" id="timeline-brush-control-panel">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-2 bg-slate-950/45 px-2.5 py-1.5 rounded border border-slate-900/60">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    🕒 {isAr ? "تحليل النطاق الزمني المخصص (انقر واسحب للتحكم)" : "Click & Drag Timeline Brush to Filter"}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-cyan-400">
                    {activeTimeWindow ? (
                      `📅 ${activeTimeWindow.startDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${activeTimeWindow.endDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    ) : (
                      isAr ? "📅 كامل الفترة الزمنية المفلترة" : "📅 Entire filtered period"
                    )}
                  </span>
                </div>

                <div className="h-20 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 5, right: 15, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="brushAreaColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="formattedTime" 
                        stroke="#475569" 
                        fontSize={8} 
                        fontFamily="monospace"
                        tickLine={false} 
                      />
                      <YAxis hide />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[#0b101f] border border-slate-800 px-2 py-1.5 rounded shadow-lg text-[10px] font-mono">
                                <p className="text-white font-bold">{data.formattedTime}</p>
                                <p className="text-cyan-400">{isAr ? 'الاستعلامات:' : 'Searches:'} <span className="font-bold">{data.count}</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#0891b2" strokeWidth={1} fillOpacity={1} fill="url(#brushAreaColor)" />
                      <Brush 
                        dataKey="formattedTime" 
                        height={24} 
                        stroke="#0891b2"
                        fill="#050914"
                        travellerWidth={8}
                        onChange={(obj) => {
                          if (obj && typeof obj.startIndex === 'number' && typeof obj.endIndex === 'number') {
                            setBrushIndices({ start: obj.startIndex, end: obj.endIndex });
                          }
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Keyword Trends Leaderboard */}
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-4 flex flex-col justify-between" id="insights-keyword-leaderboard">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-3">
                  🔥 {isAr ? "صدارة الكلمات والاتجاهات" : "Leaderboard & Popularity Trends"}
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {chartData.map((entry, index) => (
                    <div key={`entry-${index}`} className="flex items-center justify-between p-2 bg-slate-900/30 border border-slate-800/40 rounded hover:bg-slate-900/60 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-slate-500">#{index + 1}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] text-white font-bold truncate">"{entry.name}"</p>
                          <span className="text-[9px] font-mono text-slate-500 block truncate uppercase">{entry.scope}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-slate-300 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                          {entry.count}
                        </span>

                        {entry.trend === 'up' && (
                          <span 
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 font-mono" 
                            title={isAr ? "شعبية متزايدة" : "Popularity Increasing"}
                          >
                            ▲ {isAr ? 'صعود' : 'Up'}
                          </span>
                        )}
                        {entry.trend === 'down' && (
                          <span 
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 font-mono" 
                            title={isAr ? "شعبية منخفضة" : "Popularity Decreasing"}
                          >
                            ▼ {isAr ? 'هبوط' : 'Down'}
                          </span>
                        )}
                        {entry.trend === 'stable' && (
                          <span 
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 font-mono" 
                            title={isAr ? "شعبية مستقرة" : "Popularity Stable"}
                          >
                            ■ {isAr ? 'مستقر' : 'Stable'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[9px] font-mono text-slate-500 uppercase tracking-tight text-center mt-3 pt-2 border-t border-slate-800/30">
                {isAr ? "نشاط مقارنة فترات البحث" : "Based on timeline metrics analysis"}
              </div>
            </div>
          </div>
        )}

        {/* Color Legend */}
        {chartData.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-800/40 text-[9px] font-mono text-slate-500 uppercase justify-center">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500/80" /> {T('listings')}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/80" /> {T('leads')}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" /> {T('agents')}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500/80" /> {T('workflows')}</span>
          </div>
        )}
      </div>

      {/* Search Peaks Calendar Heatmap Component (Current Week) */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800/80 rounded-xl" id="insights-heatmap-card">
        <div className="border-b border-slate-800/60 pb-4 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2 animate-fade-in">
              ⏱️ {isAr ? "خريطة الحرارة الزمنية لعمليات البحث (الأسبوع الحالي)" : "Weekly Hourly Traffic Heatmap (Current Week)"}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAr 
                ? `توزيع مكثف للبحث عبر الأوقات اليومية للأسبوع الحالي. إجمالي البحث هذا الأسبوع: ${weeklyTotalSearches} استعلام.`
                : `Hourly search load distribution for the current week starting Mon ${heatmapData.startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}. Total: ${weeklyTotalSearches} searches.`}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase shrink-0 select-none">
            <span>{isAr ? "شدة الحركة:" : "Traffic Intensity:"}</span>
            <div className="flex items-center gap-1 bg-slate-950/45 p-1 rounded border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0a0f1d] border border-slate-900" title="0" />
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/20" title="Low" />
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/45" title="Medium" />
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/75" title="High" />
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.5)]" title="Peak" />
            </div>
          </div>
        </div>

        {/* Heatmap Grid Wrapper */}
        <div className="overflow-x-auto select-none scroller-style pb-2">
          <div className="min-w-[760px] pb-1">
            {/* Header: Hour labels */}
            <div className="grid grid-cols-[80px_1fr] gap-2 mb-2">
              <div className="text-[10px] font-mono text-slate-500 font-bold uppercase flex items-center justify-center">
                {isAr ? "اليوم" : "Day"}
              </div>
              <div className="grid gap-1.5 text-center text-[9px] font-mono text-slate-500 font-bold" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="truncate" title={formatHourLabel(h)}>
                    {h.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows of days */}
            <div className="space-y-1.5">
              {daysFullLabels.map((dayName, dayIndex) => (
                <div key={dayName} className="grid grid-cols-[80px_1fr] gap-2 items-center">
                  {/* Row Header (Day name) */}
                  <div className="text-[10px] font-bold text-slate-300 font-mono truncate bg-slate-900/40 px-2 py-1.5 rounded border border-slate-800/45 text-center">
                    {daysLabels[dayIndex]}
                  </div>

                  {/* 24 hour blocks */}
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const count = heatmapData.matrix[dayIndex][hour];
                      const queries = heatmapData.queriesMatrix[dayIndex][hour];
                      const colorClass = getCellColorClass(count, heatmapData.maxCountInMatrix);
                      
                      return (
                        <div
                          key={hour}
                          onMouseEnter={() => setHoveredHeatmapCell({ dayIndex, hour, count, queries })}
                          onMouseLeave={() => setHoveredHeatmapCell(null)}
                          className={`h-7 rounded border cursor-pointer transition-all duration-150 flex items-center justify-center text-[10px] font-bold font-mono ${colorClass}`}
                          title={`${dayName} ${formatHourLabel(hour)}: ${count} searches`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Detail Card for selected block */}
        <div className="mt-5 p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 min-h-[64px] transition-all">
          {hoveredHeatmapCell ? (
            <>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-bold block">
                  📍 {isAr ? "تفاصيل الساعة المحددة" : "HOURLY TELEMETRY DETAIL"}
                </span>
                <p className="text-xs text-slate-100 font-semibold mt-1">
                  {daysFullLabels[hoveredHeatmapCell.dayIndex]} • {formatHourLabel(hoveredHeatmapCell.hour)}
                </p>
              </div>

              <div className="flex-1 md:max-w-md">
                <span className="text-[9px] uppercase font-mono text-slate-500 block">
                  {isAr ? "الاستعلامات المسجلة:" : "Logged Searches in this slot:"}
                </span>
                {hoveredHeatmapCell.queries.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1 max-h-12 overflow-y-auto pr-1">
                    {Array.from(new Set(hoveredHeatmapCell.queries)).map((q, idx) => (
                      <span key={idx} className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono px-2 py-0.5 rounded">
                        "{q}"
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono italic block mt-1">
                    {isAr ? "لا توجد حركات بحث نشطة في هذه الساعة" : "No active queries detected."}
                  </span>
                )}
              </div>

              <div className="text-right shrink-0 bg-cyan-950/40 border border-cyan-500/20 px-3 py-1.5 rounded font-mono">
                <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold block">
                  {isAr ? "العدد:" : "LOAD:"}
                </span>
                <span className="text-sm font-black text-white">
                  {hoveredHeatmapCell.count} {isAr ? "عمليات" : "searches"}
                </span>
              </div>
            </>
          ) : (
            <div className="w-full text-center py-1 text-slate-500 font-mono text-[11px] flex items-center justify-center gap-2">
              <span>🎯</span>
              <span>
                {isAr 
                  ? "مرر مؤشر الفأرة فوق أي فترات زمنية لعرض الكلمات والمقاييس النشطة." 
                  : "Hover over any hourly cell in the matrix to inspect active searches and custom telemetry."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Live Activity Stream and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Real-time Activity Feed */}
        <div className="p-5 bg-[#0a0f1d] border border-slate-800/80 rounded-xl flex flex-col h-96">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              📡 {isAr ? "سجل الاستعلامات المباشر" : "Live Query Activity Feed"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isAr ? "قائمة فورية لعمليات البحث التي رصدتها المنصة." : "Continuous activity and inputs logged dynamically by active CRM brokers."}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {filteredSearches.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-[11px]">
                {isAr ? 'لا توجد سجلات بعد...' : 'No telemetry data logged.'}
              </div>
            ) : (
              filteredSearches.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-800/60 rounded-md hover:bg-slate-900/80 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold font-mono">"{item.query}"</span>
                      {item.isVoice && (
                        <span className="text-[9px] bg-red-500/15 border border-red-500/25 text-red-400 px-1.5 py-0.2 rounded font-mono uppercase font-bold flex items-center gap-0.5">
                          🎙️ {isAr ? 'صوت' : 'Voice'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                      <span>User ID: {item.userId?.substring(0, 8)}...</span>
                      <span>•</span>
                      <span>
                        {item.timestamp.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-mono tracking-wider font-semibold ${
                    item.scope === 'leads' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    item.scope === 'listings' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                    item.scope === 'agents' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {item.scope === 'leads' ? T('leads') :
                     item.scope === 'listings' ? T('listings') :
                     item.scope === 'agents' ? T('agents') :
                     T('workflows')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Search Insights Tips & Distribution */}
        <div className="p-5 bg-[#0a0f1d] border border-slate-800/80 rounded-xl flex flex-col h-96 justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                💡 {isAr ? "المرئيات والتوصيات التلقائية" : "AI Search Behavior Insights"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAr ? "تحليل السلوكيات الذكية وتحسين أداء المنصة." : "Automated telemetry feedback to optimize real-estate operations."}
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-lg flex gap-3">
                <span className="text-lg">🤖</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-cyan-400 font-mono block mb-1">
                    {isAr ? 'تحديث تلقائي للفهرسة' : 'Automated Agent Indexing Match'}
                  </strong>
                  {isAr 
                    ? `استناداً إلى زيادة الاستعلامات عن "${chartData[0]?.name || 'العقارات'}"، فإن وكلاء الذكاء الاصطناعي يقومون تلقائياً بزيادة وتيرة مطابقة العقارات لعقود العملاء.` 
                    : `Based on elevated search queries for "${chartData[0]?.name || 'residential listings'}", Sierra matching agents have escalated match priority for incoming leads.`}
                </p>
              </div>

              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg flex gap-3">
                <span className="text-lg">🎙️</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-red-400 font-mono block mb-1">
                    {isAr ? 'كفاءة التعرف الصوتي' : 'Voice Accessibility Metrics'}
                  </strong>
                  {isAr
                    ? `إن معدل التفاعل الصوتي الحالي يبلغ (${stats.voicePercent}%). إن استعمال أتمتة الإملاء الصوتي يساعد الوسطاء والوكلاء على تدوين وتحصيل المعلومات أثناء التنقل.`
                    : `Voice searches represent ${stats.voicePercent}% of overall user commands. Dictation support accelerates field operations in the CRM.`}
                </p>
              </div>

              <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg flex gap-3">
                <span className="text-lg">⚡</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-slate-400 font-mono block mb-1">
                    {isAr ? 'نشاط سير العمل التلقائي' : 'Synergetic Workflows'}
                  </strong>
                  {isAr
                    ? "ينصح بإنشاء روابط سير العمل مخصصة لتجميع وتوصيل تقارير أسبوعية مبنية على الكلمات الأكثر تكراراً."
                    : "Establish an automation node inside workflows to schedule automatic PDF exports based on top keywords."}
                </p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono border-t border-slate-800/50 pt-2 text-center">
            {isAr ? "تحديث تلقائي حقيقي في الوقت الفعلي" : "Real-Time Telemetry Tracking Connected"}
          </div>
        </div>

      </div>

    </div>
  );
}

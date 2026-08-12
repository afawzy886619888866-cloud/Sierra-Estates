import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import '../admin.css';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export function AdminMatrixApp() {
  const [tab, setTab] = useState('overview');
  const [theme, setTheme] = useState(() => localStorage.getItem('admin_theme') || 'dark');
  const [langKey, setLangKey] = useState(() => localStorage.getItem('admin_lang') || 'en');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Expose real-time db states if you need them. For now, we will display static refined dashboards.
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const isAr = langKey === 'ar';
    document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    document.body.style.fontFamily = isAr ? "'Cairo','Inter',sans-serif" : "'Inter',sans-serif";
    localStorage.setItem('admin_theme', theme);
    localStorage.setItem('admin_lang', langKey);
  }, [theme, langKey]);

  return (
    <div className="admin-body">
      <iframe src="/admin-matrix.html" style={{width: '100vw', height: '100vh', border: 'none', background: 'var(--bg-matrix)'}} />
    </div>
  );
}

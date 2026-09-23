'use client';
/* cspell:disable */

import React, { useState, useMemo } from 'react';

export interface AppService {
  id: string;
  name: { en: string; ar: string };
  category: 'core' | 'ai' | 'studio' | 'infra';
  description: { en: string; ar: string };
  badge?: string;
  badgeCls?: string;
  tech: string[];
  port?: string;
  route?: string;
  repoPath: string;
  status: 'online' | 'running' | 'idle' | 'external';
  icon: string;
  accentColor: string;
  actionType: 'navigate' | 'external' | 'api';
  actionTarget: string;
}

export const APPS_CATALOG: AppService[] = [
  {
    id: 'sierra-client',
    name: { en: 'Sierra Client & Luxury Portal', ar: 'بوابة العملاء الفاخرة' },
    category: 'core',
    description: {
      en: 'Public luxury real estate client portal with high-touch compound guides, 3D tours, and VIP viewing requests.',
      ar: 'بوابة الواجهة الأمامية العامة للعملاء والمستثمرين، متضمنة أدلة المجمعات وحجوزات المعاينة.'
    },
    badge: 'PUBLIC',
    badgeCls: 'nb-blue',
    tech: ['Next.js 15', 'React 19', 'Tailwind', 'Supabase'],
    port: ':3000 / Edge',
    route: '/',
    repoPath: 'apps/sierra-estates-realty',
    status: 'online',
    icon: '🏰',
    accentColor: '#C8961A',
    actionType: 'external',
    actionTarget: '/',
  },
  {
    id: 'sierra-admin',
    name: { en: 'Sierra Admin & Intelligence OS', ar: 'لوحة التحكم والذكاء التشغيلي' },
    category: 'core',
    description: {
      en: 'Central command deck for operations, S1-S10 deal pipelines, real-time telemetry, and staff management.',
      ar: 'مركز القيادة الموحد لإدارة الصفقات والمخزون ومتابعة أسطول الوكلاء الذكي.'
    },
    badge: 'CONTROL DECK',
    badgeCls: 'nb-green',
    tech: ['Next.js App Router', 'TypeScript', 'Obsidian Watermark'],
    port: ':3000 /admin',
    route: '/admin',
    repoPath: 'apps/sierra-estates-realty/app/admin',
    status: 'online',
    icon: '🎛️',
    accentColor: '#34D399',
    actionType: 'navigate',
    actionTarget: 'overview',
  },
  {
    id: 'python-api',
    name: { en: 'PropTech Core Python Backend', ar: 'محرك بايثون للتقييم والمزامنة' },
    category: 'core',
    description: {
      en: 'FastAPI microservice executing AVM price predictions, PropertyFinder sync, HubSpot CRM, and ECC memory.',
      ar: 'خدمة FastAPI السحابية المسؤولة عن نماذج التقييم العقاري الآلي ومزامنة بروبرتي فايندر وهب سبوت.'
    },
    badge: 'FASTAPI',
    badgeCls: 'nb-green',
    tech: ['Python 3.12', 'FastAPI', 'Pandas', 'Cloud Run'],
    port: ':8000 / Cloud Run',
    route: '/api/v1',
    repoPath: 'apps/api',
    status: 'online',
    icon: '⚡',
    accentColor: '#F59E0B',
    actionType: 'navigate',
    actionTarget: 'api_gateway',
  },
  {
    id: 'agent-fleet',
    name: { en: 'Agent Cognition & Leila Fleet', ar: 'أسطول الذكاء الاصطناعي وليلى' },
    category: 'ai',
    description: {
      en: 'Bilingual autonomous agent fleet handling WhatsApp client qualification, multi-turn reasoning, and deal triage.',
      ar: 'شبكة الوكلاء الذاتية بقيادة ليلى لإدارة محادثات الواتساب وتأهيل المشترين العرب والأجانب.'
    },
    badge: 'FLEET',
    badgeCls: 'nb-green',
    tech: ['Vertex AI', 'Gemini 2.5', 'Multi-Agent', 'LangChain'],
    port: 'In-process / Cloud Run',
    route: '/admin/intelligence',
    repoPath: 'apps/agents',
    status: 'online',
    icon: '🧠',
    accentColor: '#7C3AED',
    actionType: 'navigate',
    actionTarget: 'intelligence',
  },
  {
    id: 'memory-brain',
    name: { en: 'Memory Brain, DeepSeek & MemPalace', ar: 'الذاكرة المركزية، DeepSeek وMemPalace' },
    category: 'ai',
    description: {
      en: 'DeepSeek-V3 reasoning harness, 18-note Obsidian Markdown Knowledge Vault, ECC price drop radar, and MemPalace vector rooms.',
      ar: 'محرك تقييم DeepSeek الحتمي ومستودع ملاحظات أوبسيديان ورادار هبوط الأسعار وقصر الذاكرة المتجهي.'
    },
    badge: 'DEEPSEEK',
    badgeCls: 'nb-green',
    tech: ['DeepSeek-V3', 'Obsidian Vault', 'ECC Memory', 'MemPalace'],
    port: 'In-process / RAG',
    route: '/admin?tab=memory_brain',
    repoPath: 'packages/deepseek-harness',
    status: 'online',
    icon: '🧬',
    accentColor: '#C5A059',
    actionType: 'navigate',
    actionTarget: 'memory_brain',
  },
  {
    id: 'n8n-automations',
    name: { en: 'Workflow & n8n Orchestrator', ar: 'محرك أتمتة العمليات n8n' },
    category: 'infra',
    description: {
      en: 'Event-driven workflow execution running scraper crons, webhook dispatchers, and Telegram alert triggers.',
      ar: 'محرك سير العمل التلقائي لإدارة المهام المجدولة وتوزيع التنبيهات عبر تلغرام وواتساب.'
    },
    badge: 'CRON & WEBHOOKS',
    badgeCls: 'nb-blue',
    tech: ['n8n', 'Docker', 'Webhooks', 'TypeScript'],
    port: ':5678 / Docker',
    route: '/automations',
    repoPath: 'apps/automations',
    status: 'running',
    icon: '🪄',
    accentColor: '#E63946',
    actionType: 'navigate',
    actionTarget: 'automations',
  },
  {
    id: 'workflow-studio',
    name: { en: 'Interactive Workflow Studio', ar: 'استوديو تدفق العمل والصفحات' },
    category: 'studio',
    description: {
      en: 'Visual drag-and-drop designer for S1-S10 deal pipelines, trigger nodes, agent handoffs, and verification gates.',
      ar: 'أداة تفاعلية لتصميم وإدارة مسارات العمل العقارية وربط المحفزات بتسليم المهام بين الوكلاء.'
    },
    badge: 'STUDIO v3',
    badgeCls: 'nb-green',
    tech: ['React 19', 'TypeScript', 'Workflow Engine'],
    port: 'Integrated',
    route: '/admin?tab=workflow_studio',
    repoPath: 'apps/sierra-estates-realty/app/admin/views/WorkflowStudioView.tsx',
    status: 'online',
    icon: '⚡',
    accentColor: '#34D399',
    actionType: 'navigate',
    actionTarget: 'workflow_studio',
  },
  {
    id: 'whatsapp-outreach-hub',
    name: { en: 'WhatsApp Sender & Mobile Gateway', ar: 'مرسل الواتساب وبوابة الهاتف' },
    category: 'core',
    description: {
      en: 'Scheduled owner & buyer dispatch, live mobile device pairing (+201092048333), and automated chat scanner.',
      ar: 'حملات إرسال الرسائل المجدولة للملاك والمشترين مع ربط مباشر عبر QR وماسح المحادثات.'
    },
    badge: 'OUTREACH',
    badgeCls: 'nb-green',
    tech: ['WhatsApp Web API', 'Baileys', 'QR Socket'],
    port: ':3000 / QR Gateway',
    route: '/admin?tab=whatsapp_outreach',
    repoPath: 'apps/sierra-estates-realty/components/admin/WhatsAppScheduledSender.tsx',
    status: 'online',
    icon: '💬',
    accentColor: '#25D366',
    actionType: 'navigate',
    actionTarget: 'whatsapp_outreach',
  },
  {
    id: 'inventory-os-v2',
    name: { en: 'Listings & Master Inventory OS', ar: 'نظام المخزون والقوائم الحي' },
    category: 'core',
    description: {
      en: 'Central property inventory OS with live AVM pricing, compound unit analytics, and broker syndication.',
      ar: 'نظام المخزون المركزي الشامل لقوائم العقارات مع التقييم المالي اللحظي وتصنيف الوحدات.'
    },
    badge: 'INVENTORY OS',
    badgeCls: 'nb-green',
    tech: ['Supabase Postgres', 'pgvector', 'AVM Engine'],
    port: 'Integrated',
    route: '/admin?tab=inventory_os',
    repoPath: 'apps/sierra-estates-realty/app/admin/views/InventoryOsView.tsx',
    status: 'online',
    icon: '🏛️',
    accentColor: '#FBBF24',
    actionType: 'navigate',
    actionTarget: 'inventory_os',
  },
  {
    id: 'crm-leads-desk',
    name: { en: 'CRM Leads & Hot Inquiries', ar: 'إدارة العملاء والطلبات العاجلة' },
    category: 'core',
    description: {
      en: 'High-touch CRM tracking 284 active leads, stage progression, priority urgency flags, and direct WhatsApp actions.',
      ar: 'إدارة وتتبع 284 عميلاً محتملاً مع أولوية الطلبات العاجلة وتكامل مباشر للتواصل السريع.'
    },
    badge: 'HOT LEADS',
    badgeCls: 'nb-red',
    tech: ['CRM Engine', 'Lead Scorer', 'WhatsApp Direct'],
    port: 'Integrated',
    route: '/admin?tab=leads',
    repoPath: 'apps/sierra-estates-realty/app/admin/AdminPortal.tsx',
    status: 'online',
    icon: '👥',
    accentColor: '#F87171',
    actionType: 'navigate',
    actionTarget: 'leads',
  },
  {
    id: 'easy-listing-studio',
    name: { en: 'Easy Listing & Creative Studio', ar: 'استوديو العروض والتسويق' },
    category: 'studio',
    description: {
      en: 'Interactive luxury property brochure builder, social teaser generator, and bilingual ad copywriting engine.',
      ar: 'أداة توليد البروشورات العقارية الفاخرة وبوستات السوشيال ميديا مع صياغة تسويقية ثنائية اللغة.'
    },
    badge: 'STUDIO',
    badgeCls: 'nb-green',
    tech: ['Canvas API', 'Gemini Copywriter', 'SVG Exporter'],
    port: 'Integrated',
    route: '/admin/easy_listing',
    repoPath: 'apps/sierra-estates-realty/components/admin/EasyListingStudio.tsx',
    status: 'online',
    icon: '🎨',
    accentColor: '#E9C176',
    actionType: 'navigate',
    actionTarget: 'easy_listing',
  },
  {
    id: 'excel-merger',
    name: { en: 'Excel & CSV Inventory Merger', ar: 'أداة دمج وتوحيد ملفات الإكسل' },
    category: 'studio',
    description: {
      en: 'Batch spreadsheet ingestion tool with Arabic column synonym normalization, schema mapping, and deduplication.',
      ar: 'أداة دمج ومعالجة شيتات الوسطاء والمطورين مع مطابقة الأعمدة باللغتين العربية والإنجليزية.'
    },
    badge: 'INGESTION',
    badgeCls: 'nb-blue',
    tech: ['SheetJS (xlsx)', 'Fuzzy Matcher', 'CSV Stream'],
    port: 'Integrated',
    route: '/admin/excel_merger',
    repoPath: 'apps/sierra-estates-realty/app/admin/views/ExcelMergerView.tsx',
    status: 'online',
    icon: '🗂️',
    accentColor: '#10B981',
    actionType: 'navigate',
    actionTarget: 'excel_merger',
  },
  {
    id: 'real-estate-processor',
    name: { en: 'Real Estate Master Processor', ar: 'المعالج المركزي لقوائم العقارات' },
    category: 'studio',
    description: {
      en: 'Comprehensive inventory processor with compound normalization, phone-based deduplication, and export sheets.',
      ar: 'نظام التدقيق المركزي لتنقية المخزون وحذف التكرار بناءً على رقم المالك ونوع الصفقة.'
    },
    badge: 'CLEANING',
    badgeCls: 'nb-green',
    tech: ['Python Engine', 'Tkinter / Web Bridge', 'Data Sanitizer'],
    port: 'CLI / Web',
    route: '/admin/real_estate_processor',
    repoPath: 'apps/sierra-estates-realty/app/admin/views/RealEstateProcessorView.tsx',
    status: 'online',
    icon: '🏘️',
    accentColor: '#C8961A',
    actionType: 'navigate',
    actionTarget: 'real_estate_processor',
  },
  {
    id: 'digital-contracts',
    name: { en: 'Digital Contracts & Escrow Desk', ar: 'العقود الإلكترونية والضمان' },
    category: 'studio',
    description: {
      en: 'Stage-9 legal closing desk: automated agreement drafts, DocuSign e-signatures, and deposit escrow tracking.',
      ar: 'منصة إبرام العقود الرقمية وتوثيق التوقيعات الإلكترونية وإدارة الودائع المالية.'
    },
    badge: 'LEGAL & FIN',
    badgeCls: 'nb-green',
    tech: ['DocuSign API', 'Stripe Escrow', 'PDFKit'],
    port: 'Integrated',
    route: '/admin/contracts',
    repoPath: 'apps/sierra-estates-realty/app/admin/views/ContractsView.tsx',
    status: 'online',
    icon: '📜',
    accentColor: '#8B5CF6',
    actionType: 'navigate',
    actionTarget: 'contracts',
  },
  {
    id: 'yield-heatmap',
    name: { en: 'Yield Heatmap & AVM Analytics', ar: 'خريطة العوائد والتحليل المالي' },
    category: 'ai',
    description: {
      en: 'Interactive geographic heatmap covering New Cairo compounds, rental yields, capital growth, and CAGR.',
      ar: 'خريطة حرارية تفاعلية لعوائد الإيجار ونسب النمو الرأسمالي لمجمعات القاهرة الجديدة.'
    },
    badge: 'ANALYTICS',
    badgeCls: 'nb-blue',
    tech: ['Leaflet / SVG Map', 'AVM Metrics', 'Financial Models'],
    port: 'Integrated',
    route: '/admin/heatmap',
    repoPath: 'apps/sierra-estates-realty/app/admin/views/HeatmapView.tsx',
    status: 'online',
    icon: '🗺️',
    accentColor: '#EC4899',
    actionType: 'navigate',
    actionTarget: 'heatmap',
  },
  {
    id: 'notebooklm-studio',
    name: { en: 'NotebookLM Audio Briefings', ar: 'استوديو الملخصات الصوتية الذكية' },
    category: 'ai',
    description: {
      en: 'AI-generated investor podcast briefings, compound deep dives, and citation-grounded research guides.',
      ar: 'إنشاء برودكاست صوتي ذكي للمستثمرين وملخصات استثمارية مبنية على مصادر موثوقة.'
    },
    badge: 'AUDIO AI',
    badgeCls: 'nb-green',
    tech: ['ElevenLabs', 'Gemini Audio', 'Citation Engine'],
    port: 'Integrated',
    route: '/admin/notebookllm',
    repoPath: 'apps/sierra-estates-realty/components/client/NotebookLMStudio.tsx',
    status: 'online',
    icon: '🎙️',
    accentColor: '#F43F5E',
    actionType: 'navigate',
    actionTarget: 'notebookllm',
  },
  {
    id: 'deployment-pipeline',
    name: { en: 'Deployment & CI/CD Pipeline', ar: 'بوابة النشر وخطوط الإنتاج' },
    category: 'infra',
    description: {
      en: 'Multi-stage CI/CD visualizer, manual approval gates, Vercel/Cloud Run health, and rollback controls.',
      ar: 'مراقبة خط الإنتاج المتعدد، بوابات الموافقة اليدوية، وحالة النشر السحابي مع خيارات الاسترجاع.'
    },
    badge: 'CI / CD',
    badgeCls: 'nb-green',
    tech: ['GitHub Actions', 'Vercel Edge', 'Cloud Run', 'Prometheus'],
    port: 'Automated',
    route: '/admin/deployment',
    repoPath: '.github/workflows',
    status: 'online',
    icon: '🚀',
    accentColor: '#34D399',
    actionType: 'navigate',
    actionTarget: 'deployment',
  },
  {
    id: 'api-gateway',
    name: { en: 'API Gateway & Contract Explorer', ar: 'بوابة واجهات البرمجة والعقود' },
    category: 'infra',
    description: {
      en: 'RESTful API catalog, latency percentiles, error rate tracking, rate limits, and live cURL generator.',
      ar: 'دليل واجهات البرمجة RESTful، قياس سرعة الاستجابة، ونسب الأخطاء ومولد أكواد cURL.'
    },
    badge: 'REST & OPENAPI',
    badgeCls: 'nb-blue',
    tech: ['OpenAPI 3.1', 'Zod Schemas', 'JWT Auth', 'Telemetry'],
    port: ':3000 /api',
    route: '/api',
    repoPath: 'apps/sierra-estates-realty/app/api',
    status: 'online',
    icon: '🌐',
    accentColor: '#C8961A',
    actionType: 'navigate',
    actionTarget: 'api_gateway',
  },
];

interface AppsDirectoryViewProps {
  lang?: string;
  onNavigate: (tabId: string) => void;
}

export default function AppsDirectoryView({
  lang = 'en',
  onNavigate,
}: AppsDirectoryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const isAr = lang === 'ar';

  const categories = [
    { id: 'all', label: isAr ? 'جميع التطبيقات والخدمات' : 'All Apps & Services', icon: '✨' },
    { id: 'core', label: isAr ? 'التطبيقات الأساسية' : 'Core Monorepo Apps', icon: '🏢' },
    { id: 'ai', label: isAr ? 'الذكاء الاصطناعي والتحليل' : 'AI & Cognition', icon: '🧠' },
    { id: 'studio', label: isAr ? 'الاستوديوهات والأدوات' : 'Studios & Tools', icon: '🎨' },
    { id: 'infra', label: isAr ? 'البنية التحتية والنشر' : 'Pipeline & Infra', icon: '⚙️' },
  ];

  const filteredApps = useMemo(() => {
    return APPS_CATALOG.filter((app) => {
      const matchesCategory =
        selectedCategory === 'all' || app.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        app.name.en.toLowerCase().includes(q) ||
        app.name.ar.includes(q) ||
        app.description.en.toLowerCase().includes(q) ||
        app.description.ar.includes(q) ||
        app.tech.some((t) => t.toLowerCase().includes(q)) ||
        app.repoPath.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="fade-up" style={{ paddingBottom: 40, direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 32, 53, 0.95) 0%, rgba(8, 18, 32, 0.98) 100%)',
          border: '1px solid rgba(0, 174, 255, 0.22)',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 24,
          boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: isAr ? 'auto' : -40,
            left: isAr ? -40 : 'auto',
            width: 220,
            height: 220,
            background: 'radial-gradient(circle, rgba(0, 174, 255, 0.14) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--gold, #C8961A)',
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(0, 174, 255, 0.1)',
              border: '1px solid rgba(0, 174, 255, 0.2)',
            }}
          >
            {isAr ? 'دليل المنظومة المتكامل' : 'ECOSYSTEM APP DIRECTORY'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--emerald, #34D399)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="pulse-dot">●</span> {APPS_CATALOG.length} {isAr ? 'تطبيق وخدمة نشطة' : 'Services Operational'}
          </span>
        </div>
        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: isAr ? 700 : 600,
            fontFamily: isAr ? "'Cairo', sans-serif" : "'Cormorant Garamond', serif",
            color: '#FFFFFF',
            marginBottom: 8,
            lineHeight: 1.2,
          }}
        >
          {isAr ? 'منظومة تطبيقات سييرا العقارية الموحدة' : 'Sierra Estates Integrated Application Hub'}
        </h1>
        <p style={{ fontSize: 13.5, color: 'rgba(240, 237, 229, 0.72)', maxWidth: 680, lineHeight: 1.6 }}>
          {isAr
            ? 'الوصول المباشر لكافة تطبيقات المنظومة، خدمات بايثون السحابية، أسطول الذكاء الاصطناعي، وأدوات المعالجة التلقائية في واجهة واحدة موحدة.'
            : 'Unified launcher and telemetry dashboard across all monorepo applications, Python FastAPI microservices, autonomous agent runtimes, and specialized deal-closing studios.'}
        </p>
      </div>

      {/* Control Bar: Categories & Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  border: active
                    ? '1px solid rgba(0, 174, 255, 0.45)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: active
                    ? 'linear-gradient(135deg, rgba(0, 174, 255, 0.22) 0%, rgba(30, 136, 217, 0.12) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: active ? '#FFFFFF' : 'rgba(240, 237, 229, 0.7)',
                  transition: 'all 160ms ease',
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div
          style={{
            position: 'relative',
            minWidth: 260,
            maxWidth: 340,
            flex: 1,
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث في التطبيقات والتقنيات...' : 'Filter apps by name, tech, or path...'}
            style={{
              width: '100%',
              padding: '8px 14px',
              paddingInlineStart: 34,
              borderRadius: 12,
              background: 'rgba(15, 32, 53, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: 12.5,
              outline: 'none',
              fontFamily: isAr ? "'Cairo', sans-serif" : 'inherit',
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              [isAr ? 'right' : 'left']: 12,
              color: 'rgba(240, 237, 229, 0.4)',
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
        </div>
      </div>

      {/* Grid of Apps */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}
      >
        {filteredApps.map((app) => {
          return (
            <div
              key={app.id}
              style={{
                background: 'linear-gradient(180deg, rgba(15, 32, 53, 0.8) 0%, rgba(9, 20, 36, 0.9) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.45)',
                transition: 'transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = `${app.accentColor}55`;
                e.currentTarget.style.boxShadow = `0 16px 36px -6px rgba(0,0,0,0.6), 0 0 20px ${app.accentColor}18`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.boxShadow = '0 12px 28px -6px rgba(0, 0, 0, 0.45)';
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${app.accentColor}25, ${app.accentColor}08)`,
                    border: `1px solid ${app.accentColor}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {app.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#FFFFFF',
                        fontFamily: isAr ? "'Cairo', sans-serif" : 'inherit',
                      }}
                    >
                      {isAr ? app.name.ar : app.name.en}
                    </h3>
                    {app.badge && (
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: 'JetBrains Mono, monospace',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(0, 174, 255, 0.12)',
                          color: '#E9C176',
                          border: '1px solid rgba(0, 174, 255, 0.25)',
                          fontWeight: 700,
                        }}
                      >
                        {app.badge}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'rgba(240, 237, 229, 0.45)',
                      marginTop: 2,
                    }}
                  >
                    {app.repoPath}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 12,
                  color: 'rgba(240, 237, 229, 0.72)',
                  lineHeight: 1.55,
                  marginBottom: 14,
                  flex: 1,
                  fontFamily: isAr ? "'Cairo', sans-serif" : 'inherit',
                }}
              >
                {isAr ? app.description.ar : app.description.en}
              </p>

              {/* Tech tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
                {app.tech.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'rgba(240, 237, 229, 0.65)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Footer status & launcher */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: app.status === 'online' ? '#34D399' : '#C8961A',
                      boxShadow: `0 0 6px ${app.status === 'online' ? '#34D399' : '#C8961A'}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10.5,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'rgba(240, 237, 229, 0.55)',
                    }}
                  >
                    {app.port}
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (app.actionType === 'external') {
                      window.open(app.actionTarget, '_blank');
                    } else {
                      onNavigate(app.actionTarget);
                    }
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 9,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: `linear-gradient(135deg, ${app.accentColor}, ${app.accentColor}cc)`,
                    color: '#071422',
                    border: 'none',
                    boxShadow: `0 4px 12px -2px ${app.accentColor}44`,
                    transition: 'opacity 150ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <span>{isAr ? 'تشغيل' : 'Launch'}</span>
                  <span>{app.actionType === 'external' ? '↗' : '→'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

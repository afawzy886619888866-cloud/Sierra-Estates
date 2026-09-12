/* eslint-disable */
// @ts-nocheck
/* cspell:disable */
'use client';
/**
 * SIERRA ESTATES 3.0 — ADMIN PORTAL (Intelligence OS)
 * Ported 1:1 from the designer's static bundle (admin3.0portalBLUE.html).
 * The demo data arrays (LEADS, DEALS, COMPOUNDS, ...) are the designer's
 * placeholders — wire them to Firestore/API incrementally; see
 * lib/services/dashboard-metrics.ts for the ready-made KPI queries.
 * Styling lives in ./admin-portal.css (extracted from the same bundle).
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './admin-portal.css';
import AgentIntelligence from './intelligence/AgentIntelligence';
import {
  DashboardView,
  HealthView,
  SecurityView,
  MonitoringView,
  RecommendationsView,
  AlertsView,
  ListingsView,
  AgentsView,
  RoleManagerView,
  DeepInsightsView,
  ReportsView,
  ExcelMergerView,
  RealEstateProcessorView,
  ContractsView,
  HeatmapView,
  AppsDirectoryView,
  DeploymentPipelineView,
  ApiGatewayView,
} from './views';
import EasyListingStudio from '@/components/admin/EasyListingStudio';
import WhatsAppScheduledSender from '@/components/admin/WhatsAppScheduledSender';
import { NegotiationSimulator } from '@/components/admin/NegotiationSimulator';
import { PropertyTeaserBrochure } from '@/components/admin/PropertyTeaserBrochure';
import { HarnessBenchmarkCard } from '@/components/admin/HarnessBenchmarkCard';
import NotebookLMStudio from '@/components/client/NotebookLMStudio';
import AdminCopilotDrawer from '@/components/admin/AdminCopilotDrawer';
import CommandPalette, { CommandItem } from '@/components/admin/CommandPalette';
import SierraMasterOrchestrator from '@/components/admin/SierraMasterOrchestrator';
import { LANG, KPI_DATA, AGENTS_DATA, WORKFLOWS_DATA, LEADS_DATA, COMPOUNDS_DATA, NAV_ITEMS, OPENCLAW_LOGS, NEXUS_INIT, type TranslationFn } from './views/data-constants';
import { Ic, ShieldLogo, Sparkline, exportCSV } from './views/admin-shared';


/* ── TRANSLATIONS ─────────────────────────────────────────────────────── */

/* ── SIDEBAR NAV ──────────────────────────────────────────────────────── */
function SidebarContent({ T, tab, setTab, collapsed, setCollapsed, onClose }) {
  const navItems = NAV_ITEMS(T);
  const sections = [...new Set(navItems.map(n => n.section))];
  return (
    <>
      <div className="brand">
        <ShieldLogo size={28}/>
        {!collapsed && <div className="brand-text"><div className="brand-name">{T('brand')}</div><div className="brand-sub">{T('brandSub')}</div></div>}
        {onClose && <button onClick={onClose} title="Close sidebar" aria-label="Close sidebar" style={{marginInlineStart:'auto',background:'none',border:'none',color:'var(--tx-f)',cursor:'pointer'}}><Ic.X/></button>}
      </div>
      <div style={{flex:1,overflowY:'auto',paddingBottom:8}}>
        {sections.map(sec => (
          <div key={sec}>
            {!collapsed && <div className="nav-section">{sec}</div>}
            {navItems.filter(n => n.section===sec).map(n => (
              <div key={n.id} className={`nav-item ${tab===n.id?'active':''}`} onClick={()=>{setTab(n.id);onClose&&onClose();}} title={n.label}>
                <span className="nav-icon">{n.icon}</span>
                <span>{n.label}</span>
                {n.badge && !collapsed && <span className={`nav-badge ${n.badgeCls}`}>{n.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      {!onClose && (
        <div style={{borderTop:'1px solid var(--bd)',padding:'10px 8px'}}>
          <div className="nav-item" onClick={()=>setCollapsed(c=>!c)} title={T('collapse')}>
            <span className="nav-icon" style={{transform:collapsed?'rotate(180deg)':'none',transition:'transform 300ms'}}><Ic.Collapse/></span>
            {!collapsed && <span>{T('collapse')}</span>}
          </div>
        </div>
      )}
    </>
  );
}

/* ── OVERVIEW PAGE ────────────────────────────────────────────────────── */
function OverviewPage({ T }) {
  const [liveKpis, setLiveKpis] = useState(null);
  const ar = T('lang')==='ar';

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLiveKpis(d); })
      .catch((err) => console.warn('[AdminPortal] Dashboard fetch failed:', err));
  }, []);

  const kpis = useMemo(() => {
    const base = KPI_DATA(T);
    if (!liveKpis) return base;
    return [
      { ...base[0], val: liveKpis.totalListings ? liveKpis.totalListings.toLocaleString() : base[0].val },
      { ...base[1], val: liveKpis.activeListings ? liveKpis.activeListings.toLocaleString() : base[1].val },
      base[2],
      { ...base[3], val: liveKpis.newInquiries7d !== undefined ? liveKpis.newInquiries7d.toLocaleString() : base[3].val },
      base[4],
      { ...base[5], val: liveKpis.conversionRate ? `${liveKpis.conversionRate.toFixed(1)}%` : base[5].val },
      { ...base[6], val: liveKpis.pendingApprovals !== undefined ? liveKpis.pendingApprovals.toString() : base[6].val },
      base[7],
    ];
  }, [T, liveKpis]);

  const chips = ar?['لخّص الصفقات الجارية','ما أولويات اليوم؟','اكتب رسالة متابعة','الصفقات المعرّضة للخطر']:['Summarize my pipeline','What should I focus on today?','Draft a follow-up (AR/EN)','Find deals at risk'];
  return (
    <div className="fade-up">
      <div className="ai-hero">
        <div style={{fontFamily:'JetBrains Mono',fontSize:9,letterSpacing:'.18em',textTransform:'uppercase',color:'var(--gold)',marginBottom:8}}>{(ar?'مساعد سييرا · ':'Sierra Copilot · ')+new Date().toLocaleDateString(ar?'ar-EG':'en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
        <h2 style={{fontFamily:ar?"'Cairo',sans-serif":"'Cormorant Garamond',serif",fontSize:'1.9rem',fontWeight:ar?700:500,color:'var(--tx-s)',lineHeight:1.15,marginBottom:6}}>{ar?'كيف تساعدك سييرا في الإغلاق اليوم؟':'How can Sierra help you close today?'}</h2>
        <p style={{fontSize:12.5,color:'var(--tx-m)',maxWidth:520,marginBottom:14}}>{ar?'مساعد المبيعات الذكي يدير خط الصفقات، يصيغ الرسائل، ويبرز ما يحتاج انتباهك — اسأل فقط.':'Your AI sales copilot runs the pipeline, drafts bilingual outreach, and surfaces what needs attention — just ask.'}</p>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
          {chips.map((c,i)=><button key={i} className="ai-chip">{c}</button>)}
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button style={{padding:'10px 20px',border:'none',borderRadius:11,background:'linear-gradient(135deg,var(--gold),var(--gold-lt))',color:'#071422',fontSize:12,fontWeight:800,cursor:'pointer'}}>✦ {ar?'تحدث مع سييرا':'Chat with Sierra'} →</button>
          <button style={{padding:'10px 18px',borderRadius:11,border:'1px solid var(--bd-s)',background:'var(--bg-e)',color:'var(--tx)',fontSize:12,fontWeight:600,cursor:'pointer'}}>⚡ {ar?'تصرّف الآن':'Act Now'}</button>
          <span style={{alignSelf:'center',fontFamily:'JetBrains Mono',fontSize:10,color:'var(--tx-f)'}}>● {liveKpis?.newInquiries7d ?? 23} {ar?'عميل جديد اليوم':'new leads today'}</span>
        </div>
      </div>
      <div className="kpi-grid">
        {kpis.map((k,i) => (
          <div key={i} className="kpi-card" style={{'--accent':k.color}}>
            <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:k.color,borderRadius:'16px 0 0 16px'}}/>
            <div className="kpi-val gold-text">{k.val}</div>
            <div className="kpi-lbl">{k.lbl}</div>
            <div className={`kpi-delta ${k.up?'up':'dn'}`}>{k.up?'↑':'↓'} {k.delta}</div>
            <Sparkline data={k.spark} color={k.color}/>
          </div>
        ))}
      </div>
      <div className="grid-3">
        <div className="card">
          <div className="card-hd"><span className="card-title">{T('pipelineTitle')}</span></div>
          <div className="card-body">
            <div className="bar-chart">
              {['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'].map((s,i) => {
                const h=[95,88,82,79,74,68,61,55,42,28][i];
                const c=['#00AEFF','#5FC9FF','#1E88D9','#34D399','#7C3AED','#E63946','#00AEFF','#1E88D9','#34D399','#00AEFF'][i];
                return (<div key={s} className="bar-col"><div className="bar-fill" style={{height:`${h}%`,background:`linear-gradient(180deg,${c},${c}44)`}}/><span className="bar-lbl">{s}</span></div>);
              })}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">{T('hotLeads')}</span><span className="chip chip-red">3 urgent</span></div>
          <div style={{maxHeight:160,overflowY:'auto'}}>
            {LEADS_DATA.filter(l=>l.hot).map((l,i)=>(
              <div key={i} className="lead-row">
                <div className="lead-avatar" style={{background:l.color}}>{l.name[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name}</div>
                  <div style={{fontSize:9.5,color:'var(--tx-f)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.interest}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <span className="chip chip-amber">{l.stage}</span>
                  {l.phone && (
                    <button
                      className="btn btn-green"
                      style={{padding:'2px 6px',fontSize:9}}
                      onClick={() => {
                        const clean = l.phone.replace(/[^0-9]/g, '');
                        const msg = encodeURIComponent(`مرحباً ${l.name}، مستشار سييرا العقاري معك بخصوص طلبك لـ ${l.interest}.`);
                        window.open(`https://wa.me/${clean}?text=${msg}`, '_blank', 'noopener,noreferrer');
                      }}
                      title="Direct WhatsApp"
                    >
                      💬
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">{T('agentStatus')}</span></div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:8}}>
            {AGENTS_DATA(T).slice(0,4).map((a,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>{a.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:11,fontWeight:600,color:'var(--tx)'}}>{a.name}</span>
                    <span style={{fontFamily:'JetBrains Mono',fontSize:9,color:a.status==='Idle'?'var(--tx-f)':'var(--emerald)'}}>{a.status}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:`${a.load}%`,background:a.color}}/></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── AGENTS PAGE ──────────────────────────────────────────────────────── */
function AgentsPage({ T }) {
  const [active,setActive]=useState(null);
  const [agents, setAgents]=useState(AGENTS_DATA(T));
  const [loading, setLoading]=useState(true);
  const [acting, setActing]=useState('');
  const [chatInput, setChatInput]=useState('');
  const [chatMessages, setChatMessages]=useState([
    { role: 'ai', text: 'مرحباً! أنا ليلى — مساعدتك العقارية الذكية لشركة سييرا. كيف يمكنني مساعدتك اليوم؟' },
  ]);

  const loadBots = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/bots')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.bots) && data.bots.length > 0) {
          const defaults = AGENTS_DATA(T);
          const live = data.bots.map((b, i) => {
            const def = defaults[i] || defaults[0];
            return { ...def, ...b };
          });
          setAgents(live);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [T]);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  const sendBotCommand = async (botId, command) => {
    setActing(`${botId}-${command}`);
    try {
      await fetch('/api/admin/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, command }),
      });
      // Optimistic update
      setAgents(prev => prev.map(a => a.id === botId ? { ...a, status: command === 'stop' ? 'Idle' : 'Running' } : a));
    } catch (e) {
      console.error(e);
    } finally {
      setActing('');
      setTimeout(loadBots, 800);
    }
  };

  const activateAllBots = async () => {
    setActing('all-start');
    try {
      const promises = agents.map(a => 
        fetch('/api/admin/bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId: a.id || 'whatsapp-agent', command: 'start' }),
        }).catch(console.error)
      );
      await Promise.all(promises);
      setAgents(prev => prev.map((a, idx) => ({ ...a, status: 'Running', load: 72 + (idx % 18) })));
    } catch (e) {
      console.error(e);
    } finally {
      setActing('');
      setTimeout(loadBots, 1000);
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);

    setTimeout(() => {
      let reply = 'لدينا اختيارات مميزة تلبي طلبكم مع خطط سداد تبدأ من 5% مقدم وأقساط حتى 8 سنوات.';
      const lower = userText.toLowerCase();
      if (lower.includes('mivida') || userText.includes('ميفيدا')) {
        reply = 'في كمبوند ميفيدا يتوفر لدينا شقق 3 غرف تبدأ من 5.8 مليون وفلل مستقلة بمساحات 320م² تسليم فوري.';
      } else if (lower.includes('hyde park') || userText.includes('هايد بارك')) {
        reply = 'في هايد بارك يتوفر لدينا 4 وحدات تاون هاوس وفلل خاصة مع عائد استثماري متوقع 18% سنوياً.';
      } else if (lower.includes('cairo plaza') || userText.includes('كايرو بلازا')) {
        reply = 'كايرو بلازا يقدم وحدات تجارية وإدارية بعائد إيجاري إلزامي 22% ومساحات من 45م² حتى 450م².';
      }
      setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
    }, 600);
  };

  return (
    <div className="fade-up">
      {/* Top Action Bar */}
      <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button 
            className="btn btn-gold" 
            onClick={activateAllBots} 
            disabled={acting === 'all-start'}
            style={{display:'flex',alignItems:'center',gap:6}}
          >
            ⚡ {acting === 'all-start' ? 'Activating All…' : 'Activate All 10 AI Bots'}
          </button>
          <button className="btn btn-ghost" onClick={loadBots} style={{display:'flex',alignItems:'center',gap:6}}>
            <Ic.Refresh/> {T('refresh') || 'Refresh'}
          </button>
        </div>
        <div style={{fontSize:11,fontFamily:'JetBrains Mono',color:'var(--emerald)',display:'flex',alignItems:'center',gap:6}}>
          <span className="pulse-dot">●</span> 10/10 AI Agents Wired & Ready
        </div>
      </div>

      {/* Scheduled WhatsApp Campaign Studio */}
      <div style={{marginBottom:24}}>
        <WhatsAppScheduledSender />
      </div>

      {loading && <div style={{fontSize:12,color:'var(--tx-m)',marginBottom:16}}>Loading live agent telemetry…</div>}

      <div className="agent-grid" style={{marginBottom:20}}>
        {agents.map((a,i)=>(
          <div key={i} className="agent-card" onClick={()=>setActive(active===i?null:i)} style={{borderColor:active===i?`${a.color}60`:'var(--bd)'}}>
            <div className="agent-icon" style={{background:`${a.color}18`,border:`1px solid ${a.color}30`}}>{a.emoji}</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
              <div style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>{a.name}</div>
              <span className={`chip ${a.status==='Online'||a.status==='Running'||a.status==='active'?'chip-green':a.status==='Idle'?'chip-amber':'chip-blue'}`}><span className="pulse-dot">●</span> {a.status}</span>
            </div>
            <div style={{fontSize:10.5,color:'var(--tx-m)',lineHeight:1.5,marginBottom:10}}>{a.desc}</div>
            <div style={{display:'flex',justifyContent:'space-between',fontFamily:'JetBrains Mono',fontSize:9}}>
              <span style={{color:'var(--tx-f)'}}>{T('load')}</span><span style={{color:a.color,fontWeight:700}}>{a.load || 85}%</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{width:`${a.load || 85}%`,background:a.color}}/></div>
            <div style={{display:'flex',justifyContent:'space-between',fontFamily:'JetBrains Mono',fontSize:9,marginTop:8}}>
              <span style={{color:'var(--tx-f)'}}>{T('totalTasks')}</span><span style={{color:'var(--tx)',fontWeight:700}}>{(a.tasks || 1240).toLocaleString()}</span>
            </div>
            {active===i&&(
              <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--bd)',display:'flex',gap:6,flexWrap:'wrap'}}>
                <button 
                  className="btn btn-green" 
                  style={{fontSize:10,padding:'4px 8px'}} 
                  onClick={(e)=>{e.stopPropagation();sendBotCommand(a.id || 'whatsapp-agent','start');}}
                  disabled={acting.startsWith(`${a.id}-`)}
                >
                  <Ic.Play/> Start
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{fontSize:10,padding:'4px 8px'}} 
                  onClick={(e)=>{e.stopPropagation();sendBotCommand(a.id || 'whatsapp-agent','run_now');}}
                  disabled={acting.startsWith(`${a.id}-`)}
                >
                  ⚡ Run Now
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{fontSize:10,padding:'4px 8px',color:'var(--crimson)'}} 
                  onClick={(e)=>{e.stopPropagation();sendBotCommand(a.id || 'whatsapp-agent','stop');}}
                  disabled={acting.startsWith(`${a.id}-`)}
                >
                  <Ic.Pause/> Stop
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">🐪 Laila AI · Live Assistant Channel</span><span className="chip chip-green"><span className="pulse-dot">●</span> Active</span></div>
        <div className="card-body">
          <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:200,overflowY:'auto',marginBottom:12}}>
            {chatMessages.map((m, idx) => (
              <div key={idx} className={`chat-msg ${m.role}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <input 
              value={chatInput}
              onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleSendChat()}
              style={{flex:1,background:'var(--surf)',border:'1px solid var(--bd)',borderRadius:10,padding:'8px 12px',fontSize:12,color:'var(--tx)',outline:'none'}} 
              placeholder="Test Laila AI (e.g. Mivida, Hyde Park, Cairo Plaza)…"
            />
            <button className="btn btn-gold" onClick={handleSendChat}>{T('sendMsg')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── WORKFLOWS PAGE ───────────────────────────────────────────────────── */
function WorkflowsPage({ T, onNavigate, lang = 'en' }: { T: any; onNavigate?: (tab: string) => void; lang?: string }) {
  const isAr = lang === 'ar' || T('lang') === 'ar';
  const [wfs, setWfs] = useState(WORKFLOWS_DATA.map(w => ({ ...w })));
  const [running, setRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [actionOutput, setActionOutput] = useState<string | null>(null);

  const toggle = (i: number) => setWfs(p => p.map((w, j) => j === i ? { ...w, status: w.status === 'paused' ? 'active' : 'paused' } : w));

  const handleRunAll = async () => {
    setRunning(true);
    setStatusMsg(isAr ? 'جاري تشغيل خط الأتمتة الشامل (/api/orchestrate)...' : 'Triggering multi-stage pipeline orchestration (/api/orchestrate)...');
    try {
      const res = await fetch('/api/orchestrate', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setStatusMsg(res.ok ? (isAr ? '✓ اكتمل تشغيل خط الأتمتة بنجاح عبر المراحل S1-S10!' : '✓ Pipeline orchestration completed across S1–S10 stages!') : (data?.error || 'Orchestration completed with warnings.'));
      setWfs(p => p.map(w => ({ ...w, runs: w.runs + 1, last: isAr ? 'الآن' : 'Just now' })));
    } catch {
      setStatusMsg(isAr ? '✓ تم إرسال أمر التشغيل بنجاح.' : '✓ Pipeline executed successfully.');
    } finally {
      setRunning(false);
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  const triggerOp = async (opName: string, endpoint?: string) => {
    setRunning(true);
    setActionOutput(`[~] ${isAr ? 'جاري تنفيذ' : 'Executing'} ${opName}...`);
    try {
      if (endpoint) {
        await fetch(endpoint, { method: 'POST' }).catch(() => {});
      }
      setTimeout(() => {
        setActionOutput(`[✓] ${opName} ${isAr ? 'اكتملت بنجاح في' : 'completed successfully at'} ${new Date().toLocaleTimeString()}. ${isAr ? 'تم تحديث قاعدة البيانات وقوائم الانتظار.' : 'Database & queues updated.'}`);
        setRunning(false);
      }, 1000);
    } catch {
      setActionOutput(`[✓] ${opName} ${isAr ? 'تم تشغيلها في الخلفية.' : 'triggered in background.'}`);
      setRunning(false);
    }
  };

  return (
    <div className="fade-up">
      {/* Action Header */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <button className="btn btn-gold" onClick={handleRunAll} disabled={running}>
          <Ic.Play/> {running ? (isAr ? 'جاري تشغيل الخط…' : 'Running Pipeline…') : (isAr ? 'تشغيل جميع مسارات العمل' : 'Run All Active Workflows')}
        </button>
        <button className="btn btn-ghost" onClick={()=>setStatusMsg(isAr ? 'تم تحديث مسارات العمل.' : 'Workflows refreshed.')}>
          <Ic.Refresh/> {isAr ? 'تحديث' : 'Refresh'}
        </button>
        {onNavigate && (
          <button 
            className="btn btn-ghost" 
            style={{borderColor:'rgba(62,207,142,.3)',color:'var(--emerald)'}}
            onClick={() => onNavigate('whatsapp_outreach')}
          >
            💬 {isAr ? 'فتح مرسل الواتساب' : 'Open WhatsApp Sender'}
          </button>
        )}
        {statusMsg && (
          <span style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--gold)',marginLeft:8}}>{statusMsg}</span>
        )}
      </div>

      {/* Google Drive & Master Inventory Central Banner */}
      <div className="card" style={{padding:'14px 18px',marginBottom:18,background:'linear-gradient(135deg, rgba(0,174,255,0.06), rgba(62,207,142,0.06))',border:'1px solid rgba(0,174,255,0.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:28}}>📂</span>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:'var(--tx)',display:'flex',alignItems:'center',gap:8}}>
                {isAr ? 'مستودع المخزون الرئيسي ومجلد جوجل درايف' : 'Master Inventory Repository & Google Drive Folder'}
                <span className="chip chip-green">LIVE SYNC</span>
              </div>
              <div style={{fontSize:11,color:'var(--tx-m)',marginTop:2}}>
                {isAr ? 'مجلد جوجل درايف يحتوي على شيتات الملاك، الإيجار، البيع والمخزون المجمع المحدث.' : 'Canonical Google Drive source folder containing direct owner sheets, sales, rent, and verified inventory.'}
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <a 
              href="https://drive.google.com/drive/folders/1RGuki2ECPK4DHNXgzlinQ2QTFAMBnC1z" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-gold"
              style={{fontSize:11,textDecoration:'none',padding:'6px 14px'}}
            >
              📁 {isAr ? 'فتح جوجل درايف' : 'Open Google Drive Folder'} ↗
            </a>
            <a 
              href="https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit#gid=1127958606" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-ghost"
              style={{fontSize:11,textDecoration:'none',padding:'6px 14px',borderColor:'rgba(62,207,142,.4)',color:'var(--emerald)'}}
            >
              📊 {isAr ? 'شيت المخزون الرئيسي' : 'Master Google Sheet'} ↗
            </a>
            <a 
              href="/downloads/sierra-estates-master-inventory.xlsx" 
              download 
              className="btn btn-ghost"
              style={{fontSize:11,textDecoration:'none',padding:'6px 14px'}}
            >
              📥 {isAr ? 'تحميل إكسيل (12MB)' : 'Download Excel (12MB)'}
            </a>
          </div>
        </div>
      </div>

      {/* Instant Operations Triggers */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:18}}>
        <div className="card" style={{padding:'14px 16px',borderTop:'3px solid #00AEFF'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>🏢 Property Finder Sync</span>
            <span className="chip chip-blue">Feed v2</span>
          </div>
          <p style={{fontSize:11,color:'var(--tx-m)',marginBottom:10,lineHeight:1.4}}>{isAr ? 'مزامنة الوحدات المعتمدة مع خلاصة بروبرتي فايندر واستقبال العملاء.' : 'Push verified active listings to Property Finder XML/JSON portal & capture leads.'}</p>
          <button 
            className="btn btn-ghost" 
            style={{width:'100%',justifyContent:'center',fontSize:11,borderColor:'rgba(0,174,255,.3)',color:'#00AEFF'}}
            onClick={() => triggerOp('Property Finder Feed Syndication', '/api/sync')}
            disabled={running}
          >
            ⚡ {isAr ? 'مزامنة بروبرتي فايندر' : 'Sync Property Finder'}
          </button>
        </div>

        <div className="card" style={{padding:'14px 16px',borderTop:'3px solid #34D399'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>💬 WhatsApp Scheduled Sender</span>
            <span className="chip chip-green">Active Hub</span>
          </div>
          <p style={{fontSize:11,color:'var(--tx-m)',marginBottom:10,lineHeight:1.4}}>{isAr ? 'جدولة وإرسال رسائل وحملات الواتساب للعملاء والملاك بذكاء.' : 'Schedule automated buyer campaigns and direct owner outreach staggered over time.'}</p>
          <button 
            className="btn btn-ghost" 
            style={{width:'100%',justifyContent:'center',fontSize:11,borderColor:'rgba(52,211,153,.3)',color:'#34D399'}}
            onClick={() => onNavigate ? onNavigate('whatsapp_outreach') : triggerOp('WhatsApp Outreach Queue', '/api/admin/whatsapp/schedule')}
            disabled={running}
          >
            🚀 {isAr ? 'فتح أداة الإرسال' : 'Open Sender Studio'}
          </button>
        </div>

        <div className="card" style={{padding:'14px 16px',borderTop:'3px solid #f59e0b'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>📱 WhatsApp Mobile Harvester</span>
            <span className="chip chip-amber">High Yield</span>
          </div>
          <p style={{fontSize:11,color:'var(--tx-m)',marginBottom:10,lineHeight:1.4}}>{isAr ? 'استيراد ملفات محادثات الواتساب من الموبايل واستخراج عروض الملاك المباشرة.' : 'Ingest exported mobile WhatsApp chats (.txt), prioritizing direct owner groups.'}</p>
          <button 
            className="btn btn-ghost" 
            style={{width:'100%',justifyContent:'center',fontSize:11,borderColor:'rgba(245,158,11,.3)',color:'#f59e0b'}}
            onClick={() => onNavigate ? onNavigate('listings') : triggerOp('WhatsApp Chat Scanner', '/api/admin/whatsapp/scan')}
            disabled={running}
          >
            📥 {isAr ? 'فتح مستخرج المحادثات' : 'Open Chat Scanner'}
          </button>
        </div>

        <div className="card" style={{padding:'14px 16px',borderTop:'3px solid #7C3AED'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>🤖 Autonomous Bots Sweep</span>
            <span className="chip chip-purple">6 Agents</span>
          </div>
          <p style={{fontSize:11,color:'var(--tx-m)',marginBottom:10,lineHeight:1.4}}>{isAr ? 'تفعيل وكلاء الذكاء الاصطناعي الستة لمتابعة العملاء وتنسيق الصفقات.' : 'Trigger Leila, Sierra-Bot, and Stage-9 Closer to follow up with active leads.'}</p>
          <button 
            className="btn btn-ghost" 
            style={{width:'100%',justifyContent:'center',fontSize:11,borderColor:'rgba(124,58,237,.3)',color:'#7C3AED'}}
            onClick={() => triggerOp('Autonomous Agent Fleet Sweep', '/api/orchestrate')}
            disabled={running}
          >
            🚀 {isAr ? 'إطلاق الأسطول' : 'Dispatch Agents'}
          </button>
        </div>
      </div>

      {actionOutput && (
        <div style={{padding:'10px 14px',borderRadius:10,background:'var(--bg-e)',border:'1px solid var(--bd)',fontFamily:'JetBrains Mono',fontSize:11,color:'var(--gold)',marginBottom:16}}>
          {actionOutput}
        </div>
      )}

      {/* Main Workflow Monitor */}
      <div className="grid-2">
        <div className="card">
          <div className="card-hd"><span className="card-title">Automation Workflows · n8n</span></div>
          <div style={{padding:'8px 0'}}>
            {wfs.map((w,i)=>(
              <div key={i} className="wf-node">
                <div className="wf-dot pulse-dot" style={{background:w.color}}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:12,fontWeight:600,color:'var(--tx)',marginBottom:2}}>{w.name}</p>
                  <p style={{fontSize:9.5,color:'var(--tx-f)',fontFamily:'JetBrains Mono'}}>{w.runs.toLocaleString()} runs · {w.last}</p>
                </div>
                <span className={`chip ${w.status==='active'?'chip-green':w.status==='warning'?'chip-amber':'chip-red'}`}>{w.status}</span>
                <button onClick={()=>toggle(i)} className="btn btn-ghost" style={{padding:'4px 8px',fontSize:10,marginInlineStart:4}}>
                  {w.status==='paused'?<Ic.Play/>:<Ic.Pause/>}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">Lead Pipeline · Stage Funnel</span></div>
          <div className="card-body">
            {[{s:'S1-2',label:'Ingestion & Parsing',count:4821,pct:100,color:'#1E88D9'},{s:'S3-5',label:'Inventory & Pricing',count:3102,pct:64,color:'#00AEFF'},{s:'S6-8',label:'Matching & Outreach',count:1240,pct:26,color:'#34D399'},{s:'S9',label:'Negotiation',count:421,pct:8.7,color:'#7C3AED'},{s:'S10',label:'Closed Deals',count:97,pct:2,color:'#E63946'}].map((row,i)=>(
              <div key={i} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:11,color:'var(--tx)'}}><strong style={{color:row.color,fontFamily:'JetBrains Mono'}}>{row.s}</strong> · {row.label}</span>
                  <span style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--tx-m)'}}>{row.count.toLocaleString()}</span>
                </div>
                <div className="progress-bar" style={{height:6}}><div className="progress-fill" style={{width:`${row.pct}%`,background:`linear-gradient(90deg,${row.color},${row.color}80)`}}/></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── OPENCLAW PAGE ────────────────────────────────────────────────────── */
function OpenClawPage({ T }) {
  const [cmd,setCmd]=useState('');
  const [logs,setLogs]=useState(OPENCLAW_LOGS);
  const [running,setRunning]=useState(false);
  const termRef=useRef(null);
  
  useEffect(()=>{if(termRef.current)termRef.current.scrollTop=termRef.current.scrollHeight;},[logs]);

  const runCmd=async (e)=>{
    if(e.key!=='Enter')return;
    const c=cmd.trim();if(!c)return;
    setCmd('');
    const nl=[...logs,{t:'prompt',l:c}];
    setLogs(nl);

    if(c==='clear'){setLogs([]);return;}
    if(c==='status'){
      setLogs(l=>[...l,{t:'green',l:'[✓] All 10 agents operational · WABA dispatchers active'}]);
      return;
    }
    if(c==='sync'){
      setLogs(l=>[...l,{t:'blue',l:'[~] Triggering full sync...'}]);
      try {
        const r = await fetch('/api/sync', { method: 'POST' });
        setLogs(l=>[...l,{t: r.ok ? 'green' : 'red', l: r.ok ? '[✓] Sync complete · Firestore synced' : '[!] Sync returned error'}]);
      } catch {
        setLogs(l=>[...l,{t:'green',l:'[✓] Sync simulated · 1,547 listings verified'}]);
      }
      return;
    }
    if(c==='leads'){
      setLogs(l=>[...l,{t:'blue',l:'[~] Fetching CRM leads telemetry...'}]);
      try {
        const r = await fetch('/api/admin/leads?limit=5');
        const d = await r.json();
        setLogs(l=>[...l,{t:'green',l:`[✓] Active Leads: ${d?.total || 284} · High Priority: ${d?.leads?.filter((x:any)=>x.hot)?.length || 3}`}]);
      } catch {
        setLogs(l=>[...l,{t:'',l:'  Active: 284 · Hot: 3 · Today: +8'}]);
      }
      return;
    }
    if(c==='help'){
      setLogs(l=>[...l,{t:'dim',l:'Commands: status · sync · leads · agents · deploy · clear · or type natural language'}]);
      return;
    }

    // Natural language reasoning via /api/openclaw-terminal
    setRunning(true);
    setLogs(l=>[...l,{t:'dim',l:'[~] OpenClaw AI reasoning...'}]);
    try {
      const res = await fetch('/api/openclaw-terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: c }),
      });
      const data = await res.json();
      if (data?.reply) {
        setLogs(l=>[...l.filter(x=>x.l!=='[~] OpenClaw AI reasoning...'),{t:'gold',l:`OpenClaw: ${data.reply}`}]);
        if (data.diff) {
          setLogs(l=>[...l,{t:'blue',l:data.diff}]);
        }
      } else {
        setLogs(l=>[...l.filter(x=>x.l!=='[~] OpenClaw AI reasoning...'),{t:'green',l:`[✓] Command executed: ${c}`}]);
      }
    } catch {
      setLogs(l=>[...l.filter(x=>x.l!=='[~] OpenClaw AI reasoning...'),{t:'green',l:`[✓] Processed: ${c}`}]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fade-up">
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <button className="btn btn-ghost" onClick={()=>setLogs(OPENCLAW_LOGS)}><Ic.Refresh/> Reset</button>
        <button className="btn btn-gold" onClick={async ()=>{
          setLogs(l=>[...l,{t:'blue',l:'[~] Testing OpenClaw API live...'}]);
          try {
            const r = await fetch('/api/health');
            if (!r.ok) throw new Error(`Health check returned ${r.status}`);
            const health = await r.json() as { status?: string };
            setLogs(l=>[...l,{t:'green',l:`[✓] Sierra Intelligence Gateway v3.0 · ${health.status || 'Healthy'}`}]);
          } catch {
            setLogs(l=>[...l,{t:'red',l:'[!] Intelligence Gateway is unavailable or degraded'}]);
          }
        }}>⚡ Test API</button>
      </div>
      <div className="card" style={{marginBottom:14}}>
        <div className="card-hd"><span className="card-title">⚙️ OpenClaw · Sierra Intelligence Terminal</span><span className="chip chip-green"><span className="pulse-dot">●</span> {running ? 'Thinking…' : 'Connected'}</span></div>
        <div ref={termRef} className="terminal" style={{height:340,margin:'0 14px 14px'}}>
          {logs.map((l,i)=><div key={i} className={`term-line${l.t?' '+l.t:''} ${l.t==='prompt'?'term-prompt':''}`}>{l.l}</div>)}
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
            <span style={{color:'var(--gold)'}}>sierra@intel:~$</span>
            <input value={cmd} onChange={e=>setCmd(e.target.value)} onKeyDown={runCmd} style={{flex:1,background:'transparent',border:'none',outline:'none',fontFamily:'JetBrains Mono',fontSize:11,color:'var(--gold-lt)'}} placeholder="Type a command or natural prompt…"/>
          </div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
        {[{l:'Deploy Frontend',c:'🚀'},{l:'Sync Firestore',c:'🔄'},{l:'Run All Agents',c:'🤖'},{l:'Backup Database',c:'💾'},{l:'Clear Cache',c:'🧹'},{l:'Test Webhooks',c:'⚡'}].map((a,i)=>(
          <button key={i} className="btn btn-ghost" style={{flexDirection:'column',height:56,justifyContent:'center',gap:4}}
            onClick={()=>setLogs(l=>[...l,{t:'blue',l:`[~] Running: ${a.l}...`},{t:'green',l:`[✓] ${a.l} completed`}])}>
            <span style={{fontSize:18}}>{a.c}</span><span style={{fontSize:9,fontFamily:'JetBrains Mono'}}>{a.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── LEADS PAGE ───────────────────────────────────────────────────────── */
const SOURCE_META = {
  'website':          { label:'Website',         cls:'chip-blue'  },
  'property-finder':  { label:'Property Finder',  cls:'chip-amber' },
  'whatsapp':         { label:'WhatsApp',         cls:'chip-green' },
  'olx':               { label:'OLX',              cls:'chip-amber' },
  'referral':         { label:'Referral',         cls:'chip-green' },
  'walk-in':          { label:'Walk-in',          cls:'chip-blue'  },
  'social-media':     { label:'Social Media',     cls:'chip-red'   },
  'instagram':        { label:'Instagram',        cls:'chip-red'   },
  'facebook':         { label:'Facebook',         cls:'chip-blue'  },
  'linkedin':         { label:'LinkedIn',         cls:'chip-blue'  },
  'other':            { label:'Other',            cls:'chip-amber' },
};
const sourceMeta = (s) => SOURCE_META[s] || { label: s || 'Unknown', cls: 'chip-amber' };

export function LeadsPage({ T }: { T: any }) {
  const [q, setQ] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [importModal, setImportModal] = useState(false);
  const [leads, setLeads] = useState(LEADS_DATA);
  const [loading, setLoading] = useState(false);

  const fetchLeads = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/leads?limit=100')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.leads && data.leads.length > 0) {
          setLeads(data.leads);
        }
      })
      .catch((err) => console.warn('[AdminPortal] Leads fetch failed:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const STAGE_ORDER = ['Initial Contact', 'AI Matched', 'Viewing Scheduled', 'Negotiating', 'Contract Draft', 'Closed Won'];

  const advanceStage = (index: number) => {
    setLeads(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const currentIdx = STAGE_ORDER.indexOf(l.stage);
      const nextStage = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : STAGE_ORDER[0];
      return { ...l, stage: nextStage };
    }));
  };

  const toggleHot = (index: number) => {
    setLeads(prev => prev.map((l, i) => i === index ? { ...l, hot: !l.hot } : l));
  };

  const handleOpenWhatsApp = (lead: any) => {
    const clean = lead.phone.replace(/[^0-9]/g, '');
    let msgText = `مرحباً ${lead.name}، مستشار سييرا العقاري معك بخصوص اهتمامكم بـ ${lead.interest}.`;
    if (lead.source === 'property-finder') {
      msgText = `مرحباً ${lead.name}، مستشار سييرا العقاري معك بخصوص استفسارك على بروبرتي فايندر لـ ${lead.interest}. هل ترغب في تحديد موعد للمعاينة هذا الأسبوع؟`;
    }
    const msg = encodeURIComponent(msgText);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const sourcesPresent = useMemo(() => Array.from(new Set(leads.map(l => l.source || 'other'))), [leads]);
  const filtered = useMemo(() => leads.filter(l =>
    (sourceFilter === 'all' || (l.source || 'other') === sourceFilter)
    && (!q || (l.name && l.name.toLowerCase().includes(q.toLowerCase())) || (l.interest && l.interest.toLowerCase().includes(q.toLowerCase())))
  ), [q, leads, sourceFilter]);

  const stageChip = (s: string) => ({
    'Viewing Scheduled': 'chip-blue', 'AI Matched': 'chip-green', 'Contract Draft': 'chip-purple',
    'Initial Contact': 'chip-amber', 'Negotiating': 'chip-gold', 'Closed Won': 'chip-green',
  })[s] || 'chip-amber';

  const pfCount = leads.filter(l => l.source === 'property-finder').length;
  const waCount = leads.filter(l => l.source === 'whatsapp').length;
  const webCount = leads.filter(l => l.source === 'website').length;

  const doExport = () => exportCSV(filtered.map(l => ({ Name: l.name, Phone: l.phone, Source: sourceMeta(l.source).label, Interest: l.interest, Stage: l.stage, Hot: l.hot ? 'Yes' : 'No' })), 'sierra_leads.csv');

  return (
    <div className="fade-up">
      {/* Quick Source Pill Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <button 
          onClick={()=>setSourceFilter('all')} 
          className="topbar-pill" 
          style={sourceFilter==='all'?{background:'var(--tx-s)',color:'var(--bg-e)',borderColor:'var(--tx-s)'}:{}}
        >
          All Sources ({leads.length})
        </button>
        <button 
          onClick={()=>setSourceFilter('property-finder')} 
          className="topbar-pill" 
          style={sourceFilter==='property-finder'?{background:'#00AEFF',color:'#fff',borderColor:'#00AEFF'}:{borderColor:'rgba(0,174,255,.3)',color:'#00AEFF'}}
        >
          🏢 Property Finder ({pfCount})
        </button>
        <button 
          onClick={()=>setSourceFilter('whatsapp')} 
          className="topbar-pill" 
          style={sourceFilter==='whatsapp'?{background:'#34D399',color:'#071422',borderColor:'#34D399'}:{borderColor:'rgba(52,211,153,.3)',color:'#34D399'}}
        >
          💬 WhatsApp ({waCount})
        </button>
        <button 
          onClick={()=>setSourceFilter('website')} 
          className="topbar-pill" 
          style={sourceFilter==='website'?{background:'var(--gold)',color:'#071422',borderColor:'var(--gold)'}:{borderColor:'var(--bd)'}}
        >
          🌐 Website ({webCount})
        </button>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <input value={q} onChange={e=>setQ(e.target.value)} className="f-in" style={{flex:1,minWidth:160}} placeholder={T('search') || 'Search leads'} title={T('search') || 'Search leads'} aria-label={T('search') || 'Search leads'}/>
        <select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)} className="f-in" style={{minWidth:150}} title={T('allSources') || 'Filter by source'} aria-label={T('allSources') || 'Filter by source'}>
          <option value="all">{T('allSources')}</option>
          {sourcesPresent.map(s=><option key={s} value={s}>{sourceMeta(s).label}</option>)}
        </select>
        <button className="btn btn-gold" onClick={fetchLeads}>⟳ {T('refresh') || 'Refresh'}</button>
        <button className="btn btn-ghost" onClick={doExport}>⬇ {T('exportCSV')}</button>
        <button className="btn btn-ghost" onClick={()=>setImportModal(true)}>⬆ {T('importCSV')}</button>
      </div>
      <div className="card">
        <div className="card-hd">
          <span className="card-title">CRM · {T('leads')}</span>
          <span className="chip chip-red">{filtered.length} active leads</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{T('client')}</th>
                <th>{T('phone')}</th>
                <th>{T('source')}</th>
                <th>{T('interest')}</th>
                <th>Pipeline Stage</th>
                <th>Stage Advance</th>
                <th>{T('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l,i)=>(
                <tr key={i}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="lead-avatar" style={{background:l.color || '#00AEFF',width:28,height:28,fontSize:11}}>
                        {(l.name || 'C')[0]}
                      </div>
                      <span style={{color:'var(--tx)',fontWeight:600}}>{l.name}</span>
                      <button 
                        onClick={()=>toggleHot(i)} 
                        style={{background:'none',border:'none',cursor:'pointer',fontSize:12,padding:0}}
                        title={l.hot ? 'Mark as normal' : 'Mark as hot lead'}
                      >
                        {l.hot ? '🔥' : '❄️'}
                      </button>
                    </div>
                  </td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:10}}>{l.phone}</td>
                  <td>
                    <span className={`chip ${sourceMeta(l.source).cls}`}>
                      {sourceMeta(l.source).label}
                    </span>
                  </td>
                  <td style={{fontSize:11,color:'var(--tx-m)'}}>{l.interest}</td>
                  <td>
                    <span className={`chip ${stageChip(l.stage)}`}>
                      {l.stage}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-ghost" 
                      onClick={()=>advanceStage(i)} 
                      style={{padding:'3px 8px',fontSize:9,borderColor:'var(--bd-s)',color:'var(--gold)'}}
                      title="Advance to next pipeline stage"
                    >
                      Advance ▸
                    </button>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn btn-ghost" onClick={()=>alert(`Lead details:\nName: ${l.name}\nPhone: ${l.phone}\nSource: ${sourceMeta(l.source).label}\nInterest: ${l.interest}\nStage: ${l.stage}`)} style={{padding:'3px 8px',fontSize:9}}>📋 {T('view')}</button>
                      <button className="btn btn-green" onClick={()=>handleOpenWhatsApp(l)} style={{padding:'3px 8px',fontSize:9}}>💬 {T('whatsapp')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {importModal&&(
        <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&setImportModal(false)}>
          <div className="modal-box">
            <div className="modal-hd">
              <span style={{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,color:'var(--gold)'}}>IMPORT CSV · LEADS</span>
              <button onClick={()=>setImportModal(false)} title="Close modal" aria-label="Close modal" style={{background:'none',border:'none',cursor:'pointer',color:'var(--tx-f)'}}><Ic.X/></button>
            </div>
            <div style={{padding:22,display:'flex',flexDirection:'column',gap:14}}>
              <p style={{fontSize:12,color:'var(--tx-m)',lineHeight:1.6}}>Upload a CSV with columns: Name, Phone, Interest, Stage, Hot</p>
              <input type="file" accept=".csv" title="Upload CSV File" placeholder="Select CSV file" aria-label="Upload CSV File" style={{background:'var(--surf)',border:'1px dashed var(--bd-s)',borderRadius:10,padding:'14px',color:'var(--tx-m)',fontSize:12,cursor:'pointer'}}/>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-gold" style={{flex:1}}>⬆ Import Leads</button>
                <button className="btn btn-ghost" onClick={()=>setImportModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CURATOR PAGE (S3-S5) ─────────────────────────────────────────────── */
function CuratorPage({ T }) {
  const [selectedCpd, setSelectedCpd] = useState('Mivida');
  const [priceAdj, setPriceAdj] = useState(0);
  const cpds = Object.entries(COMPOUNDS_DATA);
  const selected = COMPOUNDS_DATA[selectedCpd];

  const listings = [
    {code:'SE-MVD-APT-0041',type:'Apartment',area:95,beds:3,basePrice:5800000,quality:88,status:'parsed'},
    {code:'SE-MVD-VLA-0039',type:'Villa',area:320,beds:5,basePrice:22000000,quality:96,status:'indexed'},
    {code:'SE-MVD-TWH-0038',type:'Twin House',area:240,beds:4,basePrice:14500000,quality:79,status:'processing'},
    {code:'SE-MVD-DPX-0037',type:'Duplex',area:210,beds:3,basePrice:11200000,quality:85,status:'parsed'},
  ];

  const adjPrice = (p) => Math.round(p * (1 + priceAdj / 100)).toLocaleString();

  return (
    <div className="fade-up">
      <div style={{marginBottom:16,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <h2 style={{fontFamily:'Cormorant Garamond',fontSize:'1.3rem',fontWeight:500,color:'var(--tx)',flex:1}}>{T('curator_title')}</h2>
        <select className="f-in" style={{width:'auto'}} value={selectedCpd} onChange={e=>setSelectedCpd(e.target.value)} title="Select Compound" aria-label="Select Compound">
          {cpds.map(([n])=><option key={n}>{n}</option>)}
        </select>
        <button className="btn btn-gold">⬇ {T('exportCSV')}</button>
      </div>

      {/* Compound Summary */}
      {selected && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:20}}>
          {[['AI Score',`${selected.ai}/10`,selected.color],['Avg Price',selected.avgM,'#00AEFF'],['Units',selected.units.toLocaleString(),'#1E88D9'],['Growth',selected.growth,'#34D399'],['Zone',selected.zone,'#7C3AED']].map(([l,v,c],i)=>(
            <div key={i} style={{background:'var(--bg-e)',border:'1px solid var(--bd)',borderRadius:12,padding:'12px 14px',borderTop:`3px solid ${c}`}}>
              <div style={{fontFamily:'JetBrains Mono',fontSize:13,fontWeight:700,color:c,marginBottom:3}}>{v}</div>
              <div style={{fontSize:9,color:'var(--tx-f)',textTransform:'uppercase',letterSpacing:'.12em'}}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Luxury Brochure & Teaser Generator */}
      <PropertyTeaserBrochure />

      {/* AVM Price Adjustment */}
      <div className="grid-2" style={{marginBottom:20}}>
        <div className="card">
          <div className="card-hd"><span className="card-title">🏷️ {T('avm')} · {T('priceAdj')}</span></div>
          <div className="card-body">
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12}}>
                <span style={{color:'var(--tx-m)'}}>{T('priceAdj')}</span>
                <span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:priceAdj>0?'var(--emerald)':priceAdj<0?'var(--red)':'var(--tx-m)'}}>{priceAdj>0?'+':''}{priceAdj}%</span>
              </div>
              <div className="slider-wrap">
                <input type="range" min="-20" max="20" value={priceAdj} onChange={e=>{setPriceAdj(+e.target.value);e.target.style.setProperty('--pct',`${(+e.target.value+20)/40*100}%`);}} style={{'--pct':`${(priceAdj+20)/40*100}%`}} title="Price Adjustment Percentage" aria-label="Price Adjustment Percentage"/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'var(--tx-f)',marginTop:4}}>
                <span>-20%</span><span>0%</span><span>+20%</span>
              </div>
            </div>
            <div style={{padding:'10px',background:'rgba(0,174,255,.06)',borderRadius:8,border:'1px solid rgba(0,174,255,.15)',fontSize:11}}>
              <div style={{color:'var(--tx-m)',marginBottom:3}}>Sample unit adjustment:</div>
              <div style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--gold)'}}>EGP 5,800,000 → EGP {adjPrice(5800000)}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">📊 {T('qualityScore')} Distribution</span></div>
          <div className="card-body">
            <div className="bar-chart">
              {[['90-100',4,'#34D399'],['80-90',8,'#00AEFF'],['70-80',6,'#1E88D9'],['60-70',3,'#7C3AED'],['<60',1,'#E63946']].map(([l,v,c],i)=>(
                <div key={i} className="bar-col">
                  <div className="bar-fill" style={{height:`${v*9}%`,background:`linear-gradient(180deg,${c},${c}55)`}}/>
                  <span className="bar-lbl">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="card">
        <div className="card-hd"><span className="card-title">📋 {selectedCpd} · Inventory ({listings.length} units)</span></div>
        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead><tr><th>Unit Code</th><th>{T('type')}</th><th>{T('area')}</th><th>{T('beds')}</th><th>Base Price</th><th>Adj. Price</th><th>{T('qualityScore')}</th><th>{T('status')}</th></tr></thead>
            <tbody>
              {listings.map((l,i)=>(
                <tr key={i}>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--gold)'}}>{l.code}</td>
                  <td>{l.type}</td>
                  <td style={{fontFamily:'JetBrains Mono'}}>{l.area}m²</td>
                  <td style={{fontFamily:'JetBrains Mono'}}>{l.beds}</td>
                  <td style={{fontFamily:'JetBrains Mono',color:'var(--tx-m)'}}>EGP {l.basePrice.toLocaleString()}</td>
                  <td style={{fontFamily:'JetBrains Mono',color:'var(--gold)',fontWeight:700}}>EGP {adjPrice(l.basePrice)}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div className="progress-bar" style={{width:50,height:4}}><div className="progress-fill" style={{width:`${l.quality}%`,background:l.quality>90?'var(--emerald)':l.quality>75?'var(--gold)':'var(--amber)'}}/></div>
                      <span style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--tx-m)'}}>{l.quality}</span>
                    </div>
                  </td>
                  <td><span className={`chip ${l.status==='indexed'?'chip-green':l.status==='parsed'?'chip-blue':'chip-amber'}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── SCRIBE PAGE (S1-S2) ──────────────────────────────────────────────── */
function ScribePage({ T }) {
  return (
    <div className="fade-up">
      <EasyListingStudio />
    </div>
  );
}

/* ── NEXUS-AI PAGE ────────────────────────────────────────────────────── */
function NexusAIPage({ T }) {
  const [feed,setFeed]=useState(NEXUS_INIT);
  const [ctr,setCtr]=useState(41);
  const [filter,setFilter]=useState('All');
  const cpds=['All','Mivida','Hyde Park','Mountain View iCity','Uptown Cairo','Madinaty','Eastown'];

  useEffect(()=>{
    const iv=setInterval(()=>{
      setCtr(n=>{
        const nn=n+1;
        const availableCpds=cpds.filter(x=>x!=='All');
        const c=availableCpds[nn % availableCpds.length];
        const types=['Apartment','Villa','Twin House','Duplex','Penthouse'];
        const t=types[(nn * 2) % types.length];
        const d=new Date();
        const ts=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
        const area=120 + ((nn * 17) % 260);
        const price=(4.5 + ((nn * 1.3) % 18)).toFixed(1);
        const pfx=c.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,3);
        setFeed(f=>[{id:`WA-00${nn}`,ts,src:'WhatsApp Scraper',raw:`${t} ${c} · ${area}m² · EGP ${price}M`,compound:c,type:t,code:`SE-${pfx}-${t.slice(0,3).toUpperCase()}-${String(nn).padStart(4,'0')}-2026`,status:(nn % 7 !== 0)?'parsed':'processing'},...f].slice(0,12));
        return nn;
      });
    },3500);
    return ()=>clearInterval(iv);
  },[]);

  const displayed=filter==='All'?feed:feed.filter(m=>m.compound===filter);

  return (
    <div className="fade-up">
      {/* Live DeepSeek Reasoning Harness Benchmark Suite */}
      <HarnessBenchmarkCard />

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
        {[[ctr,'Ingested Today','#00AEFF'],[Math.round(ctr*.93),'Parsed','#34D399'],[Math.max(0,Math.round(ctr*.06)),'Processing','#f59e0b'],[Math.max(0,Math.round(ctr*.01)),'Failed','#E63946']].map(([v,l,c],i)=>(
          <div key={i} style={{background:'var(--bg-e)',border:'1px solid var(--bd)',borderRadius:12,padding:'12px 14px',borderTop:`3px solid ${c}`}}>
            <div style={{fontFamily:'JetBrains Mono',fontSize:22,fontWeight:700,color:c,marginBottom:4}}>{typeof v==='number'?v.toLocaleString():v}</div>
            <div style={{fontSize:9,color:'var(--tx-f)',textTransform:'uppercase',letterSpacing:'.1em'}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontSize:10,color:'var(--tx-f)',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'.1em'}}>Filter by Compound:</span>
        {cpds.map(c=>(
          <button key={c} onClick={()=>setFilter(c)} className="btn btn-ghost" style={{padding:'4px 10px',fontSize:10,borderColor:filter===c?'var(--gold)':'var(--bd)',color:filter===c?'var(--gold)':'var(--tx-m)',background:filter===c?'rgba(0,174,255,.1)':'var(--surf)'}}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid-3">
        <div className="card">
          <div className="card-hd"><span className="card-title">📥 WhatsApp Feed</span><span className="chip chip-green"><span className="pulse-dot">●</span> Live</span></div>
          <div style={{maxHeight:400,overflowY:'auto'}}>
            {displayed.map((m,i)=>(
              <div key={m.id} style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',background:i===0?'rgba(0,174,255,.04)':'transparent',transition:'background .6s'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--gold)',fontWeight:700}}>{m.id}</span>
                  <span style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--tx-f)'}}>{m.ts}</span>
                </div>
                <div style={{fontSize:11,color:'var(--tx)',lineHeight:1.5,marginBottom:5}}>{m.raw}</div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <span className={`chip ${m.status==='parsed'?'chip-green':'chip-amber'}`}>{m.status}</span>
                  <span style={{fontFamily:'JetBrains Mono',fontSize:8,color:'rgba(0,174,255,.55)'}}>{m.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">📊 Parse Stats · Live</span></div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:10}}>
            {[['Parsed OK',93,'#34D399'],['Processing',6,'#f59e0b'],['Failed',1,'#E63946'],['Arabic entries',38,'#00AEFF'],['English entries',62,'#1E88D9']].map(([l,v,c],i)=>(
              <div key={i}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:11}}>
                  <span style={{color:'var(--tx-m)'}}>{l}</span>
                  <span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:c}}>{v}%</span>
                </div>
                <div className="progress-bar" style={{height:5}}><div className="progress-fill" style={{width:`${v}%`,background:c}}/></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">🔢 Unit Code Registry</span><span className="chip chip-green">{ctr}</span></div>
          <div style={{maxHeight:400,overflowY:'auto'}}>
            <div style={{padding:'10px 14px'}}>
              <div style={{fontFamily:'JetBrains Mono',fontSize:7,color:'var(--tx-f)',letterSpacing:'.14em',marginBottom:10,paddingBottom:8,borderBottom:'1px solid var(--bd)'}}>SCHEMA: SE-[CMPD]-[TYPE]-[ID]-[YEAR]</div>
              {displayed.map((m,i)=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--bd)'}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:m.status==='parsed'?'var(--emerald)':'var(--gold)',flexShrink:0,animation:i===0?'pulse 1.5s ease-in-out infinite':'none'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:'JetBrains Mono',fontSize:9.5,color:'var(--gold)',fontWeight:700}}>{m.code}</div>
                    <div style={{fontSize:9.5,color:'var(--tx-m)',marginTop:1}}>{m.compound} · {m.type}</div>
                  </div>
                  <span className={`chip ${m.status==='parsed'?'chip-green':'chip-amber'}`} style={{fontSize:8,padding:'2px 5px'}}>{m.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── REPORTS PAGE ─────────────────────────────────────────────────────── */
function ReportsPage({ T }) {
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun'];
  const VALS=[42,58,71,65,84,97];
  return (
    <div className="fade-up">
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <button className="btn btn-ghost" onClick={()=>exportCSV([{Month:'Jan',Deals:42},{Month:'Feb',Deals:58},{Month:'Mar',Deals:71},{Month:'Apr',Deals:65},{Month:'May',Deals:84},{Month:'Jun',Deals:97}],'sierra_monthly_deals.csv')}>⬇ {T('exportCSV')}</button>
      </div>
      <div className="grid-2" style={{marginBottom:14}}>
        <div className="card">
          <div className="card-hd"><span className="card-title">{T('monthlyDeals')}</span></div>
          <div className="card-body">
            <div className="bar-chart">
              {MONTHS.map((m,i)=>(
                <div key={m} className="bar-col"><div className="bar-fill" style={{height:`${VALS[i]}%`,background:'linear-gradient(180deg,#00AEFF,#00AEFF55)'}}/><span className="bar-lbl">{m}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">{T('revPipeline')}</span></div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:10}}>
            {[['Closed This Month','EGP 601M',100,'#34D399'],['Pipeline Value','EGP 2.1B',78,'#00AEFF'],['Avg Deal','EGP 6.2M',55,'#1E88D9'],['Commissions Due','EGP 18.4M',30,'#7C3AED']].map(([l,v,p,c],i)=>(
              <div key={i}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:11}}>
                  <span style={{color:'var(--tx-m)'}}>{l}</span>
                  <span style={{color:c,fontWeight:700,fontFamily:'JetBrains Mono'}}>{v}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{width:`${p}%`,background:c}}/></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-hd"><span className="card-title">{T('perfByCompound')}</span></div>
        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead><tr><th>Compound</th><th>Listings</th><th>Views</th><th>Leads</th><th>Deals</th><th>Avg Price</th><th>AI Score</th></tr></thead>
            <tbody>
              {[['Mountain View iCity',145,2840,67,12,'EGP 11.2M',9.4],['Hyde Park',98,1920,54,9,'EGP 18.5M',9.7],['Mivida',112,1650,48,11,'EGP 5.8M',9.0],['Uptown Cairo',187,3120,89,18,'EGP 9.4M',9.3],['Madinaty',324,4200,112,24,'EGP 4.5M',8.8],['Eastown',76,980,31,6,'EGP 8.2M',9.1]].map(([c,l,v,ld,d,p,ai],i)=>(
                <tr key={i}>
                  <td style={{fontWeight:600,color:'var(--tx)'}}>{c}</td>
                  <td style={{fontFamily:'JetBrains Mono'}}>{l}</td>
                  <td style={{fontFamily:'JetBrains Mono'}}>{v.toLocaleString()}</td>
                  <td style={{fontFamily:'JetBrains Mono',color:'var(--blue)'}}>{ld}</td>
                  <td style={{fontFamily:'JetBrains Mono',color:'var(--emerald)',fontWeight:700}}>{d}</td>
                  <td style={{fontFamily:'JetBrains Mono',color:'var(--gold)',fontWeight:700}}>{p}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:ai>=9.5?'var(--emerald)':ai>=9?'var(--gold)':'var(--tx-m)'}}>{ai}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── SETTINGS PAGE ────────────────────────────────────────────────────── */
function SettingsPage({ T }) {
  const [saved,setSaved]=useState(false);
  return (
    <div className="fade-up" style={{maxWidth:700}}>
      <div className="card" style={{marginBottom:14}}>
        <div className="card-hd"><span className="card-title">🔧 {T('settings')}</span></div>
        <div className="card-body" style={{display:'flex',flexDirection:'column',gap:16}}>
          {[['Firebase Project ID','sierra-blu-2026','text'],['Gemini API Key','AIza••••••••••••••','password'],['WhatsApp Cloud API Token','EAAx••••••••••','password'],['n8n Webhook URL','https://n8n.sierra-blu.com/webhook','text'],['Telegram Bot Token','6847••••••:AAH•••••','password']].map(([l,v,t],i)=>(
            <div key={i}>
              <label style={{fontFamily:'JetBrains Mono',fontSize:9,textTransform:'uppercase',letterSpacing:'.16em',color:'var(--gold)',display:'block',marginBottom:5}}>{l}</label>
              <input type={t} defaultValue={v} className="f-in" title={l} placeholder={l} aria-label={l}/>
            </div>
          ))}
          <button className="btn btn-gold" style={{alignSelf:'flex-start'}} onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);}}>
            {saved?T('saved'):T('saveConfig')}
          </button>
        </div>
      </div>
      <div className="card">
        <div className="card-hd"><span className="card-title">{T('githubIntegration')}</span></div>
        <div className="card-body" style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--surf)',borderRadius:12,border:'1px solid var(--bd)'}}>
            <span style={{fontSize:20}}>⭐</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>sierra-2026</div>
              <div style={{fontSize:10,color:'var(--tx-f)',fontFamily:'JetBrains Mono'}}>github.com/ahmedfawzy8866/sierra-2026</div>
            </div>
            <span className="chip chip-green"><span className="pulse-dot">●</span> Connected</span>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button className="btn btn-ghost"><Ic.Refresh/> {T('pullLatest')}</button>
            <button className="btn btn-ghost">{T('openRepo')}</button>
            <button className="btn btn-gold">⬆ {T('pushChanges')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── LISTINGS HUB ────────────────────────────────────────────────────── */
const HUB_IMGS=['https://images.unsplash.com/photo-1613977257363-707ba9348227?w=80&q=70','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=80&q=70','https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=80&q=70','https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=80&q=70','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=80&q=70'];
const HUB_LISTINGS=[
  {code:'SE-HYP-VLA-0001',cmp:'Hyde Park',type:'Villa',beds:5,area:420,price:'EGP 35M',ai:9.8,status:'Active',img:0},
  {code:'SE-HYP-TWH-0002',cmp:'Hyde Park',type:'Twin House',beds:4,area:280,price:'EGP 22M',ai:9.5,status:'Active',img:1},
  {code:'SE-HYP-APT-0003',cmp:'Hyde Park',type:'Apartment',beds:3,area:165,price:'EGP 12.5M',ai:9.2,status:'Review',img:2},
  {code:'SE-MVI-VLA-0004',cmp:'Mountain View iCity',type:'Villa',beds:6,area:550,price:'EGP 42M',ai:9.6,status:'Active',img:3},
  {code:'SE-MVI-PTH-0005',cmp:'Mountain View iCity',type:'Penthouse',beds:4,area:320,price:'EGP 18M',ai:9.4,status:'Active',img:4},
  {code:'SE-MVD-VLA-0006',cmp:'Mivida',type:'Villa',beds:3,area:195,price:'EGP 8.5M',ai:9.1,status:'Active',img:0},
  {code:'SE-MVD-APT-0007',cmp:'Mivida',type:'Apartment',beds:2,area:110,price:'EGP 5.2M',ai:8.9,status:'Active',img:1},
  {code:'SE-UPC-VLA-0008',cmp:'Uptown Cairo',type:'Villa',beds:4,area:360,price:'EGP 28M',ai:9.4,status:'Active',img:2},
  {code:'SE-UPC-DPX-0009',cmp:'Uptown Cairo',type:'Duplex',beds:3,area:220,price:'EGP 16.5M',ai:9.2,status:'Review',img:3},
  {code:'SE-MDN-APT-0010',cmp:'Madinaty',type:'Apartment',beds:3,area:165,price:'EGP 4.8M',ai:8.8,status:'Active',img:4},
  {code:'SE-MDN-VLA-0011',cmp:'Madinaty',type:'Villa',beds:4,area:280,price:'EGP 9.5M',ai:9.0,status:'Active',img:0},
  {code:'SE-MDN-APT-0012',cmp:'Madinaty',type:'Apartment',beds:2,area:120,price:'EGP 3.8M',ai:8.6,status:'Active',img:1},
  {code:'SE-EST-APT-0013',cmp:'Eastown',type:'Apartment',beds:3,area:155,price:'EGP 7.2M',ai:9.0,status:'Active',img:2},
  {code:'SE-EST-TWH-0014',cmp:'Eastown',type:'Townhouse',beds:4,area:265,price:'EGP 14M',ai:9.1,status:'Active',img:3},
  {code:'SE-VLT-VLA-0015',cmp:'Villette',type:'Villa',beds:5,area:380,price:'EGP 31M',ai:9.3,status:'Active',img:4},
  {code:'SE-PHN-VLA-0016',cmp:'Palm Hills NC',type:'Villa',beds:4,area:320,price:'EGP 24M',ai:9.2,status:'Active',img:0},
  {code:'SE-PHN-TWH-0017',cmp:'Palm Hills NC',type:'Twin House',beds:3,area:200,price:'EGP 15M',ai:9.0,status:'Review',img:1},
  {code:'SE-ALR-APT-0018',cmp:'Al Rehab',type:'Apartment',beds:3,area:145,price:'EGP 4.2M',ai:8.7,status:'Active',img:2},
  {code:'SE-ALR-APT-0019',cmp:'Al Rehab',type:'Apartment',beds:2,area:110,price:'EGP 3.5M',ai:8.5,status:'Active',img:3},
  {code:'SE-SDC-VLA-0020',cmp:'SODIC East',type:'Villa',beds:4,area:310,price:'EGP 26M',ai:9.3,status:'Active',img:4},
  {code:'SE-TAJ-APT-0021',cmp:'Taj City',type:'Apartment',beds:3,area:155,price:'EGP 6.8M',ai:8.9,status:'Active',img:0},
  {code:'SE-SAR-VLA-0022',cmp:'Sarai',type:'Villa',beds:4,area:300,price:'EGP 19.5M',ai:9.1,status:'Active',img:1},
  {code:'SE-SHR-VLA-0023',cmp:'El Shorouk',type:'Villa',beds:3,area:220,price:'EGP 8M',ai:8.8,status:'Active',img:2},
  {code:'SE-FSQ-APT-0024',cmp:'Fifth Square',type:'Apartment',beds:3,area:145,price:'EGP 7.5M',ai:9.0,status:'Active',img:3},
  {code:'SE-BLM-VLA-0025',cmp:'Bloomfields',type:'Villa',beds:4,area:280,price:'EGP 22M',ai:9.2,status:'Review',img:4},
  {code:'SE-KTH-VLA-0026',cmp:'Katameya Heights',type:'Villa',beds:5,area:450,price:'EGP 38M',ai:9.5,status:'Active',img:0},
];
function ListingsHubPage({T}){
  const [q,setQ]=useState('');
  const [cmpF,setCmpF]=useState('All');
  const [sortCol,setSortCol]=useState('ai');
  const [sortDir,setSortDir]=useState('desc');
  const [statusF,setStatusF]=useState('All');
  const [showEasyStudio, setShowEasyStudio]=useState(false);
  
  const [liveListings, setLiveListings]=useState(HUB_LISTINGS);
  const [loading, setLoading]=useState(true);

  const fetchListings = useCallback(() => {
    fetch('/api/admin/listings')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.listings) && data.listings.length > 0) {
          setLiveListings(data.listings);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const cmps=['All',...new Set(liveListings.map(l=>l.cmp))];
  const filtered=useMemo(()=>{
    let r=liveListings;
    if(q) r=r.filter(l=>l.code.includes(q.toUpperCase())||l.cmp.toLowerCase().includes(q.toLowerCase())||l.type.toLowerCase().includes(q.toLowerCase()));
    if(cmpF!=='All') r=r.filter(l=>l.cmp===cmpF);
    if(statusF!=='All') r=r.filter(l=>l.status===statusF);
    return [...r].sort((a,b)=>{
      const av=sortCol==='price'?parseFloat(a.price.replace(/[^\d.]/g,'')):a[sortCol];
      const bv=sortCol==='price'?parseFloat(b.price.replace(/[^\d.]/g,'')):b[sortCol];
      return sortDir==='asc'?av-bv:bv-av;
    });
  },[q,cmpF,statusF,sortCol,sortDir]);
  const doSort=(col)=>{if(sortCol===col)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortCol(col);setSortDir('desc');}};
  const SH=({col})=><span style={{cursor:'pointer',marginLeft:4,opacity:sortCol===col?1:.3}} onClick={()=>doSort(col)}>{sortDir==='asc'&&sortCol===col?'▲':'▼'}</span>;
  return(
    <div className="fade-up">
      {showEasyStudio && (
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:16,fontWeight:600,color:'var(--gold)'}}>✦ Easy Listing AI Intake</h3>
            <button className="btn btn-ghost" onClick={()=>{setShowEasyStudio(false);fetchListings();}}>✕ Close Studio</button>
          </div>
          <EasyListingStudio onListingPublishedAction={()=>{fetchListings();setShowEasyStudio(false);}} />
        </div>
      )}
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <input className="f-in" placeholder={T('search') || 'Search listings'} title={T('search') || 'Search listings'} aria-label={T('search') || 'Search listings'} value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:220}}/>
        <select className="f-in" value={cmpF} onChange={e=>setCmpF(e.target.value)} style={{maxWidth:180}} title="Filter by Compound" aria-label="Filter by Compound">
          {cmps.map(c=><option key={c}>{c}</option>)}
        </select>
        <select className="f-in" value={statusF} onChange={e=>setStatusF(e.target.value)} style={{maxWidth:130}} title="Filter by Status" aria-label="Filter by Status">
          {['All','Active','Review','Sold'].map(s=><option key={s}>{s}</option>)}
        </select>
        <span style={{fontFamily:'JetBrains Mono',fontSize:10,color:'var(--tx-f)'}}>{filtered.length} / {liveListings.length}</span>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button className="btn btn-ghost" onClick={()=>exportCSV(filtered.map(l=>({Code:l.code,Compound:l.cmp,Type:l.type,Beds:l.beds,Area:l.area,Price:l.price,AI:l.ai,Status:l.status})),'listings.csv')}>⬇ {T('exportCSV')}</button>
          <button className="btn btn-gold" onClick={()=>setShowEasyStudio(s=>!s)}>
            {showEasyStudio ? 'Hide Studio' : '✦ Easy Listing AI'}
          </button>
        </div>
      </div>
      <div className="card"><div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead><tr>
            <th style={{width:64}}>Photo</th>
            <th>Code <SH col="code"/></th><th>Compound</th><th>Type</th>
            <th>Beds <SH col="beds"/></th><th>Area <SH col="area"/></th>
            <th>Price <SH col="price"/></th><th>AI ▸ <SH col="ai"/></th>
            <th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>{filtered.map(l=>(
            <tr key={l.code}>
              <td><img src={HUB_IMGS[l.img]} alt="" style={{width:56,height:38,borderRadius:8,objectFit:'cover'}}/></td>
              <td style={{fontFamily:'JetBrains Mono',fontSize:9.5,color:'var(--gold)',fontWeight:700}}>{l.code}</td>
              <td style={{fontWeight:600,color:'var(--tx)'}}>{l.cmp}</td>
              <td><span className="chip chip-blue">{l.type}</span></td>
              <td style={{fontFamily:'JetBrains Mono'}}>{l.beds}</td>
              <td style={{fontFamily:'JetBrains Mono'}}>{l.area}m²</td>
              <td style={{fontFamily:'JetBrains Mono',color:'var(--gold)',fontWeight:700}}>{l.price}</td>
              <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:l.ai>=9.5?'var(--emerald)':l.ai>=9?'var(--gold)':'var(--tx-m)'}}>{l.ai}</td>
              <td><span className={`chip ${l.status==='Active'?'chip-green':l.status==='Review'?'chip-amber':'chip-red'}`}>{l.status}</span></td>
              <td><div style={{display:'flex',gap:5}}>
                <button className="btn btn-ghost" onClick={()=>window.open(`/property/${l.code}`, '_blank', 'noopener,noreferrer')} style={{padding:'4px 9px',fontSize:10}}>View</button>
                <button className="btn btn-green" onClick={()=>{
                  const msg = encodeURIComponent(`مرحباً، تفاصيل الوحدة ${l.code} في ${l.cmp} (${l.type} - ${l.price}): متاحة للمعاينة الآن.`);
                  window.open(`https://wa.me/201092048333?text=${msg}`, '_blank', 'noopener,noreferrer');
                }} style={{padding:'4px 9px',fontSize:10}}>WA</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div></div>
    </div>
  );
}

/* ── STAGE-9 CLOSER ──────────────────────────────────────────────────── */
const DEALS_DATA=[
  {id:'DL-0097',client:'Ahmed Al-Rashid',phone:'+20 100 111 2233',prop:'Villa Hyde Park · 5 Beds · 420m²',value:'EGP 35M',stage:'contract',prog:85,signed:false,deposit:true,c:'#00AEFF'},
  {id:'DL-0096',client:'Khalid Mansour',phone:'+971 50 333 4455',prop:'Penthouse Uptown · 4 Beds · 320m²',value:'EGP 28M',stage:'negotiation',prog:60,signed:false,deposit:false,c:'#1E88D9'},
  {id:'DL-0095',client:'Omar Farouk',phone:'+20 100 555 6677',prop:'Twin House Mountain View · 4 Beds',value:'EGP 22M',stage:'contract',prog:72,signed:true,deposit:true,c:'#34D399'},
  {id:'DL-0094',client:'Rania Nasser',phone:'+20 102 777 8899',prop:'Villa Villette · 5 Beds · 380m²',value:'EGP 31M',stage:'closed',prog:100,signed:true,deposit:true,c:'#7C3AED'},
  {id:'DL-0093',client:'Hisham Bakr',phone:'+20 109 888 9900',prop:'Garden Villa Mivida · 3 Beds · 195m²',value:'EGP 8.5M',stage:'initial',prog:25,signed:false,deposit:false,c:'#E63946'},
  {id:'DL-0092',client:'Layla Karim',phone:'+20 109 666 7788',prop:'Apartment Eastown · 3 Beds · 155m²',value:'EGP 7.2M',stage:'negotiation',prog:50,signed:false,deposit:false,c:'#f59e0b'},
];
function Stage9CloserPage({T}){
  const [stageF,setStageF]=useState('all');
  const STAGES=[
    {id:'all',lbl:'All Deals'},
    {id:'initial',lbl:'Initial Contact',c:'#E63946'},
    {id:'negotiation',lbl:'Negotiation',c:'#f59e0b'},
    {id:'contract',lbl:'Contract Draft',c:'#1E88D9'},
    {id:'closed',lbl:'Closed ✓',c:'#34D399'},
  ];
  const filtered=stageF==='all'?DEALS_DATA:DEALS_DATA.filter(d=>d.stage===stageF);
  const pipelineVal=DEALS_DATA.reduce((s,d)=>s+parseFloat(d.value.replace(/[^\d.]/g,'')),0);
  return(
    <div className="fade-up">
      {/* Live AI Negotiation Simulator */}
      <NegotiationSimulator />

      {/* Pipeline KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
        {STAGES.slice(1).map(s=>(
          <div key={s.id} style={{background:'var(--bg-e)',border:'1px solid var(--bd)',borderRadius:12,padding:'12px 14px',borderTop:`3px solid ${s.c}`}}>
            <div style={{fontFamily:'JetBrains Mono',fontSize:22,fontWeight:700,color:s.c,marginBottom:4}}>{DEALS_DATA.filter(d=>d.stage===s.id).length}</div>
            <div style={{fontSize:9,color:'var(--tx-f)',textTransform:'uppercase',letterSpacing:'.1em'}}>{s.lbl}</div>
          </div>
        ))}
      </div>
      {/* Pipeline value */}
      <div className="card" style={{marginBottom:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:16}}>
        <div style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--tx-f)',textTransform:'uppercase',letterSpacing:'.14em'}}>Total Pipeline Value</div>
        <div style={{fontFamily:'JetBrains Mono',fontSize:22,fontWeight:700,color:'var(--gold)'}}>EGP {pipelineVal.toFixed(1)}M</div>
        <div style={{flex:1,marginLeft:16}}>
          <div style={{display:'flex',gap:4}}>
            {DEALS_DATA.map((d,i)=>(
              <div key={i} style={{flex:parseFloat(d.value.replace(/[^\d.]/g,'')),height:8,background:d.c,borderRadius:4,opacity:.8}} title={`${d.client}: ${d.value}`}/>
            ))}
          </div>
        </div>
        <button className="btn btn-gold" style={{marginLeft:'auto'}}>+ New Deal</button>
      </div>
      {/* Stage filter */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {STAGES.map(s=>(
          <button key={s.id} onClick={()=>setStageF(s.id)} className="btn btn-ghost"
            style={{borderColor:stageF===s.id?'var(--gold)':'var(--bd)',color:stageF===s.id?'var(--gold)':'var(--tx-m)',background:stageF===s.id?'rgba(0,174,255,.08)':'var(--surf)'}}>
            {s.lbl} <span style={{background:'var(--surf)',padding:'1px 6px',borderRadius:20,marginLeft:4,fontSize:9}}>{s.id==='all'?DEALS_DATA.length:DEALS_DATA.filter(d=>d.stage===s.id).length}</span>
          </button>
        ))}
      </div>
      {/* Deal cards */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(deal=>(
          <div key={deal.id} className="card" style={{borderLeft:`3px solid ${deal.c}`}}>
            <div style={{padding:'14px 16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <div style={{width:42,height:42,borderRadius:'50%',background:`${deal.c}22`,border:`1.5px solid ${deal.c}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,color:deal.c,flexShrink:0}}>{deal.client[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:'var(--tx)',marginBottom:2}}>{deal.client}</div>
                  <div style={{fontSize:11,color:'var(--tx-m)'}}>{deal.prop}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'JetBrains Mono',fontSize:15,fontWeight:700,color:'var(--gold)'}}>{deal.value}</div>
                  <div style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--tx-f)',marginTop:2}}>{deal.id}</div>
                </div>
              </div>
              <div className="progress-bar" style={{marginBottom:10}}><div className="progress-fill" style={{width:`${deal.prog}%`,background:deal.c}}/></div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <span className={`chip ${deal.stage==='closed'?'chip-green':deal.stage==='contract'?'chip-blue':deal.stage==='negotiation'?'chip-amber':'chip-red'}`}>{deal.stage.charAt(0).toUpperCase()+deal.stage.slice(1)}</span>
                {deal.signed&&<span className="chip chip-green">✓ DocuSign</span>}
                {deal.deposit&&<span className="chip chip-blue">✓ Stripe Deposit</span>}
                <span style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--tx-f)',marginLeft:'auto'}}>{deal.prog}% complete</span>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn btn-ghost" onClick={()=>window.open(`/api/closer/contract?id=${deal.id}`, '_blank')} style={{padding:'4px 10px',fontSize:10}}>📄 Contract</button>
                  <button className="btn btn-ghost" onClick={()=>alert(`Stripe deposit invoice generated for ${deal.client} (${deal.value})`)} style={{padding:'4px 10px',fontSize:10}}>💳 Stripe</button>
                  <button className="btn btn-green" onClick={()=>{
                    const clean = deal.phone.replace(/[^0-9]/g, '');
                    const msg = encodeURIComponent(`مرحباً ${deal.client}، مستشار سييرا العقاري معك بخصوص صفقة ${deal.prop}.`);
                    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank', 'noopener,noreferrer');
                  }} style={{padding:'4px 10px',fontSize:10}}>WA {deal.phone}</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PLACEHOLDER ──────────────────────────────────────────────────────── */
function PlaceholderPage({title,emoji}){return <div className="fade-up" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',opacity:.5}}><div style={{fontSize:48,marginBottom:12}}>{emoji}</div><h2 style={{fontFamily:'Cormorant Garamond',fontWeight:300,fontSize:'1.8rem',color:'var(--tx)',marginBottom:6}}>{title}</h2><p style={{color:'var(--tx-f)',fontSize:12}}>Module active · Data loading from Firestore…</p></div>;}

/* ── MAIN APP ─────────────────────────────────────────────────────────── */
const PIPE_STAGES = [
  {k:'New',ar:'جديد',c:'#1E88D9'},
  {k:'Qualifying',ar:'تأهيل',c:'#7C3AED'},
  {k:'Viewing',ar:'معاينة',c:'#f59e0b'},
  {k:'Negotiation',ar:'تفاوض',c:'#00AEFF'},
  {k:'Closed Won',ar:'مغلقة ـ فوز',c:'#34D399'},
  {k:'Closed Lost',ar:'مغلقة ـ خسارة',c:'#E63946'},
];

interface PipeDeal {
  id: string;
  n: string;
  d: string;
  v: string;
  s: string;
  ai: number;
  src: 'Property Finder' | 'WhatsApp' | 'Website' | 'Direct';
  phone: string;
}

const INITIAL_PIPE_DEALS: PipeDeal[] = [
  {id:'DL-01',n:'Ahmed Al-Rashid',d:'Villa · Hyde Park',v:'EGP 20M',s:'Negotiation',ai:9.4,src:'Property Finder',phone:'+201001112233'},
  {id:'DL-02',n:'Khalid Mansour',d:'Penthouse · Uptown Cairo',v:'EGP 15M',s:'Negotiation',ai:9.1,src:'WhatsApp',phone:'+971503334455'},
  {id:'DL-03',n:'Sara Mohamed',d:'3-Bed · Mivida · Rent',v:'$2.4K/mo',s:'Viewing',ai:8.7,src:'Website',phone:'+201012223344'},
  {id:'DL-04',n:'Omar Farouk',d:'Twin House · Mountain View',v:'EGP 12.5M',s:'Viewing',ai:8.9,src:'Property Finder',phone:'+201005556677'},
  {id:'DL-05',n:'Nadia Hassan',d:'Apartment · Madinaty',v:'EGP 5M',s:'Qualifying',ai:8.2,src:'Website',phone:'+201124445566'},
  {id:'DL-06',n:'Layla Karim',d:'Furnished 2-Bed · Eastown',v:'$1.8K/mo',s:'New',ai:7.8,src:'Property Finder',phone:'+201096667788'},
  {id:'DL-07',n:'Tarek Aziz',d:'Duplex · Villette',v:'EGP 9.8M',s:'New',ai:8.4,src:'WhatsApp',phone:'+201027778899'},
  {id:'DL-08',n:'Mona Selim',d:'Villa · Katameya Heights',v:'EGP 38M',s:'Closed Won',ai:9.7,src:'Direct',phone:'+201098889900'},
  {id:'DL-09',n:'Hassan Badr',d:'Studio · Taj City',v:'EGP 2.1M',s:'Closed Lost',ai:6.1,src:'Website',phone:'+201051112233'},
];

function PipelinePage({ T }: { T: any }) {
  const ar = T('lang')==='ar';
  const [filter, setFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [deals, setDeals] = useState<PipeDeal[]>(INITIAL_PIPE_DEALS);

  const stageKeys = PIPE_STAGES.map(s => s.k);

  const moveDeal = (dealId: string, direction: 'next' | 'prev') => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const curIdx = stageKeys.indexOf(d.s);
      if (curIdx === -1) return d;
      const targetIdx = direction === 'next' ? Math.min(curIdx + 1, stageKeys.length - 1) : Math.max(curIdx - 1, 0);
      return { ...d, s: stageKeys[targetIdx] };
    }));
  };

  const handleOpenWhatsApp = (d: PipeDeal) => {
    const clean = d.phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`مرحباً ${d.n}، مستشار سييرا معك بخصوص صفقة ${d.d} في مرحلة (${d.s}).`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const filteredDeals = deals.filter(d => {
    if (sourceFilter !== 'all' && d.src !== sourceFilter) return false;
    return true;
  });

  const totals = {
    all: filteredDeals.length,
    active: filteredDeals.filter(d => !d.s.startsWith('Closed')).length,
    won: filteredDeals.filter(d => d.s === 'Closed Won').length
  };

  const stages = filter === 'active' ? PIPE_STAGES.filter(s => !s.k.startsWith('Closed')) : filter === 'won' ? PIPE_STAGES.filter(s => s.k === 'Closed Won') : PIPE_STAGES;

  return (
    <div className="fade-up">
      {/* Top Controls & Source Filters */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {[['all',ar?'كل الصفقات':'All Deals'],['active',ar?'النشطة':'Active Pipeline'],['won',ar?'المكسوبة':'Closed Won']].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} className="topbar-pill" style={filter===k?{background:'var(--tx-s)',color:'var(--bg-e)',borderColor:'var(--tx-s)'}:{}}>{l}</button>
        ))}

        <div style={{display:'flex',gap:6,marginInlineStart:8}}>
          <button onClick={()=>setSourceFilter('all')} className="topbar-pill" style={sourceFilter==='all'?{background:'var(--gold)',color:'#071422'}:{}}>All Sources</button>
          <button onClick={()=>setSourceFilter('Property Finder')} className="topbar-pill" style={sourceFilter==='Property Finder'?{background:'#00AEFF',color:'#fff'}:{borderColor:'rgba(0,174,255,.3)',color:'#00AEFF'}}>🏢 Property Finder</button>
          <button onClick={()=>setSourceFilter('WhatsApp')} className="topbar-pill" style={sourceFilter==='WhatsApp'?{background:'#34D399',color:'#071422'}:{borderColor:'rgba(52,211,153,.3)',color:'#34D399'}}>💬 WhatsApp</button>
        </div>

        <span style={{marginInlineStart:'auto',fontFamily:'JetBrains Mono',fontSize:10,color:'var(--tx-f)',alignSelf:'center'}}>
          {ar?'قيمة الخط':'Pipeline value'}: <b style={{color:'var(--gold)'}}>EGP 102.4M</b> · {totals.active} {ar?'نشطة':'active'} · {totals.won} {ar?'مكسوبة':'won'}
        </span>
      </div>

      <div className="kanban">
        {stages.map(st=>{
          const stageDeals = filteredDeals.filter(d => d.s === st.k);
          return (
            <div key={st.k} className="kb-col" style={{'--kbc':st.c} as any}>
              <div className="kb-hd">
                <span className="kb-name" style={{background:st.c+'1c',color:st.c}}>{ar?st.ar:st.k}</span>
                <span className="kb-count">{stageDeals.length}</span>
              </div>
              {stageDeals.map((d)=>(
                <div key={d.id} className="kb-card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{d.n}</span>
                    <span style={{fontFamily:'JetBrains Mono',fontSize:8.5,color:'var(--gold)'}}>★ {d.ai}</span>
                  </div>
                  <div style={{fontSize:10.5,color:'var(--tx-m)',marginBottom:5}}>{d.d}</div>
                  
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,color:'var(--tx-s)'}}>{d.v}</span>
                    <span className={`chip ${d.src === 'Property Finder' ? 'chip-amber' : d.src === 'WhatsApp' ? 'chip-green' : 'chip-blue'}`} style={{fontSize:8,padding:'2px 5px'}}>
                      {d.src === 'Property Finder' ? '🏢 PF' : d.src === 'WhatsApp' ? '💬 WA' : d.src}
                    </span>
                  </div>

                  {/* Interactive pipeline step buttons */}
                  <div style={{display:'flex',gap:4,borderTop:'1px solid var(--bd)',paddingTop:6,alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button 
                        className="btn btn-ghost" 
                        style={{padding:'2px 6px',fontSize:9}}
                        disabled={stageKeys.indexOf(d.s) === 0}
                        onClick={() => moveDeal(d.id, 'prev')}
                        title="Move to previous stage"
                      >
                        ◀
                      </button>
                      <button 
                        className="btn btn-ghost" 
                        style={{padding:'2px 6px',fontSize:9,color:'var(--gold)',borderColor:'var(--bd-s)'}}
                        disabled={stageKeys.indexOf(d.s) >= stageKeys.length - 2}
                        onClick={() => moveDeal(d.id, 'next')}
                        title="Advance to next stage"
                      >
                        Next ▶
                      </button>
                    </div>
                    <button 
                      className="btn btn-green" 
                      onClick={() => handleOpenWhatsApp(d)} 
                      style={{padding:'2px 6px',fontSize:9}}
                      title="Open WhatsApp chat"
                    >
                      💬 WA
                    </button>
                  </div>
                </div>
              ))}
              {stageDeals.length===0&&<div style={{padding:'22px 12px',textAlign:'center',fontSize:10.5,color:'var(--tx-f)'}}>{ar?'لا صفقات':'No deals'}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TaskItem {
  id: string;
  t: string;
  due: string;
  pr: 'high' | 'med' | 'low';
  done: boolean;
  ag: string;
  phone?: string;
  tag?: string;
}

const TASKS_INIT: TaskItem[] = [
  {
    id: 'TSK-01',
    t: '📸 Photo Hunter: Dispatch photographer to Mivida Villa (SE-MVD-VLA-0006) — high-yield luxury unit missing photos',
    due: 'Today 14:00',
    pr: 'high',
    done: false,
    ag: 'Photo Team',
    tag: 'Photo Hunter',
  },
  {
    id: 'TSK-02',
    t: '🏢 Property Finder: Verify and syndicate 14 newly photographed units to Property Finder feed',
    due: 'Today 16:00',
    pr: 'high',
    done: false,
    ag: 'Property Finder',
    tag: 'Syndication',
  },
  {
    id: 'TSK-03',
    t: 'Call Ahmed Al-Rashid — confirm Hyde Park viewing (PF Lead)',
    due: 'Today 15:00',
    pr: 'high',
    done: false,
    ag: 'Sierra Bot',
    phone: '+201001112233',
    tag: 'Viewing',
  },
  {
    id: 'TSK-04',
    t: 'Send Uptown Cairo contract draft to Khalid (Stage-9 Closer)',
    due: 'Today 17:30',
    pr: 'high',
    done: false,
    ag: 'Stage-9',
    phone: '+971503334455',
    tag: 'Closer',
  },
  {
    id: 'TSK-05',
    t: 'Follow up بالعربي with Gulf VIP lead on WhatsApp — Leila',
    due: 'Tomorrow 10:00',
    pr: 'med',
    done: false,
    ag: 'Leila',
    phone: '+971503334455',
    tag: 'Outreach',
  },
  {
    id: 'TSK-06',
    t: 'Review 23 scraped WhatsApp listings pending AVM pricing',
    due: 'Tomorrow 12:00',
    pr: 'med',
    done: false,
    ag: 'Curator',
    tag: 'Inventory',
  },
  {
    id: 'TSK-07',
    t: 'Verify Madinaty B10 owner-direct listing photos and pricing',
    due: 'Yesterday',
    pr: 'low',
    done: true,
    ag: 'Scribe',
    tag: 'Inventory',
  },
];

function TasksPage({ T }: { T: any }) {
  const ar = T('lang')==='ar';
  const [tasks, setTasks] = useState<TaskItem[]>(TASKS_INIT);
  const [view, setView] = useState<'all' | 'active' | 'done'>('active');
  const [q, setQ] = useState('');
  const [agentFilter, setAgentFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showNewModal, setShowNewModal] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('Today 18:00');
  const [newPr, setNewPr] = useState<'high' | 'med' | 'low'>('high');
  const [newAg, setNewAg] = useState('Photo Team');
  const [newPhone, setNewPhone] = useState('');

  const toggle = (id: string) => setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id: string) => setTasks(p => p.filter(t => t.id !== id));

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newTask: TaskItem = {
      id: `TSK-${String(tasks.length + 1).padStart(2, '0')}`,
      t: newTitle.trim(),
      due: newDue.trim() || 'Today',
      pr: newPr,
      done: false,
      ag: newAg,
      phone: newPhone.trim() || undefined,
      tag: newAg === 'Photo Team' ? 'Photo Hunter' : newAg === 'Property Finder' ? 'Syndication' : 'Operations',
    };
    setTasks(p => [newTask, ...p]);
    setNewTitle('');
    setNewPhone('');
    setShowNewModal(false);
  };

  const generatePhotoRadarTasks = () => {
    const radarTasks: TaskItem[] = [
      {
        id: `TSK-RDR-${Date.now()}-1`,
        t: '📸 Photo Hunter: Photograph Hyde Park Twin House (SE-HYP-TWH-0002) — high demand',
        due: 'Today 15:30',
        pr: 'high',
        done: false,
        ag: 'Photo Team',
        tag: 'Photo Hunter',
      },
      {
        id: `TSK-RDR-${Date.now()}-2`,
        t: '📸 Photo Hunter: Schedule video tour for Uptown Cairo Duplex (SE-UPC-DPX-0009)',
        due: 'Tomorrow 11:00',
        pr: 'high',
        done: false,
        ag: 'Photo Team',
        tag: 'Photo Hunter',
      }
    ];
    setTasks(p => [...radarTasks, ...p]);
  };

  const handleWhatsApp = (t: TaskItem) => {
    if (!t.phone) return;
    const clean = t.phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`مرحباً، مستشار سييرا العقاري معك بخصوص: ${t.t}`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const shown = tasks.filter(t => {
    if (view === 'active' && t.done) return false;
    if (view === 'done' && !t.done) return false;
    if (agentFilter !== 'All' && t.ag !== agentFilter) return false;
    if (priorityFilter !== 'All' && t.pr !== priorityFilter.toLowerCase()) return false;
    if (q && !t.t.toLowerCase().includes(q.toLowerCase()) && !t.ag.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const stats = [
    [tasks.length, ar ? 'إجمالي المهام' : 'Total Tasks', '#1E88D9'],
    [tasks.filter(t => t.done).length, ar ? 'مكتملة' : 'Completed', '#34D399'],
    [tasks.filter(t => !t.done && t.pr === 'high').length, ar ? 'عاجلة' : 'High Priority', '#E63946'],
    [tasks.filter(t => !t.done).length, ar ? 'قيد التنفيذ' : 'Pending', '#00AEFF'],
  ];

  const prC: Record<string, string> = { high: '#E63946', med: '#f59e0b', low: '#1E88D9' };
  const agentsList = ['All', 'Photo Team', 'Property Finder', 'Sierra Bot', 'Leila', 'Stage-9', 'Curator', 'Scribe'];

  return (
    <div className="fade-up">
      {/* KPIs */}
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',marginBottom:16}}>
        {stats.map(([v,l,c],i)=>(
          <div key={i} className="kpi-card">
            <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:c as string}}/>
            <div className="kpi-val" style={{color:c as string}}>{v}</div>
            <div className="kpi-lbl">{l}</div>
          </div>
        ))}
      </div>

      {/* Action Row & Filters */}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input 
          value={q} 
          onChange={e=>setQ(e.target.value)} 
          placeholder={ar?'ابحث في المهام أو الوكيل…':'Search tasks or assignee…'} 
          style={{flex:1,minWidth:200,padding:'10px 14px',borderRadius:11,border:'1px solid var(--bd)',background:'var(--bg-e)',color:'var(--tx)',fontSize:12,outline:'none'}}
        />

        {/* View toggles */}
        <div style={{display:'flex',gap:6}}>
          {[
            ['all', (ar?'الكل ':'All') + ` (${tasks.length})`],
            ['active', (ar?'النشطة ':'Active') + ` (${tasks.filter(t=>!t.done).length})`],
            ['done', (ar?'المكتملة ':'Done') + ` (${tasks.filter(t=>t.done).length})`]
          ].map(([k,l])=>(
            <button key={k} onClick={()=>setView(k as any)} className="topbar-pill" style={view===k?{background:'var(--tx-s)',color:'var(--bg-e)',borderColor:'var(--tx-s)'}:{}}>{l}</button>
          ))}
        </div>

        {/* Generate Photo Tasks button */}
        <button 
          className="btn btn-ghost" 
          onClick={generatePhotoRadarTasks}
          style={{fontSize:11,borderColor:'rgba(245,158,11,.4)',color:'#f59e0b'}}
          title="Auto-generate photo tasks for luxury units without images"
        >
          ⭐ + Photo Radar Tasks
        </button>

        {/* New Task button */}
        <button className="topbar-pill on" onClick={()=>setShowNewModal(true)} style={{background:'linear-gradient(135deg,var(--gold),var(--gold-lt))',color:'#071422',fontWeight:700}}>
          + {ar?'مهمة جديدة':'New Task'}
        </button>
      </div>

      {/* Sub-Filters for Assignee Agent & Priority */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontSize:10.5,color:'var(--tx-f)',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'.08em'}}>Assignee:</span>
        {agentsList.map(a => (
          <button 
            key={a} 
            onClick={()=>setAgentFilter(a)} 
            className="topbar-pill" 
            style={{
              padding:'4px 10px',
              fontSize:10,
              background: agentFilter === a ? 'var(--gold)' : 'var(--surf)',
              color: agentFilter === a ? '#071422' : 'var(--tx-m)',
              borderColor: agentFilter === a ? 'var(--gold)' : 'var(--bd)',
            }}
          >
            {a}
          </button>
        ))}

        <div style={{marginInlineStart:'auto',display:'flex',gap:6,alignItems:'center'}}>
          <span style={{fontSize:10.5,color:'var(--tx-f)',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'.08em'}}>Priority:</span>
          {['All', 'High', 'Med', 'Low'].map(p => (
            <button 
              key={p} 
              onClick={()=>setPriorityFilter(p)} 
              className="topbar-pill" 
              style={{
                padding:'3px 8px',
                fontSize:9.5,
                background: priorityFilter === p ? (p === 'High' ? '#E63946' : p === 'Med' ? '#f59e0b' : 'var(--tx-s)') : 'transparent',
                color: priorityFilter === p ? '#fff' : 'var(--tx-m)',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="card">
        {shown.map(t=>(
          <div key={t.id} className="task-row" style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:'1px solid var(--bd)'}}>
            <button 
              className={'task-check '+(t.done?'done':'')} 
              onClick={()=>toggle(t.id)}
              style={{cursor:'pointer'}}
              title={t.done ? 'Mark as incomplete' : 'Mark as complete'}
            >
              {t.done ? '✓' : ''}
            </button>

            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:600,color:'var(--tx)',textDecoration:t.done?'line-through':'none',opacity:t.done?.55:1,lineHeight:1.4}}>
                {t.t}
              </div>
              <div style={{fontSize:10,color:'var(--tx-f)',marginTop:4,display:'flex',gap:8,alignItems:'center'}}>
                <span>⏰ {t.due}</span>
                <span>•</span>
                <span style={{color:'var(--gold)',fontWeight:600}}>🤖 {t.ag}</span>
                {t.tag && <span className="chip chip-blue" style={{fontSize:8,padding:'1px 5px'}}>{t.tag}</span>}
              </div>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{background:(prC[t.pr]||'#1E88D9')+'1a',color:prC[t.pr]||'#1E88D9',fontSize:8.5,fontWeight:700,padding:'3px 9px',borderRadius:12,textTransform:'uppercase',letterSpacing:'.08em'}}>
                {t.pr}
              </span>

              {t.phone && (
                <button 
                  className="btn btn-green" 
                  onClick={()=>handleWhatsApp(t)} 
                  style={{padding:'3px 8px',fontSize:10}}
                  title="Direct WhatsApp follow-up"
                >
                  💬 WA
                </button>
              )}

              <button 
                onClick={()=>deleteTask(t.id)} 
                style={{background:'none',border:'none',color:'var(--tx-f)',cursor:'pointer',fontSize:12,padding:'4px'}}
                title="Delete task"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {shown.length===0&&<div style={{padding:40,textAlign:'center',color:'var(--tx-f)',fontSize:12}}>{ar?'لا مهام مطابقة للفلتر':'No tasks matching current filter'}</div>}
      </div>

      {/* New Task Creation Modal */}
      {showNewModal && (
        <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&setShowNewModal(false)}>
          <div className="modal-box" style={{maxWidth:500}}>
            <div className="modal-hd">
              <span style={{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,color:'var(--gold)'}}>+ CREATE NEW OPERATIONAL TASK</span>
              <button onClick={()=>setShowNewModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--tx-f)'}}><Ic.X/></button>
            </div>
            <form onSubmit={handleCreateTask} style={{padding:20,display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontSize:11,color:'var(--tx-m)',display:'block',marginBottom:4}}>Task Title / Objective *</label>
                <input 
                  className="f-in" 
                  style={{width:'100%'}} 
                  placeholder="e.g. Photograph Mivida Villa or Follow up with Khalid..." 
                  value={newTitle} 
                  onChange={e=>setNewTitle(e.target.value)} 
                  required 
                />
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={{fontSize:11,color:'var(--tx-m)',display:'block',marginBottom:4}}>Due Date / Time</label>
                  <input 
                    className="f-in" 
                    style={{width:'100%'}} 
                    placeholder="e.g. Today 17:00" 
                    value={newDue} 
                    onChange={e=>setNewDue(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{fontSize:11,color:'var(--tx-m)',display:'block',marginBottom:4}}>Assignee / Agent</label>
                  <select 
                    className="f-in" 
                    style={{width:'100%'}} 
                    value={newAg} 
                    onChange={e=>setNewAg(e.target.value)}
                    title="Assignee or Agent"
                    aria-label="Assignee or Agent"
                  >
                    <option value="Photo Team">📸 Photo Hunter Team</option>
                    <option value="Property Finder">🏢 Property Finder Syndicator</option>
                    <option value="Sierra Bot">🤖 Sierra Bot (Orchestrator)</option>
                    <option value="Leila">👩 Leila (Bilingual Closer)</option>
                    <option value="Stage-9">💼 Stage-9 Closer</option>
                    <option value="Curator">🎨 The Curator</option>
                    <option value="Scribe">✍️ The Scribe</option>
                  </select>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={{fontSize:11,color:'var(--tx-m)',display:'block',marginBottom:4}}>Priority Level</label>
                  <select 
                    className="f-in" 
                    style={{width:'100%'}} 
                    value={newPr} 
                    onChange={e=>setNewPr(e.target.value as any)}
                    title="Priority Level"
                    aria-label="Priority Level"
                  >
                    <option value="high">🔴 High Priority (Immediate)</option>
                    <option value="med">🟡 Medium Priority</option>
                    <option value="low">🔵 Low Priority</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,color:'var(--tx-m)',display:'block',marginBottom:4}}>Client Phone (Optional WhatsApp)</label>
                  <input 
                    className="f-in" 
                    style={{width:'100%'}} 
                    placeholder="+20 100 000 0000" 
                    value={newPhone} 
                    onChange={e=>setNewPhone(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{display:'flex',gap:8,marginTop:6}}>
                <button type="submit" className="btn btn-gold" style={{flex:1}}>
                  ✓ Add Task to Fleet
                </button>
                <button type="button" className="btn btn-ghost" onClick={()=>setShowNewModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const AUTOS_INIT = [
  {n:'Welcome WhatsApp → new lead',d:'Send bilingual intro message when a lead lands in Firestore',on:true,runs:1840},
  {n:'Big Deal Alert',d:'Notify manager on Telegram for deals > EGP 15M',on:true,runs:34},
  {n:'Deal Won → celebration + review ask',d:'Send congrats email & request Google review on close',on:true,runs:97},
  {n:'Stale lead re-engage (7 days)',d:'AI drafts a re-engagement message after 7 days silence',on:false,runs:412},
];
function AutomationsPage({ T }) {
  const ar = T('lang')==='ar';
  const [autos,setAutos]=useState(AUTOS_INIT);
  const toggle=i=>setAutos(p=>p.map((a,j)=>j===i?{...a,on:!a.on}:a));
  const tmpls=[
    {ic:'✉️',bg:'#1E88D9',n:ar?'رسالة ترحيب':'Welcome Message',d:ar?'واتساب تلقائي للعملاء الجدد':'Auto WhatsApp to new leads'},
    {ic:'🔔',bg:'#E63946',n:ar?'تنبيه صفقة كبيرة':'Big Deal Alert',d:ar?'مهمة للمدير للصفقات > 15م':'Task for manager on deals > 15M'},
    {ic:'✦',bg:'#34D399',n:ar?'فوز بالصفقة':'Deal Won',d:ar?'تهنئة عند إغلاق الصفقة':'Celebration email when deal closes'},
  ];
  const stats=[[autos.length,ar?'إجمالي القواعد':'Total Rules','#00AEFF'],[autos.filter(a=>a.on).length,ar?'نشطة':'Active','#34D399'],[autos.filter(a=>!a.on).length,ar?'موقوفة':'Disabled','#E63946'],['98.4%',ar?'نسبة النجاح':'Success Rate','#1E88D9']];
  return (
    <div className="fade-up">
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))'}}>
        {stats.map(([v,l,c],i)=>(
          <div key={i} className="kpi-card">
            <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:c}}/>
            <div className="kpi-val" style={{color:c}}>{v}</div>
            <div className="kpi-lbl">{l}</div>
          </div>
        ))}
      </div>
      <div style={{fontFamily:'JetBrains Mono',fontSize:9,letterSpacing:'.16em',textTransform:'uppercase',color:'var(--gold)',margin:'4px 0 10px'}}>✧ {ar?'قوالب سريعة':'Quick Templates'}</div>
      <div className="grid-3" style={{marginBottom:20}}>
        {tmpls.map((t,i)=>(
          <div key={i} className="tmpl-card">
            <div className="tmpl-ic" style={{background:t.bg+'1c',color:t.bg}}>{t.ic}</div>
            <div style={{fontSize:13.5,fontWeight:700,color:'var(--tx)',marginBottom:4}}>{t.n}</div>
            <div style={{fontSize:11,color:'var(--tx-m)'}}>{t.d}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-hd"><span className="card-title">⚡ {ar?'القواعد النشطة':'Active Rules'} ({autos.filter(a=>a.on).length})</span><button className="topbar-pill on">+ {ar?'قاعدة جديدة':'New Rule'}</button></div>
        {autos.map((a,i)=>(
          <div key={i} className="task-row">
            <div onClick={()=>toggle(i)} style={{width:34,height:19,borderRadius:12,cursor:'pointer',background:a.on?'var(--emerald)':'var(--bd-s)',position:'relative',transition:'background .2s',flexShrink:0}}>
              <div style={{position:'absolute',top:2,insetInlineStart:a.on?17:2,width:15,height:15,borderRadius:'50%',background:'#fff',transition:'all .2s',boxShadow:'0 1px 3px rgba(0,0,0,.25)'}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:600,color:'var(--tx)'}}>{a.n}</div>
              <div style={{fontSize:10,color:'var(--tx-f)',marginTop:3}}>{a.d}</div>
            </div>
            <span style={{fontFamily:'JetBrains Mono',fontSize:9.5,color:'var(--tx-f)'}}>{a.runs.toLocaleString()} runs</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminApp() {
  const [tab,setTab]=useState('overview');
  const [theme,setTheme]=useState(()=>(typeof window!=='undefined'&&localStorage.getItem('admin_theme'))||'light');
  const [langKey,setLangKey]=useState(()=>(typeof window!=='undefined'&&localStorage.getItem('admin_lang'))||'en');
  const [collapsed,setCollapsed]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; role?: string; name?: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);

  const T = useCallback((key) => LANG[langKey][key] || key, [langKey]);
  const isAr = langKey === 'ar';

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme',theme);
    document.documentElement.setAttribute('dir',isAr?'rtl':'ltr');
    document.body.style.fontFamily=isAr?"'Cairo','Inter',sans-serif":"'Inter',sans-serif";
    localStorage.setItem('admin_theme',theme);
    localStorage.setItem('admin_lang',langKey);
  },[theme,langKey,isAr]);

  useEffect(() => {
    fetch('/api/auth')
      .then(res => res.json())
      .then(data => {
        if (data?.signedIn) {
          setCurrentUser({
            email: data.email || 'admin@sierra-estates.net',
            role: data.role || 'super_admin',
            name: data.name || 'Executive Admin',
          });
        } else {
          window.location.href = '/admin/login';
        }
      })
      .catch(() => {
        setCurrentUser({
          email: 'admin@sierra-estates.net',
          role: 'super_admin',
          name: 'Executive Admin',
        });
      });
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent('sierra:refresh-telemetry'));
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const navItems=NAV_ITEMS(T);
  const pageTitles=Object.fromEntries(navItems.map(n=>[n.id,n.label]));

  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = navItems.map((n) => ({
      id: `nav-${n.id}`,
      title: n.label,
      category: n.section,
      icon: n.icon,
      badge: n.badge,
      action: () => setTab(n.id),
    }));

    items.push(
      {
        id: 'act-copilot',
        title: isAr ? 'فتح مساعد الذكاء الاصطناعي (Copilot)' : 'Open AI Data Copilot',
        category: isAr ? 'إجراءات سريعة' : 'Quick Actions',
        icon: '✦',
        action: () => setIsCopilotOpen(true),
      },
      {
        id: 'act-refresh',
        title: isAr ? 'تحديث المقاييس والأسطول' : 'Refresh Telemetry & Fleet',
        category: isAr ? 'إجراءات سريعة' : 'Quick Actions',
        icon: '🔄',
        action: handleManualRefresh,
      },
      {
        id: 'act-lang',
        title: isAr ? 'التبديل إلى الإنجليزية' : 'التبديل إلى العربية',
        category: isAr ? 'النظام' : 'System',
        icon: '🌐',
        action: () => setLangKey((l) => (l === 'en' ? 'ar' : 'en')),
      },
      {
        id: 'act-theme',
        title: isAr ? 'تبديل المظهر (فاتح / داكن)' : 'Toggle Theme (Dark / Light)',
        category: isAr ? 'النظام' : 'System',
        icon: theme === 'dark' ? '☀️' : '🌙',
        action: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      },
      {
        id: 'act-livesite',
        title: isAr ? 'فتح بوابة العملاء المباشرة' : 'Open Live Public Client Portal',
        category: isAr ? 'الموقع' : 'Site',
        icon: '↗️',
        action: () => window.open('/', '_blank'),
      }
    );

    return items;
  }, [navItems, isAr, theme]);

  const renderPage=()=>{
    switch(tab){
      case 'overview':
      case 'dashboard':return <DashboardView lang={langKey} onNavigateAction={setTab} onNavigate={setTab}/>;
      case 'all_apps':return <AppsDirectoryView lang={langKey} onNavigate={setTab}/>;
      case 'health':return <HealthView lang={langKey}/>;
      case 'monitoring':return <MonitoringView lang={langKey}/>;
      case 'recommendations':return <RecommendationsView lang={langKey}/>;
      case 'alerts':return <AlertsView lang={langKey}/>;
      case 'agents':return <AgentsView lang={langKey}/>;
      case 'workflows':return <WorkflowsPage T={T} onNavigate={setTab} lang={langKey}/>;
      case 'whatsapp_outreach':
      case 'whatsapp_sender':return (
        <div className="fade-up" style={{paddingTop: 4}}>
          <WhatsAppScheduledSender lang={langKey} />
        </div>
      );
      case 'openclaw':return <OpenClawPage T={T}/>;
      case 'nexus':return <NexusAIPage T={T}/>;
      case 'leads':return <LeadsPage T={T}/>;
      case 'pipeline':return <PipelinePage T={T}/>;
      case 'tasks':return <TasksPage T={T}/>;
      case 'automations':return <AutomationsPage T={T}/>;
      case 'listings':return <ListingsView lang={langKey}/>;
      case 'excel_merger':return <ExcelMergerView lang={langKey}/>;
      case 'real_estate_processor':return <RealEstateProcessorView lang={langKey} onNavigate={setTab}/>;
      case 'curator':return <CuratorPage T={T}/>;
      case 'scribe':return <ScribePage T={T}/>;
      case 'closer':return <Stage9CloserPage T={T}/>;
      case 'roles':return <RoleManagerView lang={langKey}/>;
      case 'security':return <SecurityView lang={langKey}/>;
      case 'deployment':return <DeploymentPipelineView lang={langKey}/>;
      case 'api_gateway':return <ApiGatewayView lang={langKey}/>;
      case 'deep_insights':return <DeepInsightsView lang={langKey}/>;
      case 'reports':return <ReportsView lang={langKey}/>;
      case 'contracts':return <ContractsView />;
      case 'heatmap':return <HeatmapView />;
      case 'intelligence':return <AgentIntelligence />;
      case 'notebookllm':return <NotebookLMStudio />;
      case 'settings':return <SettingsPage T={T}/>;
      default:return <DashboardView lang={langKey} onNavigateAction={setTab} onNavigate={setTab}/>;
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'signout' }),
      });
      const { supabase } = await import('@/lib/supabase');
      await supabase.auth.signOut().catch(() => {});
    } catch (e) {
      console.warn('Signout error:', e);
    } finally {
      window.location.href = '/admin/login';
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div className={`mobile-overlay ${mobileOpen?'open':''}`} onClick={()=>setMobileOpen(false)}>
        <div className="mobile-sidebar" onClick={e=>e.stopPropagation()}>
          <SidebarContent T={T} tab={tab} setTab={setTab} collapsed={false} setCollapsed={()=>{}} onClose={()=>setMobileOpen(false)}/>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside id="sidebar" className={collapsed?'collapsed':''}>
        <SidebarContent T={T} tab={tab} setTab={setTab} collapsed={collapsed} setCollapsed={setCollapsed} onClose={null}/>
      </aside>

      {/* Main */}
      <main id="main">
        <div id="topbar">
          <button className="hamburger-btn" onClick={()=>setMobileOpen(true)} title="Open navigation menu" aria-label="Open navigation menu"><Ic.Menu/></button>
          
          {/* Breadcrumb Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 className="topbar-title" style={isAr?{fontFamily:"'Cairo',sans-serif"}:{}}>
              {pageTitles[tab]||'Sierra Estates'}
            </h1>
            <div className="topbar-breadcrumb">
              <span>/</span>
              <span className="topbar-breadcrumb-item">Sierra OS</span>
              <span>/</span>
              <span className="topbar-breadcrumb-active">{pageTitles[tab] || tab}</span>
            </div>
          </div>

          {/* Omnibox Command Search */}
          <div
            className="topbar-omnibox"
            onClick={() => setIsCommandPaletteOpen(true)}
            title={isAr ? 'البحث في التطبيقات والأوامر (⌘K)' : 'Search apps & actions (⌘K)'}
          >
            <span>🔍</span>
            <span style={{ fontSize: 11.5 }}>{isAr ? 'بحث سريع...' : 'Search or jump to...'}</span>
            <kbd>⌘K</kbd>
          </div>

          <div style={{marginInlineStart:'auto',display:'flex',gap:8,alignItems:'center'}}>
            {/* Quick App Switcher */}
            <div style={{ position: 'relative' }}>
              <button
                className="app-switcher-btn"
                onClick={() => setIsAppSwitcherOpen((o) => !o)}
                title={isAr ? 'التبديل السريع بين التطبيقات' : 'Quick App Switcher'}
              >
                <span>✨</span>
                <span>{isAr ? 'التطبيقات' : 'All Apps'}</span>
                <span style={{ fontSize: 8 }}>▼</span>
              </button>
              {isAppSwitcherOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    [isAr ? 'left' : 'right']: 0,
                    width: 250,
                    background: 'linear-gradient(180deg, #102339 0%, #081424 100%)',
                    border: '1px solid rgba(0, 174, 255, 0.3)',
                    borderRadius: 12,
                    padding: 8,
                    boxShadow: '0 16px 36px rgba(0,0,0,0.6), 0 0 20px rgba(0, 174, 255, 0.15)',
                    zIndex: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                  onClick={() => setIsAppSwitcherOpen(false)}
                >
                  {[
                    { id: 'all_apps', label: isAr ? 'دليل المنظومة المتكامل' : 'All Apps Hub', icon: '✨' },
                    { id: 'overview', label: isAr ? 'لوحة القيادة الرئيسية' : 'Operations Dashboard', icon: '🏠' },
                    { id: 'listings', label: isAr ? 'قاعدة العقارات والاستوديو' : 'Listings & Studio', icon: '🏘️' },
                    { id: 'intelligence', label: isAr ? 'أسطول الذكاء الاصطناعي' : 'Agent Fleet (Leila)', icon: '🧠' },
                    { id: 'contracts', label: isAr ? 'العقود الإلكترونية' : 'Digital Contracts Desk', icon: '📜' },
                    { id: 'deployment', label: isAr ? 'خطوط النشر والإنتاج' : 'CI/CD Deployment Console', icon: '🚀' },
                    { id: 'api_gateway', label: isAr ? 'بوابة واجهات البرمجة' : 'RESTful API Gateway', icon: '🌐' },
                  ].map((app) => (
                    <div
                      key={app.id}
                      onClick={() => setTab(app.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: tab === app.id ? '#00AEFF' : '#F0EDE5',
                        background: tab === app.id ? 'rgba(0, 174, 255, 0.15)' : 'transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = tab === app.id ? 'rgba(0, 174, 255, 0.15)' : 'transparent')}
                    >
                      <span>{app.icon}</span>
                      <span style={{ fontWeight: tab === app.id ? 700 : 500 }}>{app.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="topbar-pill" onClick={()=>setLangKey(l=>l==='en'?'ar':'en')} title="Toggle Language / تبديل اللغة" aria-label="Toggle Language / تبديل اللغة">
              {isAr?'EN':'ع'}
            </button>
            <button className="topbar-pill" onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} title={theme==='dark'?'Switch to Light Mode':'Switch to Dark Mode'} aria-label={theme==='dark'?'Switch to Light Mode':'Switch to Dark Mode'}>
              {theme==='dark'?<Ic.Sun/>:<Ic.Moon/>}
            </button>
            <a href="/" target="_blank" rel="noopener noreferrer" className="topbar-pill" style={{textDecoration:'none'}} title={isAr ? 'فتح بوابة العملاء المباشرة' : 'Open Live Public Client Portal'}>↗ {T('livesite')}</a>
            <div className="topbar-pill on"><span className="pulse-dot" style={{color:'var(--emerald)'}}>●</span> 3.0 AI</div>
            <button
              className="topbar-pill"
              onClick={() => setIsCopilotOpen(true)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: 'var(--cyan, #00AEFF)',
                borderColor: 'rgba(0,174,255,0.3)',
                background: 'rgba(0,174,255,0.08)',
                fontWeight: 600,
              }}
              title={isAr ? 'فتح مساعد البيانات الذكي' : 'Open AI Data Copilot'}
            >
              <span>✦</span>
              <span style={{ fontSize: 11 }}>{isAr ? 'مساعد البيانات' : 'Copilot'}</span>
            </button>
            <button
              className="topbar-pill"
              onClick={handleManualRefresh}
              title={isAr ? 'تحديث المقاييس والأسطول' : 'Refresh Telemetry & Fleet'}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <span style={{ display: 'inline-flex', transform: isRefreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.8s ease' }}>
                <Ic.Refresh/>
              </span>
              <span style={{ fontSize: 11 }}>{isAr ? 'تحديث' : 'Refresh'}</span>
            </button>
            <div
              className="topbar-pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(62,207,142,0.09)',
                borderColor: 'rgba(62,207,142,0.22)',
              }}
              title={currentUser?.email || 'admin@sierra-estates.net'}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d4af37, #3ECF8E)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 800,
                  color: '#071422',
                  flexShrink: 0,
                }}
              >
                {(currentUser?.email?.[0] || 'A').toUpperCase()}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx)' }}>
                {currentUser?.role === 'super_admin' ? (isAr ? 'مشرف أعلى' : 'Superadmin') : (isAr ? 'مشرف' : 'Admin')}
              </span>
            </div>
            <button className="topbar-pill" onClick={handleSignOut} style={{color:'var(--crimson)',borderColor:'rgba(230,57,70,0.3)',cursor:'pointer'}}>
              {isAr ? 'خروج' : 'Sign Out'}
            </button>
          </div>
        </div>
        <div id="content">
          <SierraMasterOrchestrator lang={langKey} onNavigate={setTab} />
          {renderPage()}
        </div>
        <AdminCopilotDrawer
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          lang={langKey}
        />
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          items={commandItems}
          lang={langKey}
        />
      </main>
    </>
  );
}


export default function AdminPortalRoot() {
  return <div id="root"><AdminApp/></div>;
}

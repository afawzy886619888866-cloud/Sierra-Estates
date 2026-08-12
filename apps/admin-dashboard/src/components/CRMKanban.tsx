"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
// getAnalyticsInstance stub or import if needed
const getAnalyticsInstance = async () => null;
const logAuditAction = async (action: any) => console.log('Audit:', action);
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { Briefcase, Ticket, Search } from 'lucide-react';
import { logEvent } from 'firebase/analytics';

// Mock auth context for admin dashboard
const useAuth = () => ({ user: { uid: 'admin-123' }, isGuest: false });
import { getDoc } from 'firebase/firestore';

// Stub UserProfile and COLLECTIONS
const COLLECTIONS = { users: 'users' };
type UserProfile = any;

import { motion } from 'motion/react';
const cinematicEntrance = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const cinematicHover = { hover: { scale: 1.02 } };

interface InvestmentStakeholder {
  id: string;
  name: string;
  phone: string;
  portfolioPreference: string;
  capitalAllocation: string;
  strategicIntensity: 'hot' | 'warm' | 'cold';
  phase: PipelinePhase;
  createdAt?: Timestamp;
  originChannel: string;
  intelligenceScore?: number;
  assignedTo?: string;
  assignedPartnerId?: string;
  assignedPartnerName?: string;
  dealValue?: number;
  commissionPercentage?: number;
  finalGci?: number;
  
  // Codex v4.0 Alignment
  aiProfiling: {
    interests: string[];
    topMatches: Array<{
      unitId: string;
      matchScore: number;
      matchReason: string;
    }>;
    lastMatchRunAt?: Timestamp;
    lastAnalyzedAt?: Timestamp;
  };
  automation: {
    followupReminderEnabled: boolean;
    nextAutomatedInteraction?: Timestamp;
    interactionFrequency: 'low' | 'medium' | 'high';
  };
}

interface StakeholderDraft {
  name: string;
  phone: string;
  portfolioPreference: string;
  capitalAllocation: string;
  strategicIntensity: 'hot' | 'warm' | 'cold';
  originChannel: string;
  assignedPartnerId: string;
  dealValue: number;
  commissionPercentage: number;
}

interface StakeholderFilters {
  search: string;
  intensity: 'all' | InvestmentStakeholder['strategicIntensity'];
  channel: 'all' | string;
  partnerId: 'all' | string;
}

type PipelinePhase = 'acquisition' | 'consultation' | 'inspection' | 'structuring' | 'settlement';

interface PhaseMetadata {
  title: string;
  color: string;
  description: string;
}

const PHASE_DEFS: Record<PipelinePhase, PhaseMetadata> = {
  acquisition: { title: 'Strategic Acquisition', color: 'var(--blue)', description: 'High-intent market entries and incoming portfolio inquiries' },
  consultation: { title: 'Executive Consultation', color: 'var(--blue-light)', description: 'Initial discovery and architectural preference synthesis' },
  inspection: { title: 'Asset Inspection', color: 'var(--gold)', description: 'Private viewings and physical property experience' },
  structuring: { title: 'Deal Structuring', color: '#10b981', description: 'Financial reconciliation and contractual architecture' },
  settlement: { title: 'Portfolio Settlement', color: 'var(--navy)', description: 'Successful asset transition and relationship formalization' },
};

const PHASE_SEQUENCE: PipelinePhase[] = ['acquisition', 'consultation', 'inspection', 'structuring', 'settlement'];

const CHANNEL_METADATA: Record<string, { icon: string; color: string }> = {
  WhatsApp: { icon: '💬', color: '#25D366' },
  Website: { icon: '🌐', color: 'var(--blue)' },
  Referral: { icon: '🎖️', color: 'var(--gold)' },
  Instagram: { icon: '📸', color: '#e11d48' },
  'Walk-in': { icon: '🚪', color: 'var(--blue-light)' }
};

const INITIAL_STAKEHOLDER_STATE: StakeholderDraft = { 
  name: '', 
  phone: '', 
  portfolioPreference: '', 
  capitalAllocation: '', 
  strategicIntensity: 'warm', 
  originChannel: 'WhatsApp',
  assignedPartnerId: '',
  dealValue: 0,
  commissionPercentage: 2.5
};

const DEFAULT_FILTERS: StakeholderFilters = {
  search: '',
  intensity: 'all',
  channel: 'all',
  partnerId: 'all',
};

const matchesStakeholderFilters = (stakeholder: InvestmentStakeholder, filters: StakeholderFilters) => {
  const search = filters.search.trim().toLowerCase();
  const matchesSearch = !search || [
    stakeholder.name,
    stakeholder.phone,
    stakeholder.portfolioPreference,
    stakeholder.capitalAllocation,
    stakeholder.assignedPartnerName,
    stakeholder.originChannel,
  ].some((value) => value?.toLowerCase().includes(search));

  const matchesIntensity = filters.intensity === 'all' || stakeholder.strategicIntensity === filters.intensity;
  const matchesChannel = filters.channel === 'all' || stakeholder.originChannel === filters.channel;
  const matchesPartner = filters.partnerId === 'all' || stakeholder.assignedPartnerId === filters.partnerId || stakeholder.assignedTo === filters.partnerId;

  return matchesSearch && matchesIntensity && matchesChannel && matchesPartner;
};

function StakeholderCard({ stakeholder, phase, onProgress, onDragStart }: { 
  stakeholder: InvestmentStakeholder; 
  phase: PipelinePhase; 
  onProgress: (id: string, phase: PipelinePhase) => void;
  onDragStart: (id: string, phase: PipelinePhase) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const currentDepth = PHASE_SEQUENCE.indexOf(phase);
  const nextPhase = PHASE_SEQUENCE[currentDepth + 1];

  const handleGenerateProposal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: stakeholder.id })
      });
      if (res.ok) alert('Strategic Options Package generated and secured.');
    } catch (err) {
      console.error('Proposal generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      variants={cinematicEntrance}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      custom={cinematicHover}
      className={`stakeholder-card-premium cinematic-glow priority-${stakeholder.strategicIntensity}`}
      draggable
      onDragStart={() => onDragStart(stakeholder.id, phase)}
      style={{
        animationDelay: `${Math.random() * 0.3}s`
      }}
    >
      {stakeholder.strategicIntensity === 'hot' && <div className="strategic-pulse"></div>}
      <div className="stakeholder-card-gloss"></div>
      
      <div className="stakeholder-card-header-premium">
        <div className="stakeholder-name-wrap">
          <div className="stakeholder-name-main serif">{stakeholder.name}</div>
          <div className="stakeholder-origin">
            <span style={{ color: CHANNEL_METADATA[stakeholder.originChannel]?.color }}>
              {CHANNEL_METADATA[stakeholder.originChannel]?.icon}
            </span>
            <span style={{ letterSpacing: '0.5px' }}>{stakeholder.originChannel.toUpperCase()}</span>
          </div>
        </div>
        
        {stakeholder.intelligenceScore !== undefined && (
          <div className={`intel-score ${stakeholder.intelligenceScore > 80 ? 'intel-high' : stakeholder.intelligenceScore > 50 ? 'intel-mid' : 'intel-low'}`}>
            <svg width="34" height="34" viewBox="0 0 34 34" className="intel-svg">
              <circle cx="17" cy="17" r="15" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="94" strokeDashoffset={94 - (94 * stakeholder.intelligenceScore / 100)} />
            </svg>
            <span className="intel-score-val">{stakeholder.intelligenceScore}</span>
          </div>
        )}
      </div>
      
      <div className="stakeholder-card-body-premium">
        <div className="stakeholder-info-grid">
          <div className="info-item">
            <span className="info-label">Portfolio Focus</span>
            <span className="info-val">{stakeholder.portfolioPreference || 'General Inventory'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Investment Capacity</span>
            <span className="info-val gold-text">{stakeholder.capitalAllocation || 'N/A'}</span>
          </div>
        </div>

        {/* Neural Matching (Stage 6) Display */}
        {stakeholder.aiProfiling?.topMatches && stakeholder.aiProfiling.topMatches.length > 0 && (
          <div className="neural-matches-mini">
            <div className="neural-header">
              <span className="neural-icon">⚡</span>
              <span className="neural-title">Neural Matches</span>
            </div>
            <div className="match-list">
              {stakeholder.aiProfiling.topMatches.slice(0, 2).map((match, i) => (
                <div key={i} className="match-pill">
                  <span className="match-score">{match.matchScore}%</span>
                  <span className="match-reason">{match.matchReason.length > 30 ? match.matchReason.substring(0, 30) + '...' : match.matchReason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stakeholder.assignedPartnerName && (
          <div className="stakeholder-assignment-line">
            <span className="assignment-icon">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <span className="assignment-val">Advisor: {stakeholder.assignedPartnerName}</span>
          </div>
        )}

        {/* Stage 7: Sales Incentives Indicator */}
        {('automation' in stakeholder && (stakeholder.automation as any).viewingRewardActive) && (
          <div className="incentive-badge-mini animate-pulse">
            <Ticket size={10} />
            <span>VIP VIEWING REWARD ACTIVE</span>
          </div>
        )}
      </div>
      
      <div className="stakeholder-card-footer-premium">
        <div className="stakeholder-status-row">
          <span className="stakeholder-timer">
            {stakeholder.createdAt?.toDate ? (
              <>Ingestion: {new Date(stakeholder.createdAt.seconds * 1000).toLocaleDateString()}</>
            ) : (
              'Active Operational Intel'
            )}
          </span>
          <div className={`priority-pill priority-${stakeholder.strategicIntensity}`}>
            {stakeholder.strategicIntensity.toUpperCase()}
          </div>
        </div>

        <div className="card-actions-row flex items-center gap-1.5 mt-2">
          {stakeholder.phone && (
            <a
              href={`https://wa.me/${stakeholder.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-whatsapp-direct inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded hover:bg-emerald-500/20 transition font-mono uppercase font-semibold"
            >
              💬 WhatsApp
            </a>
          )}

          {stakeholder.aiProfiling?.topMatches?.length > 0 && (
            <button 
              className={`btn-generate-proposal ${isGenerating ? 'loading' : ''}`}
              onClick={handleGenerateProposal}
              disabled={isGenerating}
            >
              <Briefcase size={12} />
              <span>{isGenerating ? 'Structuring...' : 'Propose Package'}</span>
            </button>
          )}

          {nextPhase && (
            <button
              className="btn-progress-stakeholder"
              onClick={() => onProgress(stakeholder.id, phase)}
            >
              <span>Advance</span>
              <span className="arrow">→</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CRMKanban() {
  const { user, isGuest } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pipelineState, setPipelineState] = useState<Record<PipelinePhase, InvestmentStakeholder[]>>({
    acquisition: [], consultation: [], inspection: [], structuring: [], settlement: []
  });
  const [activeInventorySize, setActiveInventorySize] = useState(0);
  const [partners, setPartners] = useState<{id: string, name: string}[]>([]);
  const [dragging, setDragging] = useState<{ id: string; currentPhase: PipelinePhase } | null>(null);
  const [phaseTarget, setPhaseTarget] = useState<PipelinePhase | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stakeholderDraft, setStakeholderDraft] = useState<StakeholderDraft>(INITIAL_STAKEHOLDER_STATE);
  const [filters, setFilters] = useState<StakeholderFilters>(DEFAULT_FILTERS);
  const [syncingPF, setSyncingPF] = useState(false);
  const [matchingLeads, setMatchingLeads] = useState(false);

  // Fetch User Profile on Mount
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const pDoc = await getDoc(doc(db, COLLECTIONS.users, user.uid));
        if (pDoc.exists()) {
          setUserProfile({ id: pDoc.id, ...pDoc.data() } as UserProfile);
        }
      } catch (err) {
        console.error("Profile recovery failure:", err);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user && !isGuest) return;

    // Fetch Partners for selection
    const pq = query(collection(db, 'partners'), orderBy('name', 'asc'));
    const unsubscribePartners = onSnapshot(pq, (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    // Dynamic Lead Query based on User Role
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    
    // If user is an agent, restrict to their assigned leads only
    if (userProfile?.role === 'agent') {
       // Note: In Production we'd use where('assignedPartnerId', '==', user.uid)
       // but for now we'll do client-side filtering or handle it carefully.
       // The user requested: "each one should see his clients only"
       console.log('Restricting view to agent:', user?.uid);
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allStakeholders: InvestmentStakeholder[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const rawPhase = (data.phase || data.status || 'acquisition').toLowerCase();
        let phase: PipelinePhase = 'acquisition';

        if (['new', 'acquisition'].includes(rawPhase)) phase = 'acquisition';
        else if (['contacted', 'consultation'].includes(rawPhase)) phase = 'consultation';
        else if (['viewing', 'inspection'].includes(rawPhase)) phase = 'inspection';
        else if (['negotiating', 'structuring'].includes(rawPhase)) phase = 'structuring';
        else if (['closed', 'settlement'].includes(rawPhase)) phase = 'settlement';

        return {
          id: doc.id,
          ...data,
          phase,
          portfolioPreference: data.portfolioPreference || data.interest || 'General Inventory',
          capitalAllocation: data.capitalAllocation || data.budget || 'N/A',
          strategicIntensity: data.strategicIntensity || data.priority || 'warm',
          originChannel: data.originChannel || data.via || 'WhatsApp',
          intelligenceScore: data.intelligenceScore || data.score || 0,
          aiProfiling: data.aiProfiling || { interests: [], topMatches: [] },
          automation: data.automation || { followupReminderEnabled: true, interactionFrequency: 'medium' },
        } as InvestmentStakeholder;
      });

      // Filter by role if profile is loaded
      const filteredLeads = userProfile?.role === 'agent' 
        ? allStakeholders.filter(s => s.assignedPartnerId === user?.uid || s.assignedTo === user?.uid)
        : allStakeholders;

      const grouped = {
        acquisition: filteredLeads.filter(s => s.phase === 'acquisition'),
        consultation: filteredLeads.filter(s => s.phase === 'consultation'),
        inspection: filteredLeads.filter(s => s.phase === 'inspection'),
        structuring: filteredLeads.filter(s => s.phase === 'structuring'),
        settlement: filteredLeads.filter(s => s.phase === 'settlement'),
      };

      setPipelineState(grouped);
      setActiveInventorySize(filteredLeads.length);
      setLoading(false);
    }, (error) => {
      console.error('Pipeline synchronization failure:', error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubscribePartners();
    };
  }, [user, isGuest, userProfile]);

  const calculatePredictiveScore = (draft: Partial<StakeholderDraft | InvestmentStakeholder>) => {
    let base = 50;
    const intensity = draft.strategicIntensity;
    if (intensity === 'hot') base = 82;
    else if (intensity === 'warm') base = 58;
    else if (intensity === 'cold') base = 32;

    const channelWeights: Record<string, number> = { 
      'Referral': 15, 
      'Walk-in': 12, 
      'WhatsApp': 7, 
      'Website': 4, 
      'Instagram': -2 
    };
    
    const weight = channelWeights[draft.originChannel || ''] || 0;
    
    // Simulate more depth: interaction frequency multiplier
    const interactionBonus = ('id' in draft && draft.id) ? 5 : 0; 
    
    const precisionNoise = Math.floor(Math.random() * 8) - 4;
    return Math.min(100, Math.max(0, base + weight + interactionBonus + precisionNoise));
  };

  const onboardStakeholder = async () => {
    try {
      const partner = partners.find(p => p.id === stakeholderDraft.assignedPartnerId);
      
      // Data Isolation Logic: Auto-assign to current agent if they are onboarding
      const assignedPartnerId = userProfile?.role === 'agent' ? user?.uid : (stakeholderDraft.assignedPartnerId || '');
      const assignedPartnerName = userProfile?.role === 'agent' ? userProfile.displayName : (partner?.name || '');

      const docRef = await addDoc(collection(db, 'leads'), {
        ...stakeholderDraft,
        assignedPartnerId,
        assignedPartnerName,
        assignedTo: assignedPartnerId,
        phase: 'acquisition',
        intelligenceScore: calculatePredictiveScore(stakeholderDraft),
        aiProfiling: {
          interests: [stakeholderDraft.portfolioPreference],
          topMatches: [],
          lastAnalyzedAt: serverTimestamp(),
        },
        automation: {
          followupReminderEnabled: true,
          interactionFrequency: stakeholderDraft.strategicIntensity === 'hot' ? 'high' : 'medium',
        },
        createdAt: serverTimestamp()
      });

      const analytics = await getAnalyticsInstance();
      if (analytics) {
        logEvent(analytics, 'stakeholder_onboarded', {
          name: stakeholderDraft.name,
          intensity: stakeholderDraft.strategicIntensity,
          channel: stakeholderDraft.originChannel
        });
      }

      await logAuditAction({
        action: 'STAKEHOLDER_ONBOARD',
        performer: 'Executive Admin', // In a real app, this would be from Auth
        performerId: 'system',
        targetId: docRef.id,
        targetType: 'stakeholder',
        details: `Onboarded ${stakeholderDraft.name} into acquisition phase.`
      });

      setShowModal(false);
      setStakeholderDraft(INITIAL_STAKEHOLDER_STATE);
    } catch (err) {
      console.error('Stakeholder onboarding failure:', err);
    }
  };

  const advancePhase = async (id: string, currentPhase: PipelinePhase) => {
    const nextIdx = PHASE_SEQUENCE.indexOf(currentPhase) + 1;
    if (nextIdx >= PHASE_SEQUENCE.length) return;
    const targetPhase = PHASE_SEQUENCE[nextIdx];
    try {
      const docRef = doc(db, 'leads', id);
      const updates: any = { 
        phase: targetPhase,
        lastStrategicInteraction: serverTimestamp()
      };

      // Automated GCI Calculation on Settlement
      if (targetPhase === 'settlement') {
        const stakeholder = [...Object.values(pipelineState)].flat().find(s => s.id === id);
        if (stakeholder && stakeholder.dealValue && stakeholder.commissionPercentage) {
          updates.finalGci = (stakeholder.dealValue * stakeholder.commissionPercentage) / 100;
          updates.settledAt = serverTimestamp();
        }
      }

      await updateDoc(docRef, updates);

      const analytics = await getAnalyticsInstance();
      if (analytics) {
        logEvent(analytics, targetPhase === 'settlement' ? 'deal_closed' : 'phase_transition', {
          stakeholder_id: id,
          target_phase: targetPhase,
          gci: updates.finalGci || 0
        });
      }

      await logAuditAction({
        action: targetPhase === 'settlement' ? 'SETTLEMENT_FINALIZED' : 'PHASE_TRANSITION',
        performer: 'Executive Admin',
        performerId: 'system',
        targetId: id,
        targetType: 'stakeholder',
        details: `Migrated stakeholder ${id} to ${targetPhase}`
      });
    } catch (err) {
      console.error('Phase transition failure:', err);
    }
  };

  const handlePhaseMigration = async (toPhase: PipelinePhase) => {
    if (!dragging || dragging.currentPhase === toPhase) return;
    try {
      const docRef = doc(db, 'leads', dragging.id);
      const updates: any = { 
        phase: toPhase,
        lastStrategicInteraction: serverTimestamp() 
      };

      if (toPhase === 'settlement') {
        const stakeholder = [...Object.values(pipelineState)].flat().find(s => s.id === dragging.id);
        if (stakeholder && stakeholder.dealValue && stakeholder.commissionPercentage) {
          updates.finalGci = (stakeholder.dealValue * stakeholder.commissionPercentage) / 100;
          updates.settledAt = serverTimestamp();
        }
      }

      await updateDoc(docRef, updates);

      const analytics = await getAnalyticsInstance();
      if (analytics) {
        logEvent(analytics, toPhase === 'settlement' ? 'deal_closed' : 'phase_transition', {
          stakeholder_id: dragging.id,
          target_phase: toPhase,
          gci: updates.finalGci || 0
        });
      }

      await logAuditAction({
        action: toPhase === 'settlement' ? 'SETTLEMENT_FINALIZED' : 'PHASE_TRANSITION',
        performer: 'Executive Admin',
        performerId: 'system',
        targetId: dragging.id,
        targetType: 'stakeholder',
        details: `Strategic relocation of stakeholder to ${toPhase}`
      });

      setDragging(null);
      setPhaseTarget(null);
    } catch (err) {
      console.error('Strategic relocation failure:', err);
    }
  };

  const syncLeadsFromPF = async () => {
    setSyncingPF(true);
    try {
      const response = await fetch('/api/property-finder?action=sync-leads', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error);

      const summary = result.summary || { created: 0, updated: 0, skipped: 0 };
      alert(`Property Finder sync completed. Added ${summary.created}, refreshed ${summary.updated}, skipped ${summary.skipped}.`);
    } catch (err) {
      console.error("PF Sync Error:", err);
      alert("Synchronization protocol failed to establish secure link with Property Finder. Check gateway configuration.");
    } finally {
      setSyncingPF(false);
    }
  };

  const visiblePipelineState = PHASE_SEQUENCE.reduce((acc, phase) => {
    acc[phase] = pipelineState[phase].filter((stakeholder) => matchesStakeholderFilters(stakeholder, filters));
    return acc;
  }, {
    acquisition: [] as InvestmentStakeholder[],
    consultation: [] as InvestmentStakeholder[],
    inspection: [] as InvestmentStakeholder[],
    structuring: [] as InvestmentStakeholder[],
    settlement: [] as InvestmentStakeholder[],
  });

  const visibleStakeholders = Object.values(visiblePipelineState).flat();
  const hotStakeholders = visibleStakeholders.filter((stakeholder) => stakeholder.strategicIntensity === 'hot').length;
  const closeReady = visiblePipelineState.structuring.length + visiblePipelineState.settlement.length;
  const pipelineValue = visibleStakeholders.reduce((total, stakeholder) => total + (stakeholder.dealValue || 0), 0);

  if (loading) {
    return (
      <div className="section-loader">
        <div className="loader-logo sm">SB</div>
        <div className="loader-text sm">Synchronizing Opportunity Pipeline…</div>
      </div>
    );
  }

  return (
    <div className="crm-view animate-fade-in">
      <div className="page-header">
        <div className="header-flex">
          <div>
            <h1>Command Intelligence: Strategic Pipeline</h1>
            <div className="page-sub">Analyzing {visibleStakeholders.length} of {activeInventorySize} active investment stakeholders within the conversion lifecycle</div>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={syncLeadsFromPF} disabled={syncingPF}>
              <span className="icon">🌐</span> {syncingPF ? 'Syncing...' : 'Sync Property Finder'}
            </button>
            <button className="btn btn-ghost" disabled={matchingLeads} onClick={async () => {
              try {
                setMatchingLeads(true);
                const res = await fetch('/api/matching?bulk=true', { method: 'POST' });
                if (res.ok) alert('Neural matching orchestrator initiated.');
              } finally {
                setMatchingLeads(false);
              }
            }}>
              <span className="icon">⚡</span> {matchingLeads ? 'Matching...' : 'Neural Match'}
            </button>
            <button className="btn btn-gold" onClick={() => setShowModal(true)}>
              <span className="plus">+</span> Onboard Prospect
            </button>
          </div>
        </div>
      </div>

      <div className="crm-filter-bar">
        <div className="crm-search-shell">
          <Search size={16} />
          <input
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Search by name, phone, advisor, channel, or interest"
          />
        </div>

        <select value={filters.intensity} onChange={(event) => setFilters((prev) => ({ ...prev, intensity: event.target.value as StakeholderFilters['intensity'] }))}>
          <option value="all">All priority</option>
          <option value="hot">Hot only</option>
          <option value="warm">Warm only</option>
          <option value="cold">Cold only</option>
        </select>

        <select value={filters.channel} onChange={(event) => setFilters((prev) => ({ ...prev, channel: event.target.value }))}>
          <option value="all">All channels</option>
          {Object.keys(CHANNEL_METADATA).map((channel) => (
            <option key={channel} value={channel}>{channel}</option>
          ))}
        </select>

        <select value={filters.partnerId} onChange={(event) => setFilters((prev) => ({ ...prev, partnerId: event.target.value }))}>
          <option value="all">All advisors</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>{partner.name}</option>
          ))}
        </select>
      </div>

      <div className="pipeline-metrics-row">
        <div className="metric-card-glass">
          <div className="metric-label">Visible Pipeline</div>
          <div className="metric-value" style={{ color: 'var(--navy)' }}>{visibleStakeholders.length}</div>
          <div className="metric-trend">Filtered operating view</div>
        </div>
        <div className="metric-card-glass">
          <div className="metric-label">Hot Prospects</div>
          <div className="metric-value" style={{ color: '#dc2626' }}>{hotStakeholders}</div>
          <div className="metric-trend">Immediate follow-up priority</div>
        </div>
        <div className="metric-card-glass">
          <div className="metric-label">Close Ready</div>
          <div className="metric-value" style={{ color: 'var(--gold)' }}>{closeReady}</div>
          <div className="metric-trend">Structuring + settlement</div>
        </div>
        <div className="metric-card-glass">
          <div className="metric-label">Pipeline Value</div>
          <div className="metric-value" style={{ color: 'var(--success)' }}>
            {pipelineValue > 0 ? `${(pipelineValue / 1000000).toFixed(1)}M` : '0'}
          </div>
          <div className="metric-trend">Estimated deal volume (EGP)</div>
        </div>
        {PHASE_SEQUENCE.map(phase => (
          <div key={phase} className="metric-card-glass">
            <div className="metric-label">{PHASE_DEFS[phase].title}</div>
            <div className="metric-value" style={{ color: PHASE_DEFS[phase].color }}>
              {visiblePipelineState[phase].length}
            </div>
            <div className="metric-trend">
              {visiblePipelineState[phase].length > 0 ? 'Active Deployment' : 'Idle Queue'}
            </div>
          </div>
        ))}
      </div>

      <div className="kanban-scroller">
        <div className="kanban-board-premium">
          {PHASE_SEQUENCE.map(phase => (
            <div
              key={phase}
              className={`kanban-col-premium ${phaseTarget === phase ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setPhaseTarget(phase); }}
              onDragLeave={() => setPhaseTarget(null)}
              onDrop={() => handlePhaseMigration(phase)}
            >
              <div className="kanban-col-header-premium" style={{ '--accent': PHASE_DEFS[phase].color } as React.CSSProperties}>
                <div className="header-top">
                  <h3 className="col-title">{PHASE_DEFS[phase].title}</h3>
                  <span className="col-badge" style={{ background: PHASE_DEFS[phase].color }}>{visiblePipelineState[phase].length}</span>
                </div>
                <p className="col-sub">{PHASE_DEFS[phase].description}</p>
              </div>

              <div className="kanban-cards-premium">
                {visiblePipelineState[phase].map((stakeholder: InvestmentStakeholder) => (
                  <StakeholderCard 
                    key={stakeholder.id} 
                    stakeholder={stakeholder} 
                    phase={phase} 
                    onProgress={advancePhase} 
                    onDragStart={(id, p) => setDragging({ id, currentPhase: p })}
                  />
                ))}
                {visiblePipelineState[phase].length === 0 && (
                  <div className="empty-reservoir">
                    <div className="empty-icon">⌘</div>
                    <p>{filters.search || filters.intensity !== 'all' || filters.channel !== 'all' || filters.partnerId !== 'all' ? 'No stakeholders match the active filters' : 'Reserved for future asset assignments'}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay reveal" onClick={() => setShowModal(false)}>
          <div className="modal-content-luxury glass-effect" onClick={e => e.stopPropagation()}>
            <div className="modal-header-luxury">
              <h2>Prospect Specification</h2>
              <p>Initialize a new strategic relationship within the portfolio ecosystem</p>
            </div>
            
            <div className="specification-grid">
              <div className="spec-group full">
                <label>Prospect Identity</label>
                <input 
                  autoFocus
                  placeholder="Full Legal Name"
                  value={stakeholderDraft.name} 
                  onChange={e => setStakeholderDraft(p => ({ ...p, name: e.target.value }))} 
                />
              </div>
              
              <div className="spec-group">
                <label>Direct Contact (International)</label>
                <input 
                  placeholder="+20 1XX XXX XXXX"
                  value={stakeholderDraft.phone} 
                  onChange={e => setStakeholderDraft(p => ({ ...p, phone: e.target.value }))} 
                />
              </div>
              
              <div className="spec-group">
                <label>Inventory Profile Interest</label>
                <input 
                  placeholder="e.g. Waterfront Mansion"
                  value={stakeholderDraft.portfolioPreference} 
                  onChange={e => setStakeholderDraft(p => ({ ...p, portfolioPreference: e.target.value }))} 
                />
              </div>
              
              <div className="spec-group">
                <label>Capital Allocation (EGP)</label>
                <input 
                  placeholder="e.g. 25M - 40M"
                  value={stakeholderDraft.capitalAllocation} 
                  onChange={e => setStakeholderDraft(p => ({ ...p, capitalAllocation: e.target.value }))} 
                />
              </div>

              <div className="spec-group">
                <label>Engagement Velocity</label>
                <select value={stakeholderDraft.strategicIntensity} onChange={e => setStakeholderDraft(p => ({ ...p, strategicIntensity: e.target.value as any }))}>
                  <option value="hot">Critical Intent / Hot</option>
                  <option value="warm">Proactive / Warm</option>
                  <option value="cold">Observational / Cold</option>
                </select>
              </div>

              <div className="spec-group">
                <label>Estimated Value (EGP)</label>
                <input 
                  type="number"
                  placeholder="e.g. 5000000"
                  value={stakeholderDraft.dealValue} 
                  onChange={e => setStakeholderDraft(p => ({ ...p, dealValue: Number(e.target.value) }))} 
                />
              </div>

              <div className="spec-group">
                <label>Target Commission (%)</label>
                <input 
                  type="number"
                  step="0.1"
                  placeholder="2.5"
                  value={stakeholderDraft.commissionPercentage} 
                  onChange={e => setStakeholderDraft(p => ({ ...p, commissionPercentage: Number(e.target.value) }))} 
                />
              </div>

              <div className="spec-group">
                <label>Assigned Executive Partner</label>
                <select value={stakeholderDraft.assignedPartnerId} onChange={e => setStakeholderDraft(p => ({ ...p, assignedPartnerId: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="spec-group full">
                <label>Origin Acquisition Channel</label>
                <div className="channel-grid">
                  {Object.keys(CHANNEL_METADATA).map(v => (
                    <button 
                      key={v}
                      type="button"
                      className={`channel-btn ${stakeholderDraft.originChannel === v ? 'selected' : ''}`}
                      onClick={() => setStakeholderDraft(p => ({ ...p, originChannel: v }))}
                    >
                      <span className="icon">{CHANNEL_METADATA[v].icon}</span>
                      <span className="label">{v}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions-luxury">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Terminate Entry</button>
              <button className="btn btn-gold shadow-gold" onClick={onboardStakeholder}>Authorize Prospect Record</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .crm-filter-bar {
          display: grid;
          grid-template-columns: minmax(260px, 1.6fr) repeat(3, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .crm-filter-bar select,
        .crm-search-shell {
          height: 48px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--surface);
          box-shadow: var(--card-shadow);
        }

        .crm-filter-bar select {
          padding: 0 14px;
          color: var(--text-primary);
        }

        .crm-search-shell {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          color: var(--text-secondary);
        }

        .crm-search-shell input {
          width: 100%;
          border: none;
          background: transparent;
          color: var(--text-primary);
          outline: none;
          font-size: 14px;
        }

        .kanban-scroller {
          overflow-x: auto;
          margin: 0 -32px;
          padding: 0 32px 20px;
        }

        .kanban-board-premium {
          display: flex;
          gap: 20px;
          min-width: max-content;
        }

        .kanban-col-premium {
          width: 320px;
          background: rgba(11, 26, 62, 0.02);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(11, 26, 62, 0.05);
          transition: all 0.3s ease;
        }

        [data-theme="dark"] .kanban-col-premium {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.05);
        }

        .kanban-col-premium.drag-over {
          background: rgba(200, 169, 110, 0.05);
          border-color: var(--gold);
          transform: scale(1.02);
        }

        .kanban-col-header-premium {
          padding: 20px;
          border-top: 4px solid var(--accent);
          background: var(--surface);
          border-radius: 16px 16px 0 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }

        .header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .col-title {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: var(--accent);
          text-transform: uppercase;
        }

        .col-badge {
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .col-sub {
          font-size: 11.5px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .kanban-cards-premium {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
          min-height: 400px;
        }

        .stakeholder-card-premium {
          background: var(--surface);
          border-radius: 14px;
          border: 1px solid var(--border);
          padding: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: grab;
        }

        .stakeholder-card-premium:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(11, 26, 62, 0.08);
          border-color: var(--blue-light);
        }

        .stakeholder-card-premium:active { cursor: grabbing; }

        .stakeholder-card-gloss {
          position: absolute;
          top: -100%;
          left: -100%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 50% 50%, rgba(200, 169, 110, 0.05), transparent 70%);
          pointer-events: none;
        }

        .stakeholder-card-header-premium {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .stakeholder-name-main {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .stakeholder-origin {
          font-size: 11px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .intel-score {
          width: 34px;
          height: 34px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .intel-svg {
          position: absolute;
          inset: 0;
          transform: rotate(-90deg);
          transition: all 1s ease;
        }

        .intel-high { color: var(--success); }
        .intel-mid { color: var(--warning); }
        .intel-low { color: var(--text-secondary); }

        .intel-score-val {
          font-size: 10px;
          font-weight: 800;
          position: relative;
          z-index: 2;
        }

        .strategic-pulse {
          position: absolute;
          top: 8px; right: 8px;
          width: 6px; height: 6px;
          background: var(--error);
          border-radius: 50%;
          z-index: 10;
        }
        .strategic-pulse::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1px solid var(--error);
          animation: pulse-hot 1.5s infinite;
        }

        @keyframes pulse-hot {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .stakeholder-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }

        [data-theme="dark"] .stakeholder-info-grid { border-bottom-color: rgba(255,255,255,0.04); }

        .info-label {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          margin-bottom: 2px;
        }

        .info-val {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .gold-text { color: var(--gold); }

        .stakeholder-contact-line,
        .stakeholder-assignment-line {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          color: var(--text-secondary);
        }

        .stakeholder-assignment-line {
          margin-bottom: 8px;
          color: var(--gold);
          font-weight: 600;
        }

        .stakeholder-card-footer-premium {
          margin-top: 14px;
        }

        .neural-matches-mini {
          background: rgba(200, 169, 110, 0.04);
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 12px;
          border: 1px solid rgba(200, 169, 110, 0.1);
        }

        .neural-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .neural-icon { font-size: 10px; }
        .neural-title {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--gold);
        }

        .match-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .match-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface);
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--border);
        }

        .match-score {
          font-size: 10px;
          font-weight: 800;
          color: var(--success);
        }

        .match-reason {
          font-size: 9px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .incentive-badge-mini {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-top: 8px;
        }

        .card-actions-row {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .btn-generate-proposal {
          flex: 1;
          background: var(--navy);
          color: var(--gold);
          border: 1px solid var(--gold);
          border-radius: 8px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-generate-proposal:hover:not(:disabled) {
          background: var(--gold);
          color: var(--navy);
          box-shadow: 0 4px 12px rgba(200, 169, 110, 0.2);
        }

        .btn-generate-proposal.loading {
          opacity: 0.7;
          cursor: wait;
        }

        .btn-progress-stakeholder {
          width: 80px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .stakeholder-timer {
          font-size: 11px;
          color: var(--text-secondary);
          font-style: italic;
        }

        .priority-pill {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }

        .priority-hot { background: rgba(220, 38, 38, 0.1); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.2); }
        .priority-warm { background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.2); }
        .priority-cold { background: rgba(46, 109, 180, 0.1); color: #2e6db4; border: 1px solid rgba(46, 109, 180, 0.2); }

        .btn-progress-stakeholder {
          width: 80px;
          background: rgba(11, 26, 62, 0.03);
          border: 1px solid rgba(11, 26, 62, 0.1);
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--navy);
          cursor: pointer;
          transition: all 0.2s;
        }

        [data-theme="dark"] .btn-progress-stakeholder {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          color: var(--blue-light);
        }

        .btn-progress-stakeholder:hover {
          background: var(--navy);
          color: #fff;
          border-color: var(--navy);
        }

        .btn-progress-stakeholder:hover .arrow {
          transform: translateX(4px);
        }

        .arrow { transition: transform 0.2s; }

        .empty-reservoir {
          margin-top: 40px;
          text-align: center;
          padding: 20px;
          border: 1px dashed rgba(0,0,0,0.1);
          border-radius: 12px;
          opacity: 0.4;
        }

        [data-theme="dark"] .empty-reservoir { border-color: rgba(255,255,255,0.1); }

        .empty-icon { font-size: 24px; margin-bottom: 8px; }

        /* Metrics */
        .pipeline-metrics-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 30px;
        }

        .metric-card-glass {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          box-shadow: var(--card-shadow);
        }

        .metric-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .metric-trend {
          font-size: 10px;
          color: var(--text-secondary);
        }

        /* Modal Extensions */
        .modal-content-luxury {
          width: 100%;
          max-width: 650px;
          background: var(--surface);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
          position: relative;
        }

        .glass-effect {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(200, 169, 110, 0.3);
        }

        [data-theme="dark"] .glass-effect {
          background: rgba(10, 15, 28, 0.95);
          border-color: rgba(200, 169, 110, 0.2);
        }

        .modal-header-luxury h2 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          color: var(--navy);
        }

        [data-theme="dark"] .modal-header-luxury h2 { color: var(--gold); }

        .specification-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 30px;
        }

        .spec-group.full { grid-column: span 2; }

        .spec-group label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .spec-group input, 
        .spec-group select {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          font-size: 14px;
          color: var(--text-primary);
          transition: all 0.2s;
        }

        .spec-group input:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 4px rgba(200, 169, 110, 0.1);
        }

        .channel-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }

        .channel-btn {
          padding: 10px 4px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface-2);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .channel-btn.selected {
          background: var(--navy);
          border-color: var(--gold);
        }

        .channel-btn.selected .label { color: #fff; }
        
        .channel-btn .icon { font-size: 16px; }
        .channel-btn .label { font-size: 10px; font-weight: 600; color: var(--text-secondary); }

        .modal-actions-luxury {
          margin-top: 40px;
          display: flex;
          justify-content: flex-end;
          gap: 16px;
        }

        @media (max-width: 1200px) {
          .crm-filter-bar {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .header-actions,
          .crm-filter-bar {
            grid-template-columns: 1fr;
            display: grid;
          }

          .header-actions {
            width: 100%;
          }
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.4s ease forwards;
        }
      `}</style>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Send, Mail, Phone, Briefcase, Clock, MapPin, ArrowRight,
  Users, Rocket, Heart, Shield, Zap, Globe, ChevronDown,
  CheckCircle, Star, TrendingUp, GraduationCap, Coffee,
  Laptop, Palmtree, Dumbbell, HeartPulse,
} from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const VALUES = [
  { icon: Rocket, title: 'Innovation First', desc: 'We don\'t follow PropTech trends — we build them. Every team member has the freedom to ship ideas that reshape how Egypt buys property.' },
  { icon: Users, title: 'One Team', desc: 'Sales, engineering, marketing, operations — we move as one. No silos, no egos. Just people obsessed with building something extraordinary.' },
  { icon: Shield, title: 'Trust & Transparency', desc: 'We handle people\'s life savings. That demands radical honesty — with clients, with partners, with each other.' },
  { icon: Heart, title: 'People Over Process', desc: 'Flexible hours, remote-first engineering, family health coverage. We design policies around lives, not the other way around.' },
];

const PERKS = [
  { icon: Laptop, label: 'Remote-First', sub: 'Engineering & marketing roles are fully remote. Work from anywhere in Egypt.' },
  { icon: HeartPulse, label: 'Health Insurance', sub: 'Comprehensive family coverage from day one — medical, dental, vision.' },
  { icon: GraduationCap, label: 'Learning Budget', sub: 'Annual EGP 15,000 per person for courses, conferences, and certifications.' },
  { icon: Palmtree, label: '30 Days PTO', sub: 'Annual leave + public holidays + your birthday off. We mean it.' },
  { icon: Dumbbell, label: 'Wellness Perks', sub: 'Gym membership subsidy and quarterly team wellness activities.' },
  { icon: Coffee, label: 'Team Culture', sub: 'Monthly offsites, demo days, and a Slack channel dedicated to food pics.' },
];

const DEPARTMENTS = ['All', 'Sales', 'Technology', 'Marketing', 'Operations'] as const;

const JOBS = [
  { title: 'Real Estate Agent', dept: 'Sales', type: 'Full-time', loc: 'New Cairo', urgent: false, desc: 'Join our elite sales team covering New Cairo compounds. AI-powered lead matching, competitive commission structure with uncapped earnings.', skills: ['Client relations', 'Negotiation', 'Market knowledge', 'Arabic & English'] },
  { title: 'Senior AI/ML Engineer', dept: 'Technology', type: 'Full-time', loc: 'Remote / Hybrid', urgent: true, desc: 'Build and optimize our AVM pricing engine, smart match algorithms, and ROI forecaster. Own the ML pipeline end-to-end.', skills: ['Python', 'TensorFlow/PyTorch', 'MLOps', 'Data engineering'] },
  { title: 'Frontend Developer', dept: 'Technology', type: 'Full-time', loc: 'Remote / Hybrid', urgent: false, desc: 'Next.js + React + TypeScript. Build the portal, admin dashboard, and AI tool interfaces. Mobile-first, bilingual EN/AR.', skills: ['React/Next.js', 'TypeScript', 'Tailwind CSS', 'i18n'] },
  { title: 'Backend Developer', dept: 'Technology', type: 'Full-time', loc: 'Remote / Hybrid', urgent: false, desc: 'Firebase Cloud Functions, Firestore, Python FastAPI. Power our data pipeline and WhatsApp bot infrastructure.', skills: ['Node.js', 'Python', 'Firebase', 'REST APIs'] },
  { title: 'Marketing Specialist', dept: 'Marketing', type: 'Full-time', loc: 'New Cairo', urgent: false, desc: 'Digital marketing, social media, Property Finder campaigns, content creation for luxury real estate audience.', skills: ['Digital ads', 'Content strategy', 'Analytics', 'Property Finder'] },
  { title: 'Customer Success Manager', dept: 'Operations', type: 'Full-time', loc: 'New Cairo', urgent: false, desc: 'Guide clients through their property journey — from first inquiry to handover. Bilingual EN/AR, WhatsApp-first communication.', skills: ['Communication', 'Problem-solving', 'CRM tools', 'Bilingual'] },
];

const TESTIMONIALS = [
  { name: 'Nour A.', role: 'AI Engineer, 18 months', quote: 'I joined Sierra because they let me build real ML models that actually go to production — not just notebooks. In 18 months I shipped an AVM engine that prices 200+ compounds.' },
  { name: 'Omar K.', role: 'Sales Agent, 2 years', quote: 'The AI lead matching changed my life. I closed 47 deals last year because the system puts the right client in front of you at the right time. Commission structure is unbeatable.' },
  { name: 'Mai S.', role: 'Marketing Lead, 1 year', quote: 'From day one I had ownership of our brand. No approval chains 5 layers deep — just idea, build, ship, measure. We grew social 340% in my first quarter.' },
];

const PROCESS = [
  { step: '01', title: 'Apply', desc: 'Submit your application with a brief motivation. We review every single one within 48 hours.' },
  { step: '02', title: 'Chat', desc: 'A 30-minute call with our People team to understand your goals and answer your questions.' },
  { step: '03', title: 'Build', desc: 'A practical task related to the role. No trick questions — we want to see how you think and build.' },
  { step: '04', title: 'Welcome', desc: 'Offer, onboarding, and your first week embedded with the team. You\'ll ship code or close a deal before day 5.' },
];

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

export default function CareerPage() {
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [position, setPosition] = useState('');
  const [sent, setSent] = useState(false);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);

  const filtered = deptFilter === 'All' ? JOBS : JOBS.filter(j => j.dept === deptFilter);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <SiteShell active={null}>
      {/* ---- HERO ---- */}
      <header className="cr-hero">
        <div className="cr-wrap">
          <div className="cr-badge">WE&apos;RE HIRING</div>
          <h1 className="cr-hero-title">Build the Future<br />of Real Estate</h1>
          <p className="cr-hero-sub">
            Sierra Estates is where AI meets luxury property in New Cairo. We&apos;re assembling
            a world-class team to reshape how 100 million Egyptians buy, sell, and invest.
          </p>
          <div className="cr-hero-stats">
            <div className="cr-stat"><span className="cr-stat-num">30+</span><span className="cr-stat-label">Team Members</span></div>
            <div className="cr-stat"><span className="cr-stat-num">4</span><span className="cr-stat-label">Countries</span></div>
            <div className="cr-stat"><span className="cr-stat-num">200+</span><span className="cr-stat-label">Compounds Mapped</span></div>
            <div className="cr-stat"><span className="cr-stat-num">EGP 2B+</span><span className="cr-stat-label">Portfolio Tracked</span></div>
          </div>
          <a href="#positions" className="cr-cta">
            View Open Roles <ArrowRight className="cr-cta-icon" />
          </a>
        </div>
      </header>

      {/* ---- VALUES ---- */}
      <section className="cr-section">
        <div className="cr-wrap">
          <div className="cr-section-label">WHY SIERRA</div>
          <h2 className="cr-section-title">What We Stand For</h2>
          <div className="cr-values-grid">
            {VALUES.map(v => (
              <div className="cr-value-card" key={v.title}>
                <div className="cr-value-icon"><v.icon /></div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- PERKS ---- */}
      <section className="cr-section cr-section--alt">
        <div className="cr-wrap">
          <div className="cr-section-label">BENEFITS</div>
          <h2 className="cr-section-title">Perks That Matter</h2>
          <div className="cr-perks-grid">
            {PERKS.map(p => (
              <div className="cr-perk-card" key={p.label}>
                <div className="cr-perk-icon"><p.icon /></div>
                <div>
                  <h4>{p.label}</h4>
                  <p>{p.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- TESTIMONIALS ---- */}
      <section className="cr-section">
        <div className="cr-wrap">
          <div className="cr-section-label">FROM THE TEAM</div>
          <h2 className="cr-section-title">Hear From Your Future Colleagues</h2>
          <div className="cr-testimonials">
            {TESTIMONIALS.map(t => (
              <div className="cr-testimonial-card" key={t.name}>
                <div className="cr-testimonial-stars">
                  {[...Array(5)].map((_, i) => <Star key={i} className="cr-star-icon" />)}
                </div>
                <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
                <div className="cr-testimonial-author">
                  <div className="cr-testimonial-avatar">{t.name[0]}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- PROCESS ---- */}
      <section className="cr-section cr-section--alt">
        <div className="cr-wrap">
          <div className="cr-section-label">HIRING PROCESS</div>
          <h2 className="cr-section-title">From Application to Offer in 2 Weeks</h2>
          <div className="cr-process">
            {PROCESS.map(p => (
              <div className="cr-process-step" key={p.step}>
                <div className="cr-process-num">{p.step}</div>
                <h4>{p.title}</h4>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- OPEN POSITIONS ---- */}
      <section className="cr-section" id="positions">
        <div className="cr-wrap">
          <div className="cr-section-label">CAREERS</div>
          <h2 className="cr-section-title">Open Positions</h2>
          <div className="cr-dept-filters">
            {DEPARTMENTS.map(d => (
              <button
                key={d}
                className={`cr-dept-btn ${deptFilter === d ? 'cr-dept-btn--active' : ''}`}
                onClick={() => setDeptFilter(d)}
              >
                {d}
                {d !== 'All' && <span className="cr-dept-count">{JOBS.filter(j => j.dept === d).length}</span>}
              </button>
            ))}
          </div>
          <div className="cr-jobs-list">
            {filtered.map((j, idx) => (
              <div
                className={`cr-job-card ${j.urgent ? 'cr-job-card--urgent' : ''}`}
                key={j.title}
              >
                <div className="cr-job-header" onClick={() => setExpandedJob(expandedJob === idx ? null : idx)}>
                  <div className="cr-job-main">
                    <h3>{j.title}</h3>
                    <div className="cr-job-meta">
                      <span><Briefcase className="cr-meta-icon" /> {j.dept}</span>
                      <span><Clock className="cr-meta-icon" /> {j.type}</span>
                      <span><MapPin className="cr-meta-icon" /> {j.loc}</span>
                    </div>
                  </div>
                  <div className="cr-job-actions">
                    {j.urgent && <span className="cr-urgent-badge">URGENT</span>}
                    <ChevronDown className={`cr-expand-icon ${expandedJob === idx ? 'cr-expand-icon--open' : ''}`} />
                  </div>
                </div>
                {expandedJob === idx && (
                  <div className="cr-job-detail">
                    <p>{j.desc}</p>
                    <div className="cr-job-skills">
                      {j.skills.map(s => <span className="cr-skill-tag" key={s}>{s}</span>)}
                    </div>
                    <a href="#apply" className="cr-job-apply" onClick={() => setPosition(j.title)}>
                      Apply for this role <ArrowRight className="cr-cta-icon" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- APPLICATION FORM ---- */}
      <section className="cr-section cr-section--alt cr-form-section" id="apply">
        <div className="cr-wrap">
          <div className="cr-section-label">APPLY</div>
          <h2 className="cr-section-title">Start Your Journey</h2>
          <div className="cr-form-card">
            <form onSubmit={onSubmit}>
              <div className="cr-form-row">
                <div className="cr-form-group">
                  <label htmlFor="f-name">Full Name</label>
                  <input type="text" id="f-name" required placeholder="Ahmed Fawzy" />
                </div>
                <div className="cr-form-group">
                  <label htmlFor="f-phone">Phone</label>
                  <input type="tel" id="f-phone" required placeholder="+2 01XXXXXXXXX" />
                </div>
              </div>
              <div className="cr-form-row">
                <div className="cr-form-group">
                  <label htmlFor="f-email">Email</label>
                  <input type="email" id="f-email" required placeholder="you@example.com" />
                </div>
                <div className="cr-form-group">
                  <label htmlFor="f-position">Position</label>
                  <select
                    id="f-position"
                    required
                    aria-label="Position applied for"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  >
                    <option value="">Select a position...</option>
                    {JOBS.map(j => <option key={j.title}>{j.title}</option>)}
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="cr-form-group">
                <label htmlFor="f-experience">Years of Experience</label>
                <input type="number" id="f-experience" min={0} max={30} placeholder="3" />
              </div>
              <div className="cr-form-group">
                <label htmlFor="f-message">Why Sierra? (Brief motivation)</label>
                <textarea id="f-message" rows={4} placeholder="Tell us why you want to join Sierra Estates..." />
              </div>
              <div className="cr-form-group">
                <label htmlFor="f-cv">CV / Resume (PDF, DOCX)</label>
                <input type="file" id="f-cv" accept=".pdf,.doc,.docx" className="cr-file-input" />
              </div>
              <button type="submit" className="cr-submit-btn">
                <Send className="cr-submit-icon" />
                Submit Application
              </button>
              {sent && (
                <div className="cr-success-msg">
                  <CheckCircle className="cr-success-icon" />
                  Application submitted successfully! We&apos;ll review it within 48 hours and get back to you.
                </div>
              )}
            </form>
          </div>
          <div className="cr-contact-bar">
            <a href="mailto:info@Sierra-Estates.net" className="cr-contact-item">
              <Mail className="cr-contact-icon" /> info@Sierra-Estates.net
            </a>
            <a href="https://wa.me/201092048333" target="_blank" rel="noopener noreferrer" className="cr-contact-item">
              <Phone className="cr-contact-icon" /> +2 01092048333
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

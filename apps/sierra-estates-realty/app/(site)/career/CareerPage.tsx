'use client';

/** Port of deploy/career.html. */
import React, { useState } from 'react';
import { Send, Mail, Phone, Briefcase, Clock, MapPin, ArrowRight } from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';

const JOBS = [
  { title: 'Real Estate Agent', dept: 'Sales', type: 'Full-time', loc: 'New Cairo', desc: 'Join our elite sales team covering New Cairo compounds. AI-powered lead matching, competitive commission structure.' },
  { title: 'AI/ML Engineer', dept: 'Technology', type: 'Full-time', loc: 'Remote / Hybrid', desc: 'Build and optimize our AVM pricing engine, smart match algorithms, and ROI forecaster. Python + TensorFlow.' },
  { title: 'Frontend Developer', dept: 'Technology', type: 'Full-time', loc: 'Remote / Hybrid', desc: 'Next.js + React + TypeScript. Build the portal, admin dashboard, and AI tool interfaces. Mobile-first, bilingual EN/AR.' },
  { title: 'Backend Developer', dept: 'Technology', type: 'Full-time', loc: 'Remote / Hybrid', desc: 'Firebase Cloud Functions, Firestore, Python FastAPI. Power our data pipeline and WhatsApp bot infrastructure.' },
  { title: 'Marketing Specialist', dept: 'Marketing', type: 'Full-time', loc: 'New Cairo', desc: 'Digital marketing, social media, Property Finder campaigns, content creation for luxury real estate audience.' },
  { title: 'Customer Success', dept: 'Operations', type: 'Full-time', loc: 'New Cairo', desc: 'Guide clients through their property journey — from first inquiry to handover. Bilingual EN/AR, WhatsApp-first.' },
];

const POSITIONS = [
  'Real Estate Agent', 'AI/ML Engineer', 'Frontend Developer',
  'Backend Developer', 'Marketing Specialist', 'Customer Success', 'Other',
];

export default function CareerPage() {
  const [position, setPosition] = useState('');
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <SiteShell active={null}>
      <header className="hero-career">
        <div className="wrap">
          <div className="eyebrow">WE&apos;RE HIRING</div>
          <h1>Build the Future of Real Estate</h1>
          <p>
            Join Sierra Estates — where AI meets luxury property in New Cairo. We&apos;re looking for
            passionate people who want to shape the future of PropTech in Egypt.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <h2>Open Positions</h2>
          <div id="jobs-list">
            {JOBS.map((j) => (
              <div className="job-card" key={j.title} data-job={j.title}>
                <h3>{j.title}</h3>
                <div className="meta">
                  <span><Briefcase className="i" /> {j.dept}</span>
                  <span><Clock className="i" /> {j.type}</span>
                  <span><MapPin className="i" /> {j.loc}</span>
                </div>
                <p>{j.desc}</p>
                <a
                  href="#apply"
                  className="apply-btn"
                  onClick={() => setPosition(j.title)}
                >
                  <ArrowRight className="i" /> Apply Now
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="form-section" id="apply">
        <div className="wrap">
          <h2 className="apply-title">Apply Now</h2>
          <div className="form-card">
            <form id="career-form" onSubmit={onSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="f-name">Full Name</label>
                  <input type="text" id="f-name" required placeholder="Ahmed Fawzy" />
                </div>
                <div className="form-group">
                  <label htmlFor="f-phone">Phone</label>
                  <input type="tel" id="f-phone" required placeholder="+2 01XXXXXXXXX" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="f-email">Email</label>
                  <input type="email" id="f-email" required placeholder="you@example.com" />
                </div>
                <div className="form-group">
                  <label htmlFor="f-position">Position</label>
                  <select
                    id="f-position"
                    required
                    aria-label="Position applied for"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  >
                    <option value="">Select a position...</option>
                    {POSITIONS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="f-experience">Years of Experience</label>
                <input type="number" id="f-experience" min={0} max={30} placeholder="3" />
              </div>
              <div className="form-group">
                <label htmlFor="f-message">Why Sierra? (Brief motivation)</label>
                <textarea id="f-message" rows={4} placeholder="Tell us why you want to join Sierra Estates..." />
              </div>
              <div className="form-group">
                <label htmlFor="f-cv">CV / Resume (PDF, DOCX)</label>
                <input type="file" id="f-cv" accept=".pdf,.doc,.docx" className="file-input" />
              </div>
              <button type="submit" className="form-submit">
                <Send className="send-icon" />
                Submit Application
              </button>
              {sent && (
                <div className="success-msg" id="success-msg" style={{ display: 'block' }}>
                  ✓ Application submitted successfully! We&apos;ll contact you within 48 hours.
                </div>
              )}
              <div className="export-note">Applications are exported to Excel for HR review.</div>
            </form>
          </div>
          <div className="contact-info">
            <a href="mailto:info@Sierra-Estates.net" className="contact-item">
              <Mail className="i" /> info@Sierra-Estates.net
            </a>
            <a href="https://wa.me/201092048333" target="_blank" rel="noopener noreferrer" className="contact-item">
              <Phone className="i" /> +2 01092048333
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

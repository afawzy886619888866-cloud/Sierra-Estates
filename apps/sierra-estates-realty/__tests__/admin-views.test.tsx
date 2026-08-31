/**
 * Admin Panel Views — Render & Behaviour Suite
 *
 * Uses React's renderToStaticMarkup (SSR-safe, node env compatible) so we can
 * assert on rendered markup without needing jsdom or @testing-library/react.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AgentsView from '../app/admin/views/AgentsView';
import AlertsView from '../app/admin/views/AlertsView';
import DashboardView from '../app/admin/views/DashboardView';
import HealthView from '../app/admin/views/HealthView';
import ListingsView from '../app/admin/views/ListingsView';
import MonitoringView from '../app/admin/views/MonitoringView';
import RecommendationsView from '../app/admin/views/RecommendationsView';
import RoleManagerView from '../app/admin/views/RoleManagerView';
import SecurityView from '../app/admin/views/SecurityView';

function render(el: React.ReactElement): string {
  return renderToStaticMarkup(el);
}

// ---------------------------------------------------------------------------
// AgentsView
// ---------------------------------------------------------------------------
describe('AgentsView', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) } as Response);
  });

  it('renders in English without throwing', () => {
    expect(() => render(<AgentsView lang="en" />)).not.toThrow();
  });

  it('renders in Arabic without throwing', () => {
    expect(() => render(<AgentsView lang="ar" />)).not.toThrow();
  });

  it('includes Fleet Telemetry tab label in English', () => {
    expect(render(<AgentsView lang="en" />)).toContain('Fleet Telemetry');
  });

  it('includes Arabic fleet label when lang=ar', () => {
    expect(render(<AgentsView lang="ar" />)).toContain('\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0623\u0633\u0637\u0648\u0644');
  });

  it('includes WhatsApp Scheduler tab', () => {
    expect(render(<AgentsView lang="en" />)).toContain('WhatsApp Scheduler');
  });

  it('includes Agent Fleet header', () => {
    expect(render(<AgentsView lang="en" />)).toContain('Agent Fleet');
  });

  it('initial AI welcome message is present', () => {
    expect(render(<AgentsView lang="en" />)).toContain('Sierra AI Fleet Command Deck');
  });
});

// ---------------------------------------------------------------------------
// AlertsView
// ---------------------------------------------------------------------------
describe('AlertsView', () => {
  it('renders in English without throwing', () => {
    expect(() => render(<AlertsView lang="en" />)).not.toThrow();
  });

  it('renders in Arabic without throwing', () => {
    expect(() => render(<AlertsView lang="ar" />)).not.toThrow();
  });

  it('shows threshold warning header', () => {
    const html = render(<AlertsView lang="en" />);
    expect(html).toContain('System Alerts');
    expect(html).toContain('Threshold Warnings');
  });

  it('shows Arabic header when lang=ar', () => {
    expect(render(<AlertsView lang="ar" />)).toContain('\u0645\u0631\u0643\u0632 \u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0627\u0644\u0630\u0643\u064a\u0629');
  });

  it('includes AVM deviation alert card', () => {
    expect(render(<AlertsView lang="en" />)).toContain('AVM Deviation Alert');
  });

  it('includes VIP hot lead alert card', () => {
    expect(render(<AlertsView lang="en" />)).toContain('VIP Hot Lead');
  });

  it('has PRIORITY: HIGH badge', () => {
    expect(render(<AlertsView lang="en" />)).toContain('PRIORITY: HIGH');
  });

  it('has ACTION REQUIRED badge', () => {
    expect(render(<AlertsView lang="en" />)).toContain('ACTION REQUIRED');
  });
});

// ---------------------------------------------------------------------------
// DashboardView
// ---------------------------------------------------------------------------
describe('DashboardView', () => {
  it('renders in English without throwing', () => {
    expect(() => render(<DashboardView lang="en" />)).not.toThrow();
  });

  it('renders in Arabic without throwing', () => {
    expect(() => render(<DashboardView lang="ar" />)).not.toThrow();
  });

  it('shows Executive Dashboard heading', () => {
    expect(render(<DashboardView lang="en" />)).toContain('Executive Dashboard');
  });

  it('shows Arabic heading when lang=ar', () => {
    expect(render(<DashboardView lang="ar" />)).toContain('\u0644\u0648\u062d\u0629 \u0627\u0644\u0642\u064a\u0627\u062f\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629');
  });

  it('shows AI Match Precision metric', () => {
    const html = render(<DashboardView lang="en" />);
    expect(html).toContain('AI Match Precision');
    expect(html).toContain('98.4%');
  });

  it('shows Systems Operational badge', () => {
    expect(render(<DashboardView lang="en" />)).toContain('Systems Operational');
  });

  it('shows Active Catalog value 1,547', () => {
    expect(render(<DashboardView lang="en" />)).toContain('1,547');
  });
});

// ---------------------------------------------------------------------------
// HealthView
// ---------------------------------------------------------------------------
describe('HealthView', () => {
  it('renders in English without throwing', () => {
    expect(() => render(<HealthView lang="en" />)).not.toThrow();
  });

  it('renders in Arabic without throwing', () => {
    expect(() => render(<HealthView lang="ar" />)).not.toThrow();
  });

  it('shows Firestore as HEALTHY', () => {
    const html = render(<HealthView lang="en" />);
    expect(html).toContain('Firestore Database');
    expect(html).toContain('HEALTHY');
  });

  it('shows Pub/Sub Message Bus as ACTIVE', () => {
    const html = render(<HealthView lang="en" />);
    expect(html).toContain('Pub/Sub Message Bus');
    expect(html).toContain('ACTIVE');
  });

  it('shows AI Reasoning API as ONLINE', () => {
    const html = render(<HealthView lang="en" />);
    expect(html).toContain('AI Reasoning API');
    expect(html).toContain('ONLINE');
  });

  it('mentions Gemini model', () => {
    expect(render(<HealthView lang="en" />)).toContain('Gemini');
  });
});

// ---------------------------------------------------------------------------
// ListingsView
// ---------------------------------------------------------------------------
describe('ListingsView', () => {
  it('renders in English without throwing', () => {
    expect(() => render(<ListingsView lang="en" />)).not.toThrow();
  });

  it('renders in Arabic without throwing', () => {
    expect(() => render(<ListingsView lang="ar" />)).not.toThrow();
  });

  it('renders with default props without throwing', () => {
    expect(() => render(<ListingsView />)).not.toThrow();
  });

  it('shows Inventory Management heading', () => {
    expect(render(<ListingsView lang="en" />)).toContain('Inventory');
  });
});

// ---------------------------------------------------------------------------
// MonitoringView
// ---------------------------------------------------------------------------
describe('MonitoringView', () => {
  it('renders in English without throwing', () => {
    expect(() => render(<MonitoringView lang="en" />)).not.toThrow();
  });

  it('renders in Arabic without throwing', () => {
    expect(() => render(<MonitoringView lang="ar" />)).not.toThrow();
  });

  it('shows Live Operations Monitoring heading', () => {
    expect(render(<MonitoringView lang="en" />)).toContain('Live Operations Monitoring');
  });

  it('shows AVM valuation log entry', () => {
    expect(render(<MonitoringView lang="en" />)).toContain('Vertex Omni generated AVM valuation');
  });

  it('shows OpenClaw orchestrator log entry', () => {
    expect(render(<MonitoringView lang="en" />)).toContain('AI Orchestrator running workflow');
  });

  it('shows ai.recommendations pub event', () => {
    expect(render(<MonitoringView lang="en" />)).toContain('ai.recommendations');
  });
});

// ---------------------------------------------------------------------------
// RecommendationsView
// ---------------------------------------------------------------------------
describe('RecommendationsView', () => {
  it('renders in English without throwing', () => {
    expect(() => render(<RecommendationsView lang="en" />)).not.toThrow();
  });

  it('renders in Arabic without throwing', () => {
    expect(() => render(<RecommendationsView lang="ar" />)).not.toThrow();
  });

  it('shows AI Recommendations Hub heading', () => {
    expect(render(<RecommendationsView lang="en" />)).toContain('AI Recommendations Hub');
  });

  it('shows Mivida recommendation card with 96% match', () => {
    const html = render(<RecommendationsView lang="en" />);
    expect(html).toContain('Mivida 3-Bed Apartment');
    expect(html).toContain('Match: 96%');
  });

  it('shows Hyde Park recommendation card with 92% match', () => {
    const html = render(<RecommendationsView lang="en" />);
    expect(html).toContain('Hyde Park 5-Bed Villa');
    expect(html).toContain('Match: 92%');
  });

  it('shows WhatsApp dispatch buttons', () => {
    expect(render(<RecommendationsView lang="en" />)).toContain('Dispatch WhatsApp');
  });
});

// ---------------------------------------------------------------------------
// RoleManagerView
// ---------------------------------------------------------------------------
describe('RoleManagerView', () => {
  it('renders in English without throwing', () => {
    expect(() => render(<RoleManagerView lang="en" />)).not.toThrow();
  });

  it('renders in Arabic without throwing', () => {
    expect(() => render(<RoleManagerView lang="ar" />)).not.toThrow();
  });

  it('shows RBAC heading', () => {
    expect(render(<RoleManagerView lang="en" />)).toContain('Role-Based Access Control');
  });

  it('shows all 4 role labels', () => {
    const html = render(<RoleManagerView lang="en" />);
    expect(html).toContain('Super Admin');
    expect(html).toContain('Operations Manager');
    expect(html).toContain('Real Estate Broker');
    expect(html).toContain('Compliance Auditor');
  });

  it('shows all 4 role codes', () => {
    const html = render(<RoleManagerView lang="en" />);
    ['admin', 'manager', 'agent', 'auditor'].forEach((code) => {
      expect(html).toContain(code);
    });
  });

  it('each role has access description', () => {
    const html = render(<RoleManagerView lang="en" />);
    expect(html).toContain('Full Read/Write');
    expect(html).toContain('Lead Assignment');
    expect(html).toContain('Contract Drafting');
    expect(html).toContain('Read-Only Access');
  });
});

// ---------------------------------------------------------------------------
// SecurityView
// ---------------------------------------------------------------------------
describe('SecurityView', () => {
  it('renders in English without throwing', () => {
    expect(() => render(<SecurityView lang="en" />)).not.toThrow();
  });

  it('renders in Arabic without throwing', () => {
    expect(() => render(<SecurityView lang="ar" />)).not.toThrow();
  });

  it('shows Security & Audit Trails heading', () => {
    const html = render(<SecurityView lang="en" />);
    expect(html).toContain('Security');
    expect(html).toContain('Audit Trails');
  });

  it('shows engine_memory ALLOW audit entry', () => {
    const html = render(<SecurityView lang="en" />);
    expect(html).toContain('engine_memory write authorized');
    expect(html).toContain('ALLOW');
  });

  it('shows admin session token audit entry', () => {
    const html = render(<SecurityView lang="en" />);
    expect(html).toContain('Admin session token validated');
    expect(html).toContain('admin-01');
  });
});

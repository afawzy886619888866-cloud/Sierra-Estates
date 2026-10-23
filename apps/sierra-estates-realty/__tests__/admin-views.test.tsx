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

  it('renders an honest empty state instead of fabricated alerts', () => {
    // §21 (wave 5): four fabricated demo alerts were previously seeded
    // here (an invented AVM deviation, a fake VIP viewing request, a
    // made-up latency spike, a fictitious ingestion batch). The alert
    // center now starts honestly empty.
    const html = render(<AlertsView lang="en" />);
    expect(html).toContain('No alerts');
    expect(html).toContain('demo alerts are never invented');
    expect(html).not.toContain('AVM Deviation Alert');
    expect(html).not.toContain('VIP Hot Lead');
    expect(html).not.toContain('PRIORITY: HIGH');
    expect(html).not.toContain('ACTION REQUIRED');
  });

  it('shows honest zero counters for the alert tallies', () => {
    const html = render(<AlertsView lang="en" />);
    expect(html).toContain('All (0)');
    expect(html).toContain('Active (0)');
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

  it('shows Conversion Rate metric with an honest em-dash before data loads', () => {
    const html = render(<DashboardView lang="en" />);
    expect(html).toContain('Conversion Rate');
    // Honest contract: no fabricated '98.4%' — the card renders '—' until
    // /api/admin/dashboard returns real data.
    expect(html).not.toContain('98.4%');
    expect(html).not.toContain('AVM Tier 1');
  });

  it('shows Systems Operational badge', () => {
    expect(render(<DashboardView lang="en" />)).toContain('Systems Operational');
  });

  it('shows honest em-dash for Active Catalog before data loads (no fabricated 585)', () => {
    const html = render(<DashboardView lang="en" />);
    expect(html).not.toContain('585');
  });

  it('shows OpenClaw Autonomous Harvester Cockpit with the registry channel count', () => {
    const html = render(<DashboardView lang="en" />);
    expect(html).toContain('OpenClaw Autonomous Harvester Cockpit');
    // 15 = 20 registered − 5 archived in packages/agents/tools/whatsappGroupRegistry.ts
    expect(html).toContain('15 Channels Live');
    expect(html).toContain('ingest:all');
  });

  it('shows Dataflow & BigQuery DTS telemetry and Database Health cards', () => {
    const html = render(<DashboardView lang="en" />);
    expect(html).toContain('Data Pipelines &amp; Ingestion Telemetry');
    expect(html).toContain('Database &amp; Vector Index Health');
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

  it('shows Supabase PostgreSQL as HEALTHY', () => {
    const html = render(<HealthView lang="en" />);
    expect(html).toContain('Supabase PostgreSQL Database');
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

  it('renders an honest empty telemetry stream instead of fabricated logs', () => {
    // §21 (wave 5): six invented log lines (fake AVM valuations, a fake
    // workflow run, a lead assignment naming a demo person) were removed —
    // the stream stays empty until real telemetry is connected.
    const html = render(<MonitoringView lang="en" />);
    expect(html).toContain('No real telemetry logged yet');
    expect(html).not.toContain('Vertex Omni generated AVM valuation');
    expect(html).not.toContain('AI Orchestrator running workflow');
    expect(html).not.toContain('ai.recommendations');
  });

  it('renders honest placeholder SLA trackers instead of fabricated figures', () => {
    const html = render(<MonitoringView lang="en" />);
    expect(html).toContain('WHATSAPP BOT SLA');
    expect(html).toContain('PUBSUB DISPATCH');
    expect(html).toContain('Awaiting telemetry');
    expect(html).not.toContain('18 In Flight');
    expect(html).not.toContain('482 msg / min');
    expect(html).not.toContain('98.4% Verified');
  });

  it('renders an honest empty inbound feed instead of fabricated leads', () => {
    const html = render(<MonitoringView lang="en" />);
    expect(html).toContain('No real inbound activity yet');
    expect(html).toContain('Awaiting live feed connection');
    expect(html).not.toContain('Live Cloud Feed');
    expect(html).not.toContain('QUALIFIED_VIP');
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

  it('renders an honest empty state instead of fabricated recommendations', () => {
    // §21 (wave 5): four fabricated demo leads (invented names, match
    // scores, prices, yield rationales) were removed — the hub starts
    // honestly empty until the matching engine produces real output.
    const html = render(<RecommendationsView lang="en" />);
    expect(html).toContain('No recommendations yet');
    expect(html).toContain('demo recommendations are never invented');
    expect(html).not.toContain('Mivida 3-Bed Apartment');
    expect(html).not.toContain('Match: 96%');
  });

  it('renders honest zero counters for the queue tallies', () => {
    const html = render(<RecommendationsView lang="en" />);
    expect(html).toContain('Pending Queue (0)');
    expect(html).toContain('Dispatched (0)');
    expect(html).not.toContain('Hyde Park 5-Bed Villa');
    expect(html).not.toContain('Match: 92%');
  });

  it('renders the search control for when real recommendations exist', () => {
    expect(render(<RecommendationsView lang="en" />)).toContain('Search by lead or compound');
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

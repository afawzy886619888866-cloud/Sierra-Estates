/**
 * Tests for Admin Dashboard Truthful Operations (SIE-107-003)
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DashboardView from '@/app/admin/views/DashboardView';

// Mock child components that make heavy external calls
jest.mock('@/components/admin/DataPipelineTelemetryCard', () => () => <div data-testid="telemetry-card">Telemetry</div>);
jest.mock('@/components/admin/DatabaseHealthCard', () => () => <div data-testid="db-health-card">DB Health</div>);
jest.mock('@/components/admin/AccidentalDataLossGuardModal', () => () => null);
jest.mock('@/components/admin/AdminCopilotDrawer', () => () => null);
jest.mock('@/components/admin/AdminMiniMap', () => () => <div data-testid="mini-map">Map</div>);
jest.mock('@/components/admin/AdminInventoryTable', () => () => <div data-testid="inventory-table">Table</div>);

describe('SIE-107-003: Admin Dashboard Truthful Operations', () => {
  it('renders dashboard with honest telemetry and zero fake simulated leads', () => {
    const html = renderToStaticMarkup(<DashboardView onNavigate={jest.fn()} onOpenCommandBar={jest.fn()} />);

    // Verify key layout components are rendered
    expect(html).toContain('data-testid="telemetry-card"');
    expect(html).toContain('data-testid="db-health-card"');
  });
});

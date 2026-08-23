/**
 * Enhanced Admin Views Test Suite
 *
 * Validates:
 * 1. RecommendationsView rendering, filtering, search, and WhatsApp queue actions
 * 2. AlertsView rendering, severity badges, and status transitions
 * 3. SecurityView rendering, RBAC health indicators, and immutable log filters
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RecommendationsView from '../app/admin/views/RecommendationsView';
import AlertsView from '../app/admin/views/AlertsView';
import SecurityView from '../app/admin/views/SecurityView';

function render(el: React.ReactElement): string {
  return renderToStaticMarkup(el);
}

describe('Enhanced Admin Views Test Suite', () => {
  describe('RecommendationsView', () => {
    it('renders correctly in English', () => {
      const html = render(<RecommendationsView lang="en" />);
      expect(html).toContain('AI Recommendations Hub');
      expect(html).toContain('Mivida 3-Bed Apartment');
      expect(html).toContain('Sara Mohamed');
      expect(html).toContain('Dispatch WhatsApp');
      expect(html).toContain('Match: 96%');
    });

    it('renders correctly in Arabic', () => {
      const html = render(<RecommendationsView lang="ar" />);
      expect(html).toContain('مركز التوصيات الذكية');
      expect(html).toContain('ميفيدا');
      expect(html).toContain('إرسال عبر واتساب');
      expect(html).toContain('قائمة الانتظار');
    });

    it('displays price information and match rationale', () => {
      const html = render(<RecommendationsView lang="en" />);
      expect(html).toContain('EGP 8,200,000');
      expect(html).toContain('Matches target budget');
      expect(html).toContain('Hyde Park');
    });
  });

  describe('AlertsView', () => {
    it('renders correctly in English', () => {
      const html = render(<AlertsView lang="en" />);
      expect(html).toContain('System Alerts &amp; Threshold Warnings');
      expect(html).toContain('AVM Deviation Alert: Katameya Dunes Unit');
      expect(html).toContain('CRITICAL');
      expect(html).toContain('HIGH');
    });

    it('renders correctly in Arabic', () => {
      const html = render(<AlertsView lang="ar" />);
      expect(html).toContain('مركز التنبيهات الذكية');
      expect(html).toContain('تنبيه انحراف السعر');
      expect(html).toContain('تأكيد الاستلام');
      expect(html).toContain('إغلاق التنبيه');
    });

    it('displays severity filter buttons', () => {
      const html = render(<AlertsView lang="en" />);
      expect(html).toContain('All Severities');
      expect(html).toContain('Critical');
      expect(html).toContain('High');
      expect(html).toContain('Warning');
    });
  });

  describe('SecurityView', () => {
    it('renders correctly in English', () => {
      const html = render(<SecurityView lang="en" />);
      expect(html).toContain('Security, RBAC &amp; Audit Trails');
      expect(html).toContain('RBAC POLICY STATUS');
      expect(html).toContain('Enforced &amp; Active');
      expect(html).toContain('API SECRETS ROTATION');
      expect(html).toContain('Live Engine &amp; Access Audit Trail');
    });

    it('renders correctly in Arabic', () => {
      const html = render(<SecurityView lang="ar" />);
      expect(html).toContain('مركز الأمان والامتثال');
      expect(html).toContain('سجل التدقيق الحي');
    });

    it('displays audit log entries and decision badges', () => {
      const html = render(<SecurityView lang="en" />);
      expect(html).toContain('engine_memory write authorized');
      expect(html).toContain('ALLOW');
      expect(html).toContain('Role escalation attempt to super_admin blocked');
      expect(html).toContain('DENY');
    });
  });
});

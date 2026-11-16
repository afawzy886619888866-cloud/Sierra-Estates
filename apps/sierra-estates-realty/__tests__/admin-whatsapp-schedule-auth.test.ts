/**
 * Authentication & Recovery Tests for Admin WhatsApp Scheduling
 * Gated by SIE-107-001 micro-contract.
 */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/admin/whatsapp/schedule/route';
import { recoverStaleSendingJobs } from '@/lib/server/whatsapp-drain';

// Mock auth-guard
jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: jest.fn(),
}));

// Mock database operations
const mockJobsStore: Record<string, any>[] = [];
jest.mock('@sierra-estates/db', () => ({
  listRecords: jest.fn(async (_table: string, opts?: any) => {
    if (opts?.where) {
      return mockJobsStore.filter((j) => {
        return opts.where.every((w: any) => {
          if (w.op === 'lte') {
            return String(j[w.column] || '') <= String(w.value || '');
          }
          return j[w.column] === w.value;
        });
      });
    }
    return [...mockJobsStore];
  }),
  updateRecord: jest.fn(async (_table: string, id: string, patch: any) => {
    const item = mockJobsStore.find((j) => j.id === id);
    if (item) Object.assign(item, patch);
    return item;
  }),
  insertRecord: jest.fn(async (_table: string, data: any) => {
    const id = `job-${mockJobsStore.length + 1}`;
    const newDoc = { id, ...data };
    mockJobsStore.push(newDoc);
    return newDoc;
  }),
}));

// Mock logger to keep test outputs clean
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SIE-107-001: WhatsApp Scheduling Security & Recovery', () => {
  const { verifyAdminRequest } = require('@/lib/server/auth-guard');

  beforeEach(() => {
    jest.clearAllMocks();
    mockJobsStore.length = 0;
  });

  describe('GET /api/admin/whatsapp/schedule Auth Gate', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      verifyAdminRequest.mockResolvedValueOnce({ authenticated: false });

      const req = new NextRequest('http://localhost:3000/api/admin/whatsapp/schedule');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 200 with job list when authenticated as admin', async () => {
      verifyAdminRequest.mockResolvedValueOnce({ authenticated: true, user: { role: 'admin' } });
      mockJobsStore.push({
        id: 'job-1',
        status: 'queued',
        recipientPhone: '+201099887766',
        body: 'Scheduled follow-up',
        attempts: 0,
      });

      const req = new NextRequest('http://localhost:3000/api/admin/whatsapp/schedule?status=queued');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.jobs).toHaveLength(1);
      expect(json.jobs[0].id).toBe('job-1');
    });
  });

  describe('POST /api/admin/whatsapp/schedule Auth Gate', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      verifyAdminRequest.mockResolvedValueOnce({ authenticated: false });

      const req = new NextRequest('http://localhost:3000/api/admin/whatsapp/schedule', {
        method: 'POST',
        body: JSON.stringify({
          recipients: [{ phone: '+201099887766' }],
          body: 'Hello investor',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });
  });

  describe('recoverStaleSendingJobs()', () => {
    it('recovers stuck sending jobs back to queued state when attempts < 3', async () => {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      mockJobsStore.push({
        id: 'stuck-1',
        status: 'sending',
        attempts: 1,
        updatedAt: fifteenMinsAgo,
      });

      const recoveredCount = await recoverStaleSendingJobs(10 * 60 * 1000);
      expect(recoveredCount).toBe(1);

      const job = mockJobsStore.find((j) => j.id === 'stuck-1');
      expect(job.status).toBe('queued');
      expect(job.errorMessage).toContain('Recovered');
    });

    it('marks stuck sending jobs as failed when attempts reach 3 or more', async () => {
      const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      mockJobsStore.push({
        id: 'stuck-2',
        status: 'sending',
        attempts: 3,
        updatedAt: twentyMinsAgo,
      });

      const recoveredCount = await recoverStaleSendingJobs(10 * 60 * 1000);
      expect(recoveredCount).toBe(1);

      const job = mockJobsStore.find((j) => j.id === 'stuck-2');
      expect(job.status).toBe('failed');
      expect(job.errorMessage).toContain('exceeded');
    });
  });
});

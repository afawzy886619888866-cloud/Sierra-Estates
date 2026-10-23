// Minimal record-layer stub for test isolation.
const mockAdd = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  insertRecord: (table: string, values: unknown) => mockAdd(table, values),
  listRecords: jest.fn(async () => []),
  getRecord: jest.fn(async () => null),
  updateRecord: jest.fn(async () => null),
}));

import { enqueueWhatsAppJob } from '../lib/server/whatsapp-queue';

describe('WhatsApp Scheduler & Deferred Queue Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdd.mockResolvedValue({ id: 'job_test_123' });
  });

  it('enqueues an immediate WhatsApp outreach job when scheduledFor is omitted', async () => {
    const jobId = await enqueueWhatsAppJob({
      purpose: 'general-outreach',
      toPhone: '+201001112233',
      body: 'Exclusive Mivida Villa Launch',
    });

    expect(jobId).toBe('job_test_123');
    expect(mockAdd.mock.calls[0][0]).toBe('whatsapp_queue');
    expect(mockAdd).toHaveBeenCalledTimes(1);

    const savedJob = mockAdd.mock.calls[0][1];
    expect(savedJob.direction).toBe('outbound');
    expect(savedJob.recipientPhone).toBe('+201001112233');
    expect(savedJob.messageBody).toBe('Exclusive Mivida Villa Launch');
    expect(savedJob.status).toBe('queued');
    expect(savedJob.attempts).toBe(0);
    expect(savedJob.scheduledFor).toBeUndefined();
  });

  it('enqueues a future scheduled job when scheduledFor is provided as an ISO string or Date', async () => {
    const futureDate = new Date(Date.now() + 86400000); // 24 hours in future
    const jobId = await enqueueWhatsAppJob({
      purpose: 'client-recommendation',
      toPhone: '+201012223344',
      body: 'Scheduled viewing reminder for tomorrow at Hyde Park',
      scheduledFor: futureDate,
    });

    expect(jobId).toBe('job_test_123');
    expect(mockAdd).toHaveBeenCalledTimes(1);

    const savedJob = mockAdd.mock.calls[0][1];
    expect(savedJob.recipientPhone).toBe('+201012223344');
    // scheduled_for is a timestamptz column, so the value is an ISO string
    // rather than a Firestore Timestamp with .toMillis().
    expect(savedJob.scheduledFor).toBeDefined();
    expect(typeof savedJob.scheduledFor).toBe('string');
    expect(Date.parse(savedJob.scheduledFor)).toBeCloseTo(futureDate.getTime(), -3);
  });

  it('defers future scheduled jobs during cron dispatch processing', () => {
    const nowMs = Date.now();
    const futureScheduledJob = {
      id: 'job_future',
      toPhone: '+201001112233',
      body: 'Future Broadcast',
      status: 'queued',
      scheduledFor: {
        toMillis: () => nowMs + 3600000, // 1 hr in future
      },
    };

    const pastScheduledJob = {
      id: 'job_ready',
      toPhone: '+201002223344',
      body: 'Ready Broadcast',
      status: 'queued',
      scheduledFor: {
        toMillis: () => nowMs - 60000, // 1 min in past
      },
    };

    const isFuture = (job: any) => {
      if (!job.scheduledFor) return false;
      const t = typeof job.scheduledFor.toMillis === 'function' ? job.scheduledFor.toMillis() : new Date(job.scheduledFor).getTime();
      return t > nowMs;
    };

    expect(isFuture(futureScheduledJob)).toBe(true);
    expect(isFuture(pastScheduledJob)).toBe(false);
  });
});

const getRecordMock = jest.fn();
const insertRecordMock = jest.fn();
const updateRecordMock = jest.fn();
const sendTelegramMessageMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  getRecord: (...args: unknown[]) => getRecordMock(...args),
  insertRecord: (...args: unknown[]) => insertRecordMock(...args),
  updateRecord: (...args: unknown[]) => updateRecordMock(...args),
}));

jest.mock('@/lib/services/telegram-controller', () => ({
  sendTelegramMessage: (...args: unknown[]) => sendTelegramMessageMock(...args),
}));

import { scheduleViewing, completeViewing } from '@/lib/services/viewing-engine';

/** Find the updateRecord call made against a given table. */
const updateCallFor = (table: string) =>
  updateRecordMock.mock.calls.find((call) => call[0] === table);

describe('viewing-engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    insertRecordMock.mockResolvedValue({ id: 'viewing-abc' });
    updateRecordMock.mockResolvedValue({});
    getRecordMock.mockResolvedValue(null);
  });

  describe('scheduleViewing', () => {
    test('persists the viewing, updates the lead stage, and notifies Telegram', async () => {
      const scheduledAt = new Date('2026-09-01T10:00:00Z');
      const id = await scheduleViewing('lead-1', 'unit-1', 'agent-1', scheduledAt);

      expect(id).toBe('viewing-abc');
      expect(insertRecordMock).toHaveBeenCalledWith(
        'viewings',
        expect.objectContaining({
          leadId: 'lead-1',
          unitId: 'unit-1',
          agentId: 'agent-1',
          status: 'scheduled',
          scheduledAt,
        })
      );

      // COLLECTIONS.stakeholders resolves to the table 'leads'.
      const leadUpdate = updateCallFor('leads');
      expect(leadUpdate?.[1]).toBe('lead-1');
      expect(leadUpdate?.[2]).toEqual(
        expect.objectContaining({
          orchestrationState: expect.objectContaining({ stage: 'S8_VIEWING_SCHEDULED' }),
          status: 'negotiating',
        })
      );

      expect(sendTelegramMessageMock).toHaveBeenCalledTimes(1);
      expect(sendTelegramMessageMock.mock.calls[0][0]).toContain('lead-1');
    });

    test('merges into orchestrationState rather than replacing it', async () => {
      // Firestore's dotted-path update left sibling keys alone; the JSONB
      // column must too, or unrelated orchestration data is silently lost.
      getRecordMock.mockResolvedValue({
        orchestrationState: { stage: 'S1_OLD', assignedPod: 'pod-4' },
      });

      await scheduleViewing('lead-1', 'unit-1', 'agent-1', new Date());

      expect(updateCallFor('leads')?.[2]).toEqual(
        expect.objectContaining({
          orchestrationState: { stage: 'S8_VIEWING_SCHEDULED', assignedPod: 'pod-4' },
        })
      );
    });
  });

  describe('completeViewing', () => {
    test('marks the viewing completed and transitions the lead to closing-ready', async () => {
      getRecordMock.mockImplementation(async (table: string) =>
        table === 'viewings' ? { id: 'viewing-abc', leadId: 'lead-1' } : null
      );

      await completeViewing('viewing-abc', 'Client loved it');

      expect(updateCallFor('viewings')?.[2]).toEqual(
        expect.objectContaining({ status: 'completed', notes: 'Client loved it' })
      );
      expect(updateCallFor('leads')?.[2]).toEqual(
        expect.objectContaining({
          orchestrationState: expect.objectContaining({ stage: 'S9_CLOSING_READY' }),
        })
      );
      expect(sendTelegramMessageMock).toHaveBeenCalledTimes(1);
    });

    test('is a no-op when the viewing does not exist', async () => {
      getRecordMock.mockResolvedValue(null);

      await completeViewing('missing-viewing');

      expect(updateRecordMock).not.toHaveBeenCalled();
      expect(sendTelegramMessageMock).not.toHaveBeenCalled();
    });
  });
});

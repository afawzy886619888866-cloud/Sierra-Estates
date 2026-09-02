const collectionMock = jest.fn();
const addMock = jest.fn();
const updateMock = jest.fn();
const getMock = jest.fn();
const docMock = jest.fn();
const sendTelegramMessageMock = jest.fn();

jest.mock('@/lib/server/firebase-admin', () => ({
  adminDb: { collection: (...args) => collectionMock(...args) },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'server-ts') },
}));

jest.mock('@/lib/services/telegram-controller', () => ({
  sendTelegramMessage: (...args) => sendTelegramMessageMock(...args),
}));

import { scheduleViewing, completeViewing } from '@/lib/services/viewing-engine';

describe('viewing-engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    docMock.mockReturnValue({ update: updateMock, get: getMock });
    collectionMock.mockReturnValue({ add: addMock, doc: docMock });
    addMock.mockResolvedValue({ id: 'viewing-abc' });
    updateMock.mockResolvedValue(undefined);
  });

  describe('scheduleViewing', () => {
    test('persists the viewing via the Admin SDK, updates the lead stage, and notifies Telegram', async () => {
      const scheduledAt = new Date('2026-09-01T10:00:00Z');
      const id = await scheduleViewing('lead-1', 'unit-1', 'agent-1', scheduledAt);

      expect(id).toBe('viewing-abc');
      expect(collectionMock).toHaveBeenCalledWith('viewings');
      expect(addMock).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          unitId: 'unit-1',
          agentId: 'agent-1',
          status: 'scheduled',
          scheduledAt,
        })
      );

      // COLLECTIONS.stakeholders resolves to the Firestore collection 'leads'.
      expect(collectionMock).toHaveBeenCalledWith('leads');
      expect(docMock).toHaveBeenCalledWith('lead-1');
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ 'orchestrationState.stage': 'S8_VIEWING_SCHEDULED', status: 'negotiating' })
      );

      expect(sendTelegramMessageMock).toHaveBeenCalledTimes(1);
      expect(sendTelegramMessageMock.mock.calls[0][0]).toContain('lead-1');
    });
  });

  describe('completeViewing', () => {
    test('marks the viewing completed and transitions the lead to closing-ready', async () => {
      getMock.mockResolvedValue({ exists: true, data: () => ({ leadId: 'lead-1' }) });

      await completeViewing('viewing-abc', 'Client loved it');

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed', notes: 'Client loved it' })
      );
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ 'orchestrationState.stage': 'S9_CLOSING_READY' })
      );
      expect(sendTelegramMessageMock).toHaveBeenCalledTimes(1);
    });

    test('is a no-op when the viewing does not exist', async () => {
      getMock.mockResolvedValue({ exists: false });

      await completeViewing('missing-viewing');

      expect(updateMock).not.toHaveBeenCalled();
      expect(sendTelegramMessageMock).not.toHaveBeenCalled();
    });
  });
});

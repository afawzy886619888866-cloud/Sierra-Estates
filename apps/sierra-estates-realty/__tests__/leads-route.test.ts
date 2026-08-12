const collectionMock = jest.fn();
const addMock = jest.fn();
const sendTelegramMessageMock = jest.fn();

jest.mock('@/lib/server/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => collectionMock(...args),
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => 'timestamp-now'),
  },
}));

jest.mock('@/lib/telegram', () => ({
  sendTelegramMessage: (...args: unknown[]) => sendTelegramMessageMock(...args),
}));

import { POST } from '@/app/api/leads/route';

describe('POST /api/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    collectionMock.mockReturnValue({ add: addMock });
    addMock.mockResolvedValue({ id: 'lead-123' });
    sendTelegramMessageMock.mockResolvedValue(undefined);
  });

  test('stores lead and sends telegram message', async () => {
    const payload = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+201000000000',
      message: 'Interested in investment options',
      locale: 'en',
    };

    const res = await POST(
      new Request('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, id: 'lead-123' });
    expect(collectionMock).toHaveBeenCalledWith('leads');
    expect(addMock).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessageMock).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessageMock.mock.calls[0][0]).toContain('Jane Doe');
  });

  test('returns 500 when persistence fails', async () => {
    addMock.mockRejectedValue(new Error('firestore failure'));

    const res = await POST(
      new Request('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+201000000000',
          message: 'Hi',
          locale: 'en',
        }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ success: false, error: 'Internal Server Error' });
    expect(sendTelegramMessageMock).not.toHaveBeenCalled();
  });
});

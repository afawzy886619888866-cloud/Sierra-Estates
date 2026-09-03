const insertRecordMock = jest.fn();
const sendTelegramMessageMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  insertRecord: (...args: unknown[]) => insertRecordMock(...args),
}));

jest.mock('@/lib/telegram', () => ({
  sendTelegramMessage: (...args: unknown[]) => sendTelegramMessageMock(...args),
  // The route escapes user values before interpolating them into the HTML
  // alert, so the mock has to provide the real helper, not drop it.
  escapeTelegramHtml: (value: unknown) =>
    String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
}));

import { POST } from '@/app/api/leads/route';

describe('POST /api/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    insertRecordMock.mockResolvedValue({ id: 'lead-123' });
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
    expect(insertRecordMock).toHaveBeenCalledTimes(1);
    expect(insertRecordMock.mock.calls[0][0]).toBe('leads');
    // The route maps the form's `name`/`message` onto the table's columns.
    expect(insertRecordMock.mock.calls[0][1]).toMatchObject({
      fullName: 'Jane Doe',
      summaryNotes: 'Interested in investment options',
    });
    expect(sendTelegramMessageMock).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessageMock.mock.calls[0][0]).toContain('Jane Doe');
  });

  test('returns 500 when persistence fails', async () => {
    insertRecordMock.mockRejectedValue(new Error('database failure'));

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

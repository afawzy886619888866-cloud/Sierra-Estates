import { escapeTelegramHtml } from '@/lib/telegram';

describe('escapeTelegramHtml', () => {
  it('escapes the three characters Telegram HTML mode treats as markup', () => {
    expect(escapeTelegramHtml('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
    expect(escapeTelegramHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('neutralises a link injected through a lead name', () => {
    const injected = '<a href="https://evil.example">Click here</a>';
    const escaped = escapeTelegramHtml(injected);
    expect(escaped).not.toContain('<a href');
    expect(escaped).toBe(
      '&lt;a href="https://evil.example"&gt;Click here&lt;/a&gt;'
    );
  });

  it('escapes the ampersand first so entities are not double-decoded', () => {
    // "&lt;" typed literally must survive as text, not become "<".
    expect(escapeTelegramHtml('&lt;')).toBe('&amp;lt;');
  });

  it('renders null and undefined as an empty string rather than "null"', () => {
    expect(escapeTelegramHtml(null)).toBe('');
    expect(escapeTelegramHtml(undefined)).toBe('');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeTelegramHtml('Ahmed Fawzy — New Cairo, 5th Settlement')).toBe(
      'Ahmed Fawzy — New Cairo, 5th Settlement'
    );
  });
});

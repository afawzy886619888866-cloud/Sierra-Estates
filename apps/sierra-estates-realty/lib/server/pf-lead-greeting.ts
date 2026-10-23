import 'server-only';

import { type GreetingLanguage, greetingFor } from '@/lib/server/whatsapp-language';

/**
 * Property Finder lead greeting generator.
 *
 * When a `lead.created` webhook arrives, the bot replies with a first-touch
 * WhatsApp message. This module personalises that message with the Gemini
 * REST API (no SDK import — webhook routes stay lightweight) and ALWAYS falls
 * back to the static brand greeting on any failure: a webhook handler must
 * never throw because the copywriter is down.
 */

const GREETING_TIMEOUT_MS = 8_000;
const GEMINI_MODEL = 'gemini-flash-latest';

const SYSTEM_PROMPTS: Record<GreetingLanguage, string> = {
  ar: [
    'أنت مساعد المبيعات الذكي لشركة سييرا إستيتس (Sierra Estates)، وكالة عقارات فاخرة في القاهرة الجديدة بمصر.',
    'مهمتك: كتابة أول رد واتساب ودود واحترافي ومختصر (3 إلى 5 أسطر كحد أقصى) لعميل جديد تواصل عبر بروبرتي فايندر.',
    'ابدأ بالترحيب باسم العميل، وأشر أن استفساره وصل بخصوص العقار المطلوب،',
    'ثم اعرض المساعدة بشأن التفاصيل والمخططات الهندسية وخطط السداد،',
    'ثم اسأله إن كان يفضل المتابعة هنا عبر واتساب أو تحديد موعد لمعاينة العقار.',
    'اختم دائماً بسطر التوقيع: *Sierra Estates — Beyond Brokerage*',
    'اكتب بالعربية الفصحى المبسطة فقط، بدون إيموجي زائدة (رمز واحد على الأكثر)،',
    'ولا تخترع أي معلومات عن الأسعار أو الوحدات غير المتوفرة في السياق.',
  ].join(' '),
  en: [
    'You are the smart sales assistant for Sierra Estates, a luxury real estate brokerage in New Cairo, Egypt.',
    'Your task: write a friendly, professional and concise first WhatsApp reply (3 to 5 lines max) to a new client who reached out via Property Finder.',
    'Start by welcoming the client by name and confirming their inquiry about the property was received,',
    'then offer help with full unit details, floor plans and payment plans,',
    'then ask whether they prefer to continue here on WhatsApp or book a viewing appointment.',
    'Always end with the signature line: *Sierra Estates — Beyond Brokerage*',
    'Write in polished English only, with minimal emojis (one at most),',
    'and never invent any pricing or unit information not present in the context.',
  ].join(' '),
};

/**
 * Static brand greeting per language. The Arabic copy is the proven
 * production template; English is its exact structural mirror.
 */
export function fallbackGreeting(
  clientName: string,
  listingRef: string,
  language: GreetingLanguage = 'ar',
): string {
  return greetingFor(language, clientName, listingRef);
}

export interface LeadGreetingInput {
  clientName: string;
  listingRef: string;
  message?: string;
  /** Greeting language — Egypt (+20) / Saudi (+966) => 'ar', others 'en'. */
  language?: GreetingLanguage;
}

export interface LeadGreetingResult {
  body: string;
  source: 'ai' | 'template';
}

/**
 * Generates a tailored first response for a new Property Finder lead in the
 * requested language (Arabic for +20/+966 clients, English for everyone else).
 * Never throws — returns the static brand greeting whenever AI is unconfigured,
 * slow (>8s), or erroring.
 */
export async function generateLeadGreeting(input: LeadGreetingInput): Promise<LeadGreetingResult> {
  const language: GreetingLanguage = input.language ?? 'ar';
  const template = fallbackGreeting(input.clientName, input.listingRef, language);
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) return { body: template, source: 'template' };

  const userPrompt = language === 'ar'
    ? [
        `اسم العميل: ${input.clientName || 'Client'}`,
        `مرجع العقار: ${input.listingRef || 'غير متوفر'}`,
        input.message ? `نص استفسار العميل:\n${input.message}` : 'لم يُرفق نص استفسار مع الرسالة.',
        '',
        'اكتب الآن رسالة الرد على واتساب مباشرة بدون مقدمات أو شرح.',
      ].join('\n')
    : [
        `Client name: ${input.clientName || 'Client'}`,
        `Property reference: ${input.listingRef || 'not available'}`,
        input.message ? `Client inquiry:\n${input.message}` : 'No inquiry text was attached to the message.',
        '',
        'Write the WhatsApp reply now, directly and without preamble or explanation.',
      ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GREETING_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPTS[language] }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
        }),
        signal: controller.signal,
      },
    );

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

    const data = await res.json();
    const text: string = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || '')
      .join('')
      .trim();

    if (!text) throw new Error('Gemini returned an empty reply');
    return { body: text, source: 'ai' };
  } catch (err) {
    console.warn(
      '[pf-lead-greeting] AI greeting unavailable, using brand template:',
      err instanceof Error ? err.message : err,
    );
    return { body: template, source: 'template' };
  } finally {
    clearTimeout(timer);
  }
}

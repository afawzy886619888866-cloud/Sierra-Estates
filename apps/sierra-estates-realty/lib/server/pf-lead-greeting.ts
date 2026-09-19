import 'server-only';

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

const SYSTEM_PROMPT = [
  'أنت مساعد المبيعات الذكي لشركة سييرا إستيتس (Sierra Estates)، وكالة عقارات فاخرة في القاهرة الجديدة بمصر.',
  'مهمتك: كتابة أول رد واتساب ودود واحترافي ومختصر (3 إلى 5 أسطر كحد أقصى) لعميل جديد تواصل عبر بروبرتي فايندر.',
  'ابدأ بالترحيب باسم العميل، وأشر أن استفساره وصل بخصوص العقار المطلوب،',
  'ثم اعرض المساعدة بشأن التفاصيل والمخططات الهندسية وخطط السداد،',
  'ثم اسأله إن كان يفضل المتابعة هنا عبر واتساب أو تحديد موعد لمعاينة العقار.',
  'اختم دائماً بسطر التوقيع: *Sierra Estates — Beyond Brokerage*',
  'اكتب بالعربية الفصحى المبسطة فقط، بدون إيموجي زائدة (رمز واحد على الأكثر)،',
  'ولا تخترع أي معلومات عن الأسعار أو الوحدات غير المتوفرة في السياق.',
].join(' ');

export function fallbackGreeting(clientName: string, listingRef: string): string {
  return [
    `مرحباً بك يا ${clientName} في سييرا إستيتس! 🌟`,
    `وصلنا استفسارك عبر Property Finder بخصوص العقار (مرجع: ${listingRef || 'المميز'}).`,
    'يسعدنا تزويدك بكافة تفاصيل الوحدة، المخططات الهندسية، وخطط السداد المتاحة.',
    '',
    'هل تود التواصل هنا عبر واتساب أو تحديد موعد لزيارة ومعاينة العقار؟',
    '',
    '*Sierra Estates — Beyond Brokerage*',
  ].join('\n');
}

export interface LeadGreetingInput {
  clientName: string;
  listingRef: string;
  message?: string;
}

export interface LeadGreetingResult {
  body: string;
  source: 'ai' | 'template';
}

/**
 * Generates a tailored Arabic first response for a new Property Finder lead.
 * Never throws — returns the static brand greeting whenever AI is unconfigured,
 * slow (>8s), or erroring.
 */
export async function generateLeadGreeting(input: LeadGreetingInput): Promise<LeadGreetingResult> {
  const template = fallbackGreeting(input.clientName, input.listingRef);
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) return { body: template, source: 'template' };

  const userPrompt = [
    `اسم العميل: ${input.clientName || 'Client'}`,
    `مرجع العقار: ${input.listingRef || 'غير متوفر'}`,
    input.message ? `نص استفسار العميل:\n${input.message}` : 'لم يُرفق نص استفسار مع الرسالة.',
    '',
    'اكتب الآن رسالة الرد على واتساب مباشرة بدون مقدمات أو شرح.',
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
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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

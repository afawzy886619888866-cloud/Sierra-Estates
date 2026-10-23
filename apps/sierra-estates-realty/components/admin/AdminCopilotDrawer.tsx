'use client';

import React, { useState, useRef, useEffect } from 'react';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  dataPoints?: Array<{ label: string; value: string; color?: string }>;
  timestamp: string;
}

interface AdminCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
  onFilterInventory?: (query: string) => void;
}

export default function AdminCopilotDrawer({
  isOpen,
  onClose,
  lang = 'en',
  onFilterInventory: _onFilterInventory,

}: AdminCopilotDrawerProps) {
  const isAr = lang === 'ar';
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: isAr
        ? 'مرحباً! أنا مساعد البيانات الذكي (Sierra Data Copilot). يمكنك سؤالي عن إحصائيات المخزون، صفقات التقييم العادل، أو حالة العملاء في التجمع الخامس.'
        : 'Welcome! I am your Sierra Data Copilot. Ask me anything about inventory pricing arbitrage, high-yield compounds, or hot deal velocity in New Cairo.',
      dataPoints: [
        { label: isAr ? 'إجمالي المخزون الموحد' : 'Unified Inventory', value: '460 units', color: '#C8961A' },
        { label: isAr ? 'أعلى عائد إيجاري' : 'Top Yield Compound', value: 'Mivida (9.4%)', color: '#10B981' },
      ],
      timestamp: 'Just now',
    },
  ]);

  const quickPrompts = isAr
    ? [
        'ما هي الوحدات الأكثر طلباً في ميفيدا وهايد بارك؟',
        'اعرض الصفقات التي تقل عن سعر السوق بنسبة > 10%',
        'لخّص حالة خط الأنابيب (Pipeline) للأسبوع الحالي',
      ]
    : [
        'Show underpriced listings with arbitrage margin > 10%',
        'Top 3 compounds by rental yield in New Cairo',
        'Summarize qualified leads with budget > 15M EGP',
      ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isThinking) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      // Simulate intelligent copilot response with structured data points
      await new Promise((resolve) => setTimeout(resolve, 900));

      let replyText = '';
      let dataPoints: Array<{ label: string; value: string; color?: string }> | undefined = undefined;

      const lower = textToSend.toLowerCase();
      if (lower.includes('arbitrage') || lower.includes('underpriced') || textToSend.includes('سعر السوق')) {
        replyText = isAr
          ? 'تم فحص 460 وحدة في قاعدة البيانات الموحدة: يوجد 14 وحدة تسعيرها أقل من متوسط السوق بنسبة تتراوح بين 8.5% و14.2%، معظمها في كمبوند هايد بارك وتاج سيتي.'
          : 'Analyzed 460 reconciled listings: 14 properties are currently priced 8.5%–14.2% below the compound baseline, primarily in Hyde Park and Taj City.';
        dataPoints = [
          { label: isAr ? 'الوحدات ذات الفجوة السعرية' : 'Arbitrage Units', value: '14 properties', color: '#10B981' },
          { label: isAr ? 'أعلى فرصة توفير' : 'Max Discount', value: '-14.2%', color: '#8B5CF6' },
          { label: isAr ? 'متوسط السعر/م' : 'Avg Price/sqm', value: '44,200 EGP', color: '#C8961A' },
        ];
      } else if (lower.includes('yield') || lower.includes('عائد')) {
        replyText = isAr
          ? 'تحليل العوائد الاستثمارية: ميفيدا تتصدر التجمع الخامس بعائد إيجاري صافي 9.4%، تليها إيست تاون بنسبة 8.8%، وفيلت بنسبة 8.2%.'
          : 'Yield Analysis: Mivida leads New Cairo with an annualized net rental cap rate of 9.4%, followed by Eastown at 8.8% and Villette at 8.2%.';
        dataPoints = [
          { label: 'Mivida Cap Rate', value: '9.4%', color: '#10B981' },
          { label: 'Eastown Cap Rate', value: '8.8%', color: '#C8961A' },
          { label: 'Payback Period', value: '10.8 yrs', color: '#F59E0B' },
        ];
      } else {
        replyText = isAr
          ? `بناءً على تتبع خط البيانات، تم تحديث 460 وحدة واستقرار مؤشر AVM بدقة 98.4%. جميع الصفقات والعملاء في حالة نشطة وجاهزة للمتابعة.`
          : `Grounded in live telemetry: 460 verified listings are synced with the AVM valuation engine (98.4% precision). Lead velocity and scheduled viewings remain on track.`;
        dataPoints = [
          { label: isAr ? 'دقة المطابقة AVM' : 'AVM Precision', value: '98.4%', color: '#8B5CF6' },
          { label: isAr ? 'العملاء الساخنون' : 'Hot Inquiries', value: '28 active', color: '#C8961A' },
        ];
      }

      const botMsg: CopilotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        dataPoints,
        timestamp: 'Just now',
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'assistant',
          text: isAr ? 'حدث خطأ أثناء معالجة الاستعلام.' : 'Error querying copilot engine.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
      {/* Background click to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Body */}
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10 text-slate-100">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-[#E9C176] to-blue-600 flex items-center justify-center text-white text-base shadow-sm">
              ✦
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">Sierra Copilot</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#211A0D] text-[#F5D78E] border border-[#C8961A]/40">
                  Gemini Analytics
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'مساعد الاستعلامات اللغوية المباشر للبيانات' : 'Natural language query over live dataset'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
            {isAr ? 'استفسارات سريعة مقترحة:' : 'Suggested Analytical Inquiries:'}
          </span>
          <div className="flex flex-col gap-1">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="text-left py-1 px-2 rounded-md bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-[#F5D78E] transition-colors truncate border border-slate-700/50 cursor-pointer"
              >
                ✦ {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#C8961A] text-white rounded-br-none shadow-md'
                    : 'bg-slate-950 border border-slate-800/90 text-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                <p>{msg.text}</p>

                {msg.dataPoints && msg.dataPoints.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/80">
                    {msg.dataPoints.map((dp, i) => (
                      <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400 truncate">{dp.label}</div>
                        <div
                          className="text-xs font-bold font-mono mt-0.5"
                          style={{ color: dp.color || '#C8961A' }}
                        >
                          {dp.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-[#E9C176] font-mono p-2">
              <span className="w-2 h-2 rounded-full bg-[#E9C176] animate-ping"></span>
              <span>{isAr ? 'جاري استنتاج الإحصائيات...' : 'Querying data platform...'}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isAr ? 'اسأل عن الأسعار، العقارات، أو أداء الصفقات...' : 'Ask about prices, yields, deals, or leads...'}
              className="flex-1 py-2 px-3 bg-slate-900 border border-slate-700 focus:border-[#C8961A] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#C8961A] transition-all font-sans"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="py-2 px-3 rounded-xl bg-[#C8961A] hover:bg-[#C8961A] text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isAr ? 'إرسال' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

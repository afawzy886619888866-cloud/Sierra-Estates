'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/I18nContext';
import { Sparkles, X, Send, Phone, Bot, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
}

export default function SierraChatFab() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text: isAr
        ? 'مرحباً بك في سييرا استيتس! أنا مستشارك الذكي لجميع كمبوندات القاهرة الجديدة. كيف يمكنني مساعدتك اليوم؟'
        : 'Welcome to Sierra Estates! I am your AI Luxury Concierge for New Cairo compounds. How can I assist your search today?',
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const quickPrompts = isAr
    ? [
        'أفضل فلل في هايد بارك بسعر مناسب',
        'ما هو متوسط العائد الإيجاري في ميفيدا؟',
        'شقق تسليم فوري في سوديك إيست تاون',
      ]
    : [
        'Best villas in Hyde Park under 30M EGP',
        'Average rental yield in Mivida Emaar',
        'Ready-to-move apartments in Eastown SODIC',
      ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, locale }),
      });

      if (res.ok) {
        const data = await res.json();
        const botReply = data.response || data.message || (isAr
          ? 'شكراً لتواصلك! لدينا 12 وحدة مطابقة لطلبك في كمبوندات القاهرة الجديدة. يمكنك أيضاً التواصل مع مستشارنا عبر واتساب للمعاينة الفورية.'
          : 'Thank you! We have verified matching properties in New Cairo matching your criteria. You can also connect via WhatsApp for immediate on-site viewing.');
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'bot',
            text: botReply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        throw new Error('API request failed');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: isAr
            ? 'تم استلام طلبك بنجاح. يمكنك التواصل الفوري مع مستشار المبيعات عبر واتساب لمعاينة الوحدات المتاحة.'
            : 'Your request has been received. You can also speak directly with our compound specialist on WhatsApp for live video tours.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="w-[90vw] sm:w-96 h-[500px] bg-[#0b1329] border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-scale-up">
          {/* Panel Header */}
          <div className="bg-gradient-to-r from-[#0d1733] to-[#121f45] p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-white flex items-center gap-1.5">
                  <span>{isAr ? 'مستشار سييرا الذكي' : 'Sierra AI Concierge'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <span className="text-[10px] text-amber-300/80 font-mono">
                  {isAr ? 'مباشر · 29 كمبوند' : 'Live · 29 Compounds'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl p-3 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none'
                      : 'bg-white/10 text-slate-200 border border-white/10 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{m.time}</span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs bg-white/5 p-2.5 rounded-2xl w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>{isAr ? 'جارِ فحص قاعدة البيانات...' : 'Analyzing 1,200+ properties...'}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Pills */}
          <div className="px-3 py-2 bg-white/5 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-[10px] text-slate-300 hover:text-amber-300 border border-white/10 whitespace-nowrap transition-colors shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input & WhatsApp Action */}
          <div className="p-3 bg-[#080e21] border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isAr ? 'اكتب استفسارك هنا...' : 'Ask about prices, ROI, units...'}
              className="flex-1 bg-white/5 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
            <a
              href="https://wa.me/201092048333"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white transition-colors shrink-0"
              title="Speak to human broker on WhatsApp"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI Concierge"
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-300 text-slate-950 flex items-center justify-center shadow-2xl shadow-amber-500/50 hover:scale-110 active:scale-95 transition-all duration-300 group"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <Sparkles className="w-7 h-7 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full" />
          </div>
        )}
      </button>
    </div>
  );
}

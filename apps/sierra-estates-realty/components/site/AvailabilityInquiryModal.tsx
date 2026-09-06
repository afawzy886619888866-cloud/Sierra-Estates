'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, Send, AlertCircle, Phone, User, ShieldCheck, Copy, Check, MessageCircle } from 'lucide-react';

interface UnitSummary {
  id: string;
  code: string;
  compound: string;
  type: string;
  priceLabel: string;
  mode: string;
  img?: string;
}

interface AvailabilityInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUnits: UnitSummary[];
  onClearSelection: () => void;
  onAutoPickN?: (n: number) => void;
}

export default function AvailabilityInquiryModal({
  isOpen,
  onClose,
  selectedUnits,
  onClearSelection,
  onAutoPickN,
}: AvailabilityInquiryModalProps) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+20 ');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<{
    sessionId: string;
    markedCount: number;
    expiresAt: string;
  } | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState(3600);
  const [copiedSession, setCopiedSession] = useState(false);

  useEffect(() => {
    if (!successData) return;
    setSecondsRemaining(3600);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [successData]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const copySessionId = () => {
    if (successData?.sessionId && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(successData.sessionId);
      setCopiedSession(true);
      setTimeout(() => setCopiedSession(false), 2000);
    }
  };

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    const cleanPhone = clientPhone.replace(/[\s-]/g, '');
    if (!clientName.trim() || clientName.trim().length < 2) {
      setErrorMessage('يرجى إدخال اسم العميل بشكل صحيح (حرفين على الأقل)');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('يرجى إدخال رقم هاتف واتساب صحيح');
      return;
    }

    if (selectedUnits.length === 0) {
      setErrorMessage('شبكة الاختيار فارغة. يرجى اختيار وحدة واحدة على الأقل');
      return;
    }

    if (selectedUnits.length > 40) {
      setErrorMessage('الحد الأقصى للطلب الواحد هو 40 وحدة فقط');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/inquiries/batch-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: cleanPhone,
          unitIds: selectedUnits.map((u) => u.id),
          notes: notes.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال طلب التحقق. برجاء المحاولة مرة أخرى.');
      }

      setSuccessData({
        sessionId: data.sessionId,
        markedCount: data.markedCount,
        expiresAt: data.expiresAt,
      });
      onClearSelection();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e1626] border border-[#c99436]/40 rounded-2xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-linear-to-r from-[#002b4b]/60 via-[#0e1626] to-[#0e1626]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#c99436]/20 text-[#e9c176]">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                شبكة التحقق الفوري من الوحدات
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#c99436]/20 text-[#e9c176] font-mono">
                  {selectedUnits.length} وحدة مختارة
                </span>
              </h3>
              <p className="text-xs text-white/60">
                إرسال مباشر لملاك ووسطاء الوحدات لتأكيد التوافر وجمع أحدث الصور مع معيار ساعة واحدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {successData ? (
            <div className="text-center py-6 space-y-5">
              <div className="inline-flex p-4 rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h4 className="text-xl font-black text-white">تم إطلاق رادار التحقق بنجاح!</h4>
              
              {/* Animated Countdown SLA Box */}
              <div className="p-4 rounded-2xl bg-[#002b4b]/60 border border-[#0077cc]/40 max-w-md mx-auto flex items-center justify-between">
                <div className="text-right">
                  <div className="text-xs text-sky-200 font-medium">العد التنازلي للمعيار الزمني (1 Hour SLA):</div>
                  <div className="text-[11px] text-white/50">تُستبعد أي وحدة غير مجابة تلقائياً عند الصفر</div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-sky-400/30 text-sky-300 font-mono font-black text-lg">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>{formatTime(secondsRemaining)}</span>
                </div>
              </div>

              <p className="text-xs text-white/70 max-w-md mx-auto leading-relaxed">
                تم إرسال استفسارات آلية عبر واتساب لـ{' '}
                <strong className="text-[#e9c176]">{successData.markedCount} وحدة</strong>.
                فور رد المالك أو الوسيط بالصور والمواصفات، يقوم روبوت الذكاء الاصطناعي بتنقيح التفاصيل وإرسالها لك مباشرة عبر واتساب.
              </p>

              {/* Session Details Card */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-md mx-auto text-xs text-white/80 space-y-2 text-right">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={copySessionId}
                    className="flex items-center gap-1 text-[11px] text-[#e9c176] hover:underline"
                  >
                    {copiedSession ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSession ? 'تم النسخ!' : 'نسخ الكود'}</span>
                  </button>
                  <div>كود الجلسة: <span className="font-mono text-white font-bold">{successData.sessionId}</span></div>
                </div>
                <div className="text-white/60">• رقم الهاتف المسجل: <span className="font-mono text-white/90">{clientPhone}</span></div>
                <div className="text-white/60">• حالة المتابعة: <span className="text-emerald-400 font-bold">نشطة الآن عبر واتساب</span></div>
              </div>

              {/* Units Preview in Report */}
              <div className="max-w-md mx-auto text-right">
                <div className="text-[11px] font-semibold text-white/60 mb-2">الوحدات قيد التحقق ({selectedUnits.length}):</div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {selectedUnits.slice(0, 6).map((u) => (
                    <div key={u.id} className="shrink-0 p-2 rounded-lg bg-white/5 border border-white/10 text-[11px] w-28 text-right">
                      <div className="font-bold text-[#e9c176] truncate">{u.code}</div>
                      <div className="text-white/50 text-[10px] truncate">{u.compound}</div>
                      <div className="text-amber-300 text-[9px] mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span>قيد الانتظار</span>
                      </div>
                    </div>
                  ))}
                  {selectedUnits.length > 6 && (
                    <div className="shrink-0 flex items-center justify-center p-2 rounded-lg bg-white/5 border border-dashed border-white/15 text-[10px] text-white/40 w-20">
                      +{selectedUnits.length - 6} أخرى
                    </div>
                  )}
                </div>
              </div>

              {/* Direct WhatsApp Concierge Link */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`https://wa.me/201092048333?text=${encodeURIComponent(`مرحباً سييرا العقارية، أتابع رادار التحقق من الوحدات كود الجلسة: ${successData.sessionId}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>متابعة فورية مع المساعد عبر واتساب</span>
                </a>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-linear-to-r from-[#c99436] to-[#e9c176] text-[#0d0d0f] font-bold text-xs hover:brightness-110 transition-all shadow-lg"
                >
                  العودة للرادار
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* SLA Banner */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#002b4b]/40 border border-[#0077cc]/30 text-xs text-sky-200">
                <Clock className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-sky-300 font-semibold">ضمان وقت الاستجابة (1 Hour SLA):</strong>{' '}
                  يقوم روبوت سييرا بإرسال رسائل استفسار موحدة لكل الملاك والوسطاء. في حال عدم الرد خلال 60 دقيقة، تُصنف الوحدة كـ "غير متاحة" لحفظ وقتك.
                </div>
              </div>

              {/* Units Preview Drawer */}
              <div>
                {selectedUnits.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right space-y-3">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>لم تحدد وحدات بعينها في شبكتك بعد!</span>
                    </div>
                    <p className="text-xs text-amber-100/80 leading-relaxed">
                      وفقاً لطلبك، يمكنك تفعيل الاختيار الذكي الفوري من رادار البحث (بحد أقصى 40 وحدة) لإرسال الاستفسارات بضغطة واحدة:
                    </p>
                    {onAutoPickN && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onAutoPickN(10)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all"
                        >
                          🎯 أول 10 وحدات مطابقة
                        </button>
                        <button
                          type="button"
                          onClick={() => onAutoPickN(20)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all"
                        >
                          🎯 أول 20 وحدة
                        </button>
                        <button
                          type="button"
                          onClick={() => onAutoPickN(40)}
                          className="px-3.5 py-1.5 rounded-lg bg-linear-to-r from-[#c99436] to-[#e9c176] text-[#0d0d0f] text-xs font-black hover:brightness-110 transition-all shadow-md"
                        >
                          ⚡ الحد الأقصى (أفضل 40 وحدة)
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-2">
                      الوحدات المختارة في شبكتك ({selectedUnits.length} / 40 كحد أقصى):
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {selectedUnits.slice(0, 8).map((u) => (
                        <div
                          key={u.id}
                          className="shrink-0 w-36 p-2 rounded-xl bg-white/5 border border-white/10 text-right text-xs space-y-1"
                        >
                          <div className="font-bold text-[#e9c176] truncate">{u.code}</div>
                          <div className="text-white/80 truncate">{u.compound}</div>
                          <div className="text-[10px] text-white/50">{u.type} · {u.mode === 'rent' ? 'إيجار' : 'بيع'}</div>
                          <div className="text-[11px] font-mono text-emerald-400 truncate">{u.priceLabel}</div>
                        </div>
                      ))}
                      {selectedUnits.length > 8 && (
                        <div className="shrink-0 flex items-center justify-center w-28 p-2 rounded-xl bg-white/5 border border-dashed border-white/20 text-xs text-white/50 font-bold">
                          +{selectedUnits.length - 8} وحدات أخرى
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Client Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#c99436]" />
                    الاسم بالكامل <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="مثال: أحمد عبد الرحمن"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c99436] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    رقم الواتساب <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+20 100 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c99436] font-mono transition-colors"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  ملاحظات أو متطلبات خاصة (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: الاستلام فوري، ميزانية كاش، الرغبة في معاينة خلال عطلة نهاية الأسبوع..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c99436] transition-colors resize-none"
                />
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>بياناتك سرية تماماً ولا نشاركها مع الوسطاء</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white hover:bg-white/15 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || selectedUnits.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-linear-to-r from-[#c99436] via-[#e9c176] to-[#c99436] text-[#0d0d0f] font-bold text-xs hover:brightness-110 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#0d0d0f] border-t-transparent rounded-full animate-spin" />
                        <span>جاري إطلاق الرادار...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال للتحقق الفوري ({selectedUnits.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

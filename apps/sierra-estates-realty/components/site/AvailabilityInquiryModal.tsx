'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Clock, Send, AlertCircle, Phone, User, ShieldCheck } from 'lucide-react';

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
}

export default function AvailabilityInquiryModal({
  isOpen,
  onClose,
  selectedUnits,
  onClearSelection,
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e1626] border border-[#c99436]/40 rounded-2xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#002b4b]/60 via-[#0e1626] to-[#0e1626]">
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
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex p-4 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h4 className="text-xl font-bold text-white">تم إطلاق رادار التحقق بنجاح!</h4>
              <p className="text-sm text-white/70 max-w-md mx-auto leading-relaxed">
                تم التواصل آلياً عبر واتساب مع جهات الاتصال المسؤولة عن{' '}
                <strong className="text-[#e9c176]">{successData.markedCount} وحدة</strong>.
                ننتظر الرد وجمع أحدث الصور، وأي وحدة لا يتم الرد عليها خلال{' '}
                <strong className="text-white">ساعة واحدة</strong> سيتم استبعادها تلقائياً.
              </p>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-md mx-auto text-xs text-white/60 space-y-1 text-right">
                <div>• كود الجلسة: <span className="font-mono text-white/90">{successData.sessionId}</span></div>
                <div>• رقم العميل المسجل: <span className="font-mono text-white/90">{clientPhone}</span></div>
                <div>• ستصلك إشعارات فورية بالصور والتفاصيل بمجرد تأكيد أي وحدة.</div>
              </div>
              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c99436] to-[#e9c176] text-[#0d0d0f] font-bold text-sm hover:brightness-110 transition-all shadow-lg"
                >
                  تم، العودة للخريطة
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

              {/* Client Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
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
                  <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
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
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c99436] via-[#e9c176] to-[#c99436] text-[#0d0d0f] font-bold text-xs hover:brightness-110 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

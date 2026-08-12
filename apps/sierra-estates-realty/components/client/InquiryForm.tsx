"use client";
/**
 * InquiryForm — concierge section.
 * Posts to /api/inquiries. On success shows a confirmation panel.
 */
import { useState } from "react";
import { ConciergeBell, Loader2, CheckCircle2, Phone, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n-client";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/client/Toast";
import { PROPERTY_TYPES, COMPOUND_ZONES } from "@/lib/seed";

export function InquiryForm() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    mode: "sale", name: "", phone: "", email: "",
    zone: "", type: "", budget: "", notes: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!form.name || !form.phone) {
      toast({ title: "Name and phone required", kind: "warning" });
      return;
    }
    setBusy(true);
    try {
      await api.submitInquiry(form);
      setDone(true);
      toast({ title: t("form.success"), kind: "success" });
    } catch (err: any) {
      toast({ title: t("form.error"), description: err.message, kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="concierge" className="py-20 bg-navy-950 text-cream scroll-mt-20">
      <div className="container-page max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 items-center justify-center mb-3">
            <ConciergeBell className="h-6 w-6 text-navy-950" />
          </div>
          <p className="section-eyebrow !text-gold-300">{t("concierge.subtitle")}</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-2 text-cream">{t("concierge.title")}</h2>
        </div>

        {done ? (
          <div className="card !bg-navy-900 !border-cream/10 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="font-serif text-2xl font-bold text-cream mb-2">{t("form.success")}</h3>
            <p className="text-cream/70 mb-6">A senior agent will reach out within 24 hours.</p>
            <div className="flex justify-center gap-3">
              <a href="tel:+201001234567" className="btn-gold"><Phone className="h-4 w-4" /> Call now</a>
              <a href="mailto:hello@sierra-estates.net" className="btn-outline !text-cream !border-cream/30 hover:!bg-cream/10">
                <Mail className="h-4 w-4" /> Email
              </a>
            </div>
            <button onClick={() => { setDone(false); setForm({ mode: "sale", name: "", phone: "", email: "", zone: "", type: "", budget: "", notes: "" }); }} className="text-xs text-cream/50 mt-6 hover:text-cream">
              Submit another inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="card !bg-navy-900 !border-cream/10 p-6 sm:p-8 space-y-4">
            <div className="inline-flex p-1 rounded-md bg-cream/5">
              {(["sale", "rent"] as const).map((m) => (
                <button
                  key={m} type="button"
                  onClick={() => set("mode", m)}
                  className={`px-4 py-1.5 rounded text-sm font-semibold ${
                    form.mode === m ? "bg-gold-500 text-navy-950" : "text-cream/70"
                  }`}
                >
                  {m === "sale" ? t("search.buy") : t("search.rent")}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label !text-cream/70">{t("form.name")} *</label>
                <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className="label !text-cream/70">{t("form.phone")} *</label>
                <input className="input" required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+20 100 123 4567" />
              </div>
              <div>
                <label className="label !text-cream/70">{t("form.email")}</label>
                <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <label className="label !text-cream/70">{t("form.budget")}</label>
                <input className="input" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. 3000-5000 USD" />
              </div>
              <div>
                <label className="label !text-cream/70">{t("search.compound")}</label>
                <select className="input" value={form.zone} onChange={(e) => set("zone", e.target.value)}>
                  <option value="">Any zone</option>
                  {COMPOUND_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="label !text-cream/70">{t("search.type")}</label>
                <select className="input" value={form.type} onChange={(e) => set("type", e.target.value)}>
                  <option value="">Any type</option>
                  {PROPERTY_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label !text-cream/70">{t("form.notes")}</label>
              <textarea
                className="input min-h-24"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Tell us what you're looking for — compounds, must-haves, timeline…"
              />
            </div>

            <button type="submit" disabled={busy} className="btn-gold w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ConciergeBell className="h-4 w-4" />}
              {busy ? "Sending…" : t("form.submit")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

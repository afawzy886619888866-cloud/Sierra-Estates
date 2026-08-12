"use client";
/**
 * SmartMatch — 4-question quiz (budget, beds, type, zone, mode).
 * On submit, calls POST /api/matches → top 3 listings.
 */
import { useState } from "react";
import { Sparkles, Loader2, ArrowRight, ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n-client";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/client/Toast";
import Image from "next/image";
import { fmtUSD, fmtArea, fmtScore } from "@/lib/format";
import { PROPERTY_TYPES, COMPOUND_ZONES } from "@/lib/seed";
import type { MatchAnswers, MatchResult, PropertyType, CompoundZone, ListingMode } from "@/lib/types";

const STEPS = ["Mode", "Type", "Budget", "Bedrooms", "Zone"] as const;

export function SmartMatch() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<MatchAnswers>({
    budget: 3000, beds: 3, type: "Villa", mode: "sale",
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResult[] | null>(null);

  function next() { setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function submit() {
    setLoading(true);
    setResults(null);
    try {
      const r = await api.match(answers);
      setResults(r);
      if (r.length === 0) toast({ title: "No matches found", kind: "warning" });
    } catch (err: any) {
      toast({ title: t("form.error"), description: err.message, kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(0); setResults(null);
    setAnswers({ budget: 3000, beds: 3, type: "Villa", mode: "sale" });
  }

  return (
    <section id="match" className="py-20 bg-gradient-to-br from-gold-300/10 to-navy-900/5 scroll-mt-20">
      <div className="container-page max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 items-center justify-center mb-3">
            <Sparkles className="h-6 w-6 text-navy-950" />
          </div>
          <p className="section-eyebrow">{t("match.subtitle")}</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-2">{t("match.title")}</h2>
        </div>

        {!results && (
          <div className="card p-6 sm:p-8">
            {/* Progress */}
            <div className="flex items-center justify-between mb-6">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1 flex items-center">
                  <div className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-gold-500" : i === step ? "bg-gold-300" : "bg-border"}`} />
                  <span className={`text-xs mx-1 ${i === step ? "font-bold text-navy-900" : "text-muted"}`}>{i + 1}</span>
                </div>
              ))}
            </div>

            <div className="min-h-[180px]">
              {step === 0 && (
                <Choice
                  label="Buy or Rent?"
                  value={answers.mode}
                  options={[
                    { value: "sale", label: "Buy", desc: "Find my forever home" },
                    { value: "rent", label: "Rent", desc: "Flexible living" },
                  ]}
                  onChange={(v) => setAnswers((a) => ({ ...a, mode: v as ListingMode }))}
                />
              )}
              {step === 1 && (
                <Choice
                  label="What type?"
                  value={answers.type}
                  options={PROPERTY_TYPES.map((tp) => ({ value: tp, label: tp, desc: "" }))}
                  onChange={(v) => setAnswers((a) => ({ ...a, type: v as PropertyType }))}
                  grid
                />
              )}
              {step === 2 && (
                <Slider
                  label="Your budget (USD total)"
                  value={answers.budget}
                  min={500} max={10000} step={500}
                  format={(v) => fmtUSD(v)}
                  onChange={(v) => setAnswers((a) => ({ ...a, budget: v }))}
                />
              )}
              {step === 3 && (
                <Slider
                  label="Bedrooms"
                  value={answers.beds}
                  min={1} max={6} step={1}
                  format={(v) => `${v}+`}
                  onChange={(v) => setAnswers((a) => ({ ...a, beds: v }))}
                />
              )}
              {step === 4 && (
                <Choice
                  label="Preferred zone? (optional)"
                  value={answers.preferredZone ?? ""}
                  options={[
                    { value: "", label: "No preference", desc: "Search all zones" },
                    ...COMPOUND_ZONES.map((z) => ({ value: z, label: z, desc: "" })),
                  ]}
                  onChange={(v) => setAnswers((a) => ({ ...a, preferredZone: (v || undefined) as CompoundZone }))}
                  grid
                />
              )}
            </div>

            <div className="flex items-center justify-between mt-6">
              <button onClick={back} disabled={step === 0} className="btn-ghost">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={next} className="btn-gold">
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={submit} disabled={loading} className="btn-gold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "Matching…" : "Find my matches"}
                </button>
              )}
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl font-bold">Your top {results.length} matches</h3>
              <button onClick={reset} className="btn-ghost">
                <RotateCcw className="h-4 w-4" /> Restart
              </button>
            </div>
            {results.length === 0 ? (
              <div className="card p-8 text-center text-muted">No listings matched. Try widening your criteria.</div>
            ) : (
              results.map((r, i) => (
                <div key={r.listing.id} className="card p-4 flex gap-4 items-center">
                  <div className="relative h-24 w-32 rounded-md overflow-hidden bg-navy-900/5 flex-shrink-0">
                    <Image src={r.listing.img} alt={r.listing.compound} fill sizes="128px" className="object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 badge bg-gold-500 text-navy-950">
                        <Trophy className="h-3 w-3" /> Best match
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-serif text-lg font-bold">{r.listing.type} in {r.listing.compound}</p>
                      <span className="badge-gold">{r.score}/100</span>
                    </div>
                    <p className="text-sm text-muted">{fmtUSD(r.listing.usd)} · {r.listing.beds}BR · {fmtArea(r.listing.area)} · AI {fmtScore(r.listing.aiScore)}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.reasons.map((reason, idx) => (
                        <span key={idx} className="badge-gray text-[10px]">{reason}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Choice<T extends string>({
  label, value, options, onChange, grid,
}: {
  label: string; value: T;
  options: Array<{ value: string; label: string; desc?: string }>;
  onChange: (v: string) => void; grid?: boolean;
}) {
  return (
    <div>
      <h3 className="font-serif text-xl font-bold mb-4 text-center">{label}</h3>
      <div className={`grid gap-2 ${grid ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`p-4 rounded-md border-2 text-left transition-all ${
              value === o.value
                ? "border-gold-500 bg-gold-300/10"
                : "border-border hover:border-navy-900/30"
            }`}
          >
            <p className="font-semibold text-sm">{o.label}</p>
            {o.desc && <p className="text-xs text-muted mt-0.5">{o.desc}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-xl font-bold">{label}</h3>
        <span className="badge-gold text-base">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full bg-border appearance-none cursor-pointer accent-gold-500"
      />
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

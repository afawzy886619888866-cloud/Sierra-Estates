"use client";
/**
 * ROICalculator — price + rent → yield, annual rent, payback.
 * Two sliders (price USD, monthly rent USD) + result tiles + a
 * simple line indicator showing payback vs. 25-year horizon.
 */
import { useState } from "react";
import { Calculator, TrendingUp, Calendar, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n-client";
import { fmtUSD, fmtYield, fmtPaybackYears } from "@/lib/format";

export function ROICalculator() {
  const { t } = useI18n();
  const [price, setPrice] = useState(500_000);
  const [monthlyRent, setMonthlyRent] = useState(2_000);

  const annualRent = monthlyRent * 12;
  const yld = fmtYield(annualRent, price);
  const payback = fmtPaybackYears(annualRent, price);
  const netAnnual = annualRent * 0.8; // assume 20% costs (vacancy, maintenance, mgmt)
  const netYield = (netAnnual / price) * 100;

  const verdict =
    yld >= 7 ? { label: "Excellent yield", color: "text-emerald-600", badge: "badge-green" }
    : yld >= 5 ? { label: "Good yield", color: "text-gold-600", badge: "badge-amber" }
    : yld >= 3 ? { label: "Average yield", color: "text-amber-600", badge: "badge-amber" }
    : { label: "Below market", color: "text-red-600", badge: "badge-red" };

  return (
    <section id="roi" className="py-20 scroll-mt-20">
      <div className="container-page max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-lg bg-navy-900 items-center justify-center mb-3">
            <Calculator className="h-6 w-6 text-gold-300" />
          </div>
          <p className="section-eyebrow">{t("roi.subtitle")}</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-2">{t("roi.title")}</h2>
        </div>

        <div className="card p-6 sm:p-8 grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label !mb-0">Property price</label>
                <span className="badge-gold">{fmtUSD(price)}</span>
              </div>
              <input
                type="range" min={100_000} max={5_000_000} step={25_000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full h-2 rounded-full bg-border appearance-none cursor-pointer accent-gold-500"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>$100K</span><span>$5M</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label !mb-0">Monthly rent</label>
                <span className="badge-gold">{fmtUSD(monthlyRent)}</span>
              </div>
              <input
                type="range" min={500} max={20_000} step={100}
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="w-full h-2 rounded-full bg-border appearance-none cursor-pointer accent-gold-500"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>$500</span><span>$20K</span>
              </div>
            </div>

            <div className={`p-3 rounded-md text-center ${verdict.badge}`}>
              <p className="font-semibold">{verdict.label}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Tile icon={Wallet} label="Annual gross rent" value={fmtUSD(annualRent)} />
            <Tile icon={TrendingUp} label="Gross yield" value={`${yld.toFixed(2)}%`} accent />
            <Tile icon={Wallet} label="Annual net rent (after 20% costs)" value={fmtUSD(netAnnual)} />
            <Tile icon={TrendingUp} label="Net yield" value={`${netYield.toFixed(2)}%`} />
            <Tile icon={Calendar} label="Payback period" value={`${payback.toFixed(1)} years`} />

            {/* Payback bar */}
            <div>
              <p className="text-xs text-muted mb-1">Payback vs 25-year horizon</p>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold-500 to-gold-300"
                  style={{ width: `${Math.min(100, (payback / 25) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`p-4 rounded-md border ${accent ? "border-gold-500 bg-gold-300/10" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${accent ? "text-gold-600" : "text-muted"}`} />
          <span className="text-xs text-muted">{label}</span>
        </div>
        <span className={`font-bold ${accent ? "text-gold-600 text-lg" : "text-navy-900"}`}>{value}</span>
      </div>
    </div>
  );
}

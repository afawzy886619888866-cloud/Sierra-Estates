/**
 * Formatting helpers — EGP/USD currency, area, AI score, relative time.
 */
export function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtEGP(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtEGPM(n: number): string {
  // EGP per m², in thousands
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}K EGP/m²`;
}

export function fmtArea(n: number): string {
  return `${n.toLocaleString("en-US")} m²`;
}

export function fmtScore(n: number | null | undefined): string {
  if (n == null) return "0.0";
  return n.toFixed(1);
}

export function fmtRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function fmtPercent(n: number | null | undefined, digits = 1): string {
  if (n == null) return "0%";
  return `${n.toFixed(digits)}%`;
}

export function fmtYield(annualRent: number, price: number): number {
  if (!price) return 0;
  return (annualRent / price) * 100;
}

export function fmtPaybackYears(annualRent: number, price: number): number {
  if (!annualRent) return 0;
  return price / annualRent;
}

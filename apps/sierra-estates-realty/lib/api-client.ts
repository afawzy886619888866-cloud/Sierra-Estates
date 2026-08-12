/**
 * Thin fetch wrappers used by client components. All endpoints return JSON.
 * Each helper throws on non-2xx so callers can use try/catch.
 */
import type {
  Listing, Compound, Inquiry, Lead, User, MatchAnswers, MatchResult,
  DashboardKPIs, Reports, AuditLog,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${msg}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async listings(params?: {
    mode?: string; compound?: string; type?: string;
    beds?: number; maxUsd?: number; q?: string;
  }): Promise<Listing[]> {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params))
      if (v != null && v !== "") qs.set(k, String(v));
    const url = `/api/listings${qs.toString() ? `?${qs}` : ""}`;
    return json<Listing[]>(await fetch(url, { cache: "no-store" }));
  },

  async compounds(): Promise<Compound[]> {
    return json<Compound[]>(await fetch("/api/compounds", { cache: "no-store" }));
  },

  async submitInquiry(payload: {
    mode: string; name: string; phone: string; email?: string;
    zone?: string; type?: string; budget?: string; notes?: string;
  }): Promise<{ id: string }> {
    return json<{ id: string }>(await fetch("/api/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }));
  },

  async match(answers: MatchAnswers): Promise<MatchResult[]> {
    return json<MatchResult[]>(await fetch("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(answers),
    }));
  },

  async signIn(email: string, password?: string, token?: string): Promise<{ ok: true; role?: string }> {
    return json<{ ok: true; role?: string }>(await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "signin", email, password, token }),
    }));
  },

  async signOut(): Promise<{ ok: true }> {
    return json<{ ok: true }>(await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "signout" }),
    }));
  },

  async me(): Promise<{ signedIn: boolean; role?: string; name?: string; email?: string }> {
    return json(await fetch("/api/auth", { cache: "no-store" }));
  },

  /* ─── Admin endpoints ─── */
  async adminDashboard(): Promise<DashboardKPIs> {
    return json<DashboardKPIs>(await fetch("/api/admin/dashboard", { cache: "no-store" }));
  },
  async adminInquiries(): Promise<Inquiry[]> {
    return json<Inquiry[]>(await fetch("/api/admin/inquiries", { cache: "no-store" }));
  },
  async adminUpdateInquiry(id: string, patch: Partial<Inquiry>): Promise<{ ok: true }> {
    return json(await fetch(`/api/admin/inquiries?id=${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }));
  },
  async adminUsers(): Promise<User[]> {
    return json<User[]>(await fetch("/api/admin/users", { cache: "no-store" }));
  },
  async adminUpdateUser(uid: string, patch: Partial<User>): Promise<{ ok: true }> {
    return json(await fetch(`/api/admin/users?uid=${uid}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }));
  },
  async adminReports(): Promise<Reports> {
    return json<Reports>(await fetch("/api/admin/reports", { cache: "no-store" }));
  },
  async adminLeads(): Promise<Lead[]> {
    return json<Lead[]>(await fetch("/api/leads", { cache: "no-store" }));
  },
  async adminAuditLogs(): Promise<AuditLog[]> {
    return json<AuditLog[]>(await fetch("/api/admin/audit", { cache: "no-store" }));
  },
  async createListing(payload: Partial<Listing>): Promise<{ id: string }> {
    return json<{ id: string }>(await fetch("/api/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }));
  },
  async updateListing(id: string, patch: Partial<Listing>): Promise<{ ok: true }> {
    return json(await fetch(`/api/listings/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }));
  },
  async deleteListing(id: string): Promise<{ ok: true }> {
    return json(await fetch(`/api/listings/${id}`, { method: "DELETE" }));
  },
};

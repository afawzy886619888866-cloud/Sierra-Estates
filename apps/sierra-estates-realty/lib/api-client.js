








async function json(res) {
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${msg}`);
  }
  return res.json() ;
}

export const api = {
  async listings(params


) {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params))
      if (v != null && v !== "") qs.set(k, String(v));
    const url = `/api/listings${qs.toString() ? `?${qs}` : ""}`;
    return json(await fetch(url, { cache: "no-store" }));
  },

  async compounds() {
    return json(await fetch("/api/compounds", { cache: "no-store" }));
  },

  async submitInquiry(payload


) {
    return json(await fetch("/api/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }));
  },

  async match(answers) {
    return json(await fetch("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(answers),
    }));
  },

  async signIn(email, password, token) {
    return json(await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "signin", email, password, token }),
    }));
  },

  async signOut() {
    return json(await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "signout" }),
    }));
  },

  async me() {
    return json(await fetch("/api/auth", { cache: "no-store" }));
  },

  /* ─── Admin endpoints ─── */
  async adminDashboard() {
    return json(await fetch("/api/admin/dashboard", { cache: "no-store" }));
  },
  async adminInquiries() {
    return json(await fetch("/api/admin/inquiries", { cache: "no-store" }));
  },
  async adminUpdateInquiry(id, patch) {
    return json(await fetch(`/api/admin/inquiries?id=${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }));
  },
  async adminUsers() {
    return json(await fetch("/api/admin/users", { cache: "no-store" }));
  },
  async adminUpdateUser(uid, patch) {
    return json(await fetch(`/api/admin/users?uid=${uid}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }));
  },
  async adminReports() {
    return json(await fetch("/api/admin/reports", { cache: "no-store" }));
  },
  async adminLeads() {
    return json(await fetch("/api/leads", { cache: "no-store" }));
  },
  async adminAuditLogs() {
    return json(await fetch("/api/admin/audit", { cache: "no-store" }));
  },
  async createListing(payload) {
    return json(await fetch("/api/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }));
  },
  async updateListing(id, patch) {
    return json(await fetch(`/api/listings/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }));
  },
  async deleteListing(id) {
    return json(await fetch(`/api/listings/${id}`, { method: "DELETE" }));
  },
};

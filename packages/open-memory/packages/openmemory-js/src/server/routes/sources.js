 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * sources webhook routes - ingest data from external sources via HTTP
 *
 * POST /sources/:source/ingest
 *   body: { creds: {...}, filters: {...} }
 *
 * POST /sources/webhook/:source
 *   generic webhook endpoint for source-specific payloads. Webhook
 *   endpoints REQUIRE a configured shared secret per source and verify
 *   the request signature with HMAC-SHA256 (constant-time compare).
 *
 * SECURITY:
 *  - /sources/:source/ingest derives the tenant from req.tenant — clients
 *    can no longer ingest into another tenant's bucket via body.user_id.
 *  - /sources/webhook/:source is unauthenticated by API-key (it gets
 *    called by the upstream service), but requires a valid HMAC over the
 *    raw request body and falls closed to 503 if no secret is configured.
 */

import * as sources from "../../sources";
import { require_tenant, reject_tenant_mismatch } from "../middleware/tenant";
import { parse_or_400, } from "../middleware/validate";
import {
    verify_github_signature,
    verify_notion_signature,
} from "../middleware/webhook";

const ingest_schema = {
    creds: { type: "object" },
    filters: { type: "object" },
    user_id: { type: "string", max_length: 256 },
};

export function src(app) {
    app.get("/sources", async (_req, res) => {
        res.json({
            sources: [
                "github",
                "notion",
                "google_drive",
                "google_sheets",
                "google_slides",
                "onedrive",
                "web_crawler",
            ],
            usage: {
                ingest: "POST /sources/:source/ingest { creds: {}, filters: {} }",
                webhook:
                    "POST /sources/webhook/:source (HMAC-SHA256 signed via OM_<SOURCE>_WEBHOOK_SECRET)",
            },
        });
    });

    app.post("/sources/:source/ingest", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        const b = parse_or_400



(res, req.body || {}, ingest_schema);
        if (!b) return;
        if (reject_tenant_mismatch(res, tenant, b.user_id)) return;

        const { source } = req.params;
        const source_map = {
            github: sources.github_source,
            notion: sources.notion_source,
            google_drive: sources.google_drive_source,
            google_sheets: sources.google_sheets_source,
            google_slides: sources.google_slides_source,
            onedrive: sources.onedrive_source,
            web_crawler: sources.web_crawler_source,
        };

        if (!source_map[source]) {
            return res.status(400).json({
                error: `unknown source: ${source}`,
                available: Object.keys(source_map),
            });
        }

        try {
            const Ctor = source_map[source];
            const inst = new Ctor(tenant);
            await inst.connect(b.creds || {});
            const ids = await inst.ingest_all(b.filters || {});
            res.json({ ok: true, ingested: ids.length, memory_ids: ids });
        } catch (e) {
            console.error("[sources] ingest failed:", e);
            res.status(500).json({ error: e.message });
        }
    });

    app.post("/sources/webhook/github", async (req, res) => {
        const secret = process.env.OM_GITHUB_WEBHOOK_SECRET;
        if (!secret) {
            return res
                .status(503)
                .json({ error: "webhook_not_configured", source: "github" });
        }
        const sig = req.headers["x-hub-signature-256"];
        const verify = verify_github_signature(req.rawBody, sig, secret);
        if (!verify.ok) {
            console.warn(`[sources/github] signature reject: ${verify.reason}`);
            return res
                .status(401)
                .json({ error: "invalid_signature", reason: verify.reason });
        }

        const event_type = req.headers["x-github-event"];
        const payload = req.body;
        if (!payload) {
            return res.status(400).json({ error: "no payload" });
        }

        try {
            const { ingestDocument } = await import("../../ops/ingest");

            let content = "";
            const meta = {
                source: "github_webhook",
                event: event_type,
            };

            if (event_type === "push") {
                const commits = payload.commits || [];
                content = commits
                    .map((c) => `${c.message}\n${c.url}`)
                    .join("\n\n");
                meta.repo = _optionalChain([payload, 'access', _ => _.repository, 'optionalAccess', _2 => _2.full_name]);
                meta.ref = payload.ref;
            } else if (event_type === "issues") {
                content = `[${payload.action}] ${_optionalChain([payload, 'access', _3 => _3.issue, 'optionalAccess', _4 => _4.title])}\n${_optionalChain([payload, 'access', _5 => _5.issue, 'optionalAccess', _6 => _6.body]) || ""}`;
                meta.repo = _optionalChain([payload, 'access', _7 => _7.repository, 'optionalAccess', _8 => _8.full_name]);
                meta.issue_number = _optionalChain([payload, 'access', _9 => _9.issue, 'optionalAccess', _10 => _10.number]);
            } else if (event_type === "pull_request") {
                content = `[${payload.action}] PR: ${_optionalChain([payload, 'access', _11 => _11.pull_request, 'optionalAccess', _12 => _12.title])}\n${_optionalChain([payload, 'access', _13 => _13.pull_request, 'optionalAccess', _14 => _14.body]) || ""}`;
                meta.repo = _optionalChain([payload, 'access', _15 => _15.repository, 'optionalAccess', _16 => _16.full_name]);
                meta.pr_number = _optionalChain([payload, 'access', _17 => _17.pull_request, 'optionalAccess', _18 => _18.number]);
            } else {
                content = JSON.stringify(payload, null, 2);
            }

            if (content) {
                const result = await ingestDocument(
                    "text" ,
                    content,
                    meta,
                );
                res.json({
                    ok: true,
                    memory_id: result.root_memory_id,
                    event: event_type,
                });
            } else {
                res.json({ ok: true, skipped: true, reason: "no content" });
            }
        } catch (e) {
            console.error("[sources/github] ingest failed:", e);
            res.status(500).json({ error: e.message });
        }
    });

    app.post("/sources/webhook/notion", async (req, res) => {
        const secret = process.env.OM_NOTION_WEBHOOK_SECRET;
        if (!secret) {
            // Notion's public API does not currently document a verified
            // webhook signature scheme. We require an explicit shared
            // secret and HMAC-SHA256 over the raw body. If you don't set
            // one, the endpoint is disabled.
            return res
                .status(503)
                .json({ error: "webhook_not_configured", source: "notion" });
        }
        const sig = req.headers["x-notion-signature"];
        const verify = verify_notion_signature(req.rawBody, sig, secret);
        if (!verify.ok) {
            console.warn(`[sources/notion] signature reject: ${verify.reason}`);
            return res
                .status(401)
                .json({ error: "invalid_signature", reason: verify.reason });
        }

        const payload = req.body;
        try {
            const { ingestDocument } = await import("../../ops/ingest");
            const content = JSON.stringify(payload, null, 2);
            const result = await ingestDocument("text" , content, {
                source: "notion_webhook",
            });
            res.json({ ok: true, memory_id: result.root_memory_id });
        } catch (e) {
            console.error("[sources/notion] ingest failed:", e);
            res.status(500).json({ error: e.message });
        }
    });
}

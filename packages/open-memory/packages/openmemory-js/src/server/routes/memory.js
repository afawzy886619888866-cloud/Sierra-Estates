 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { q, vector_store } from "../../core/db";
import { j, p } from "../../utils";
import {
    add_hsg_memory,
    hsg_query,
    reinforce_memory,
    update_memory,
} from "../../memory/hsg";
import { ingestDocument, ingestURL } from "../../ops/ingest";
import { update_user_summary } from "../../memory/user_summary";
import { require_tenant, reject_tenant_mismatch } from "../middleware/tenant";
import { parse_or_400, } from "../middleware/validate";

const add_schema = {
    content: {
        type: "string",
        required: true,
        min_length: 1,
        max_length: 200000,
    },
    tags: {
        type: "array",
        items: { type: "string", max_length: 256 },
        max_items: 64,
    },
    metadata: { type: "object" },
    user_id: { type: "string", max_length: 256 },
};

const ingest_schema = {
    content_type: { type: "string", required: true, max_length: 64 },
    data: { type: "string", required: true, max_length: 5000000 },
    metadata: { type: "object" },
    config: { type: "object" },
    user_id: { type: "string", max_length: 256 },
};

const ingest_url_schema = {
    url: { type: "string", required: true, min_length: 1, max_length: 8192 },
    metadata: { type: "object" },
    config: { type: "object" },
    user_id: { type: "string", max_length: 256 },
};

const query_schema = {
    query: { type: "string", required: true, min_length: 1, max_length: 8192 },
    k: { type: "integer", min: 1, max: 200 },
    startTime: { type: "number", min: 0 },
    endTime: { type: "number", min: 0 },
    filters: {
        type: "object",
        fields: {
            sector: { type: "string", max_length: 64 },
            min_score: { type: "number", min: 0, max: 1 },
            user_id: { type: "string", max_length: 256 },
            startTime: { type: "number", min: 0 },
            endTime: { type: "number", min: 0 },
        },
    },
    user_id: { type: "string", max_length: 256 },
};

const reinforce_schema = {
    id: { type: "string", required: true, min_length: 1, max_length: 256 },
    boost: { type: "number", min: 0, max: 100 },
};

const patch_schema = {
    content: { type: "string", max_length: 200000 },
    tags: {
        type: "array",
        items: { type: "string", max_length: 256 },
        max_items: 64,
    },
    metadata: { type: "object" },
    user_id: { type: "string", max_length: 256 },
};

export function mem(app) {
    app.post("/memory/add", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        const b = parse_or_400




(res, req.body, add_schema);
        if (!b) return;
        if (reject_tenant_mismatch(res, tenant, b.user_id)) return;
        try {
            const m = await add_hsg_memory(
                b.content,
                j(b.tags || []),
                b.metadata,
                tenant,
            );
            res.json(m);
            update_user_summary(tenant).catch((e) =>
                console.error("[mem] user summary update failed:", e),
            );
        } catch (e) {
            res.status(500).json({ err: e.message });
        }
    });

    app.post("/memory/ingest", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        const b = parse_or_400





(res, req.body, ingest_schema);
        if (!b) return;
        if (reject_tenant_mismatch(res, tenant, b.user_id)) return;
        try {
            const r = await ingestDocument(
                b.content_type ,
                b.data,
                b.metadata,
                b.config,
                tenant,
            );
            res.json(r);
        } catch (e) {
            res.status(500).json({ err: "ingest_fail", msg: e.message });
        }
    });

    app.post("/memory/ingest/url", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        const b = parse_or_400




(res, req.body, ingest_url_schema);
        if (!b) return;
        if (reject_tenant_mismatch(res, tenant, b.user_id)) return;
        try {
            const r = await ingestURL(b.url, b.metadata, b.config, tenant);
            res.json(r);
        } catch (e) {
            res.status(500).json({ err: "url_fail", msg: e.message });
        }
    });

    app.post("/memory/query", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        const b = parse_or_400












(res, req.body, query_schema);
        if (!b) return;
        if (reject_tenant_mismatch(res, tenant, b.user_id, _optionalChain([b, 'access', _ => _.filters, 'optionalAccess', _2 => _2.user_id])))
            return;

        const k = b.k || 8;
        try {
            const f = {
                sectors: _optionalChain([b, 'access', _3 => _3.filters, 'optionalAccess', _4 => _4.sector]) ? [b.filters.sector] : undefined,
                minSalience: _optionalChain([b, 'access', _5 => _5.filters, 'optionalAccess', _6 => _6.min_score]),
                user_id: tenant,
                startTime: _nullishCoalesce(_optionalChain([b, 'access', _7 => _7.filters, 'optionalAccess', _8 => _8.startTime]), () => ( b.startTime)),
                endTime: _nullishCoalesce(_optionalChain([b, 'access', _9 => _9.filters, 'optionalAccess', _10 => _10.endTime]), () => ( b.endTime)),
            };
            const m = await hsg_query(b.query, k, f);
            res.json({
                query: b.query,
                matches: m.map((x) => ({
                    id: x.id,
                    content: x.content,
                    score: x.score,
                    sectors: x.sectors,
                    primary_sector: x.primary_sector,
                    path: x.path,
                    salience: x.salience,
                    last_seen_at: x.last_seen_at,
                })),
            });
        } catch (e) {
            // SECURITY: previously this swallowed errors and returned an
            // empty result set, hiding backend outages from clients and
            // making silent regressions invisible. Now report 500.
            console.error("[mem] /memory/query failed:", e);
            res.status(500).json({
                error: "query_failed",
                message: _optionalChain([e, 'optionalAccess', _11 => _11.message]) || "internal",
            });
        }
    });

    app.post("/memory/reinforce", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        const b = parse_or_400(
            res,
            req.body,
            reinforce_schema,
        );
        if (!b) return;
        try {
            const m = await q.get_mem.get(b.id);
            if (!m) return res.status(404).json({ err: "nf" });
            if (m.user_id && m.user_id !== tenant)
                return res.status(403).json({ err: "forbidden" });
            await reinforce_memory(b.id, b.boost);
            res.json({ ok: true });
        } catch (e) {
            res.status(404).json({ err: "nf" });
        }
    });

    app.patch("/memory/:id", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        const id = req.params.id;
        if (!id) return res.status(400).json({ err: "id" });
        const b = parse_or_400




(res, req.body, patch_schema);
        if (!b) return;
        if (reject_tenant_mismatch(res, tenant, b.user_id)) return;
        try {
            const m = await q.get_mem.get(id);
            if (!m) return res.status(404).json({ err: "nf" });
            if (m.user_id && m.user_id !== tenant) {
                return res.status(403).json({ err: "forbidden" });
            }
            const r = await update_memory(id, b.content, b.tags, b.metadata);
            res.json(r);
        } catch (e) {
            if (e.message && e.message.includes("not found")) {
                res.status(404).json({ err: "nf" });
            } else {
                res.status(500).json({ err: "internal" });
            }
        }
    });

    app.get("/memory/all", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        if (reject_tenant_mismatch(res, tenant, req.query.user_id)) return;
        try {
            const u = req.query.u ? parseInt(req.query.u, 10) : 0;
            const l = req.query.l ? parseInt(req.query.l, 10) : 100;
            if (
                !Number.isFinite(u) ||
                !Number.isFinite(l) ||
                u < 0 ||
                l < 0 ||
                l > 10000
            ) {
                return res.status(400).json({ error: "invalid_pagination" });
            }
            // Always scope to the authenticated tenant — sector filter is
            // applied client-side after the user_id filter.
            const r = await q.all_mem_by_user.all(tenant, l, u);
            const sector =
                typeof req.query.sector === "string"
                    ? req.query.sector
                    : undefined;
            const filtered = sector
                ? r.filter((x) => x.primary_sector === sector)
                : r;

            const i = filtered.map((x) => ({
                id: x.id,
                content: x.content,
                tags: p(x.tags),
                metadata: p(x.meta),
                created_at: x.created_at,
                updated_at: x.updated_at,
                last_seen_at: x.last_seen_at,
                salience: x.salience,
                decay_lambda: x.decay_lambda,
                primary_sector: x.primary_sector,
                version: x.version,
                user_id: x.user_id,
            }));
            res.json({ items: i });
        } catch (e) {
            console.error("[mem] /memory/all failed:", e);
            res.status(500).json({ err: "internal" });
        }
    });

    app.get("/memory/:id", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        if (reject_tenant_mismatch(res, tenant, req.query.user_id)) return;
        try {
            const id = req.params.id;
            const m = await q.get_mem.get(id);
            if (!m) return res.status(404).json({ err: "nf" });
            if (m.user_id && m.user_id !== tenant) {
                return res.status(403).json({ err: "forbidden" });
            }
            const v = await vector_store.getVectorsById(id);
            const sec = v.map((x) => x.sector);
            res.json({
                id: m.id,
                content: m.content,
                primary_sector: m.primary_sector,
                sectors: sec,
                tags: p(m.tags),
                metadata: p(m.meta),
                created_at: m.created_at,
                updated_at: m.updated_at,
                last_seen_at: m.last_seen_at,
                salience: m.salience,
                decay_lambda: m.decay_lambda,
                version: m.version,
                user_id: m.user_id,
            });
        } catch (e) {
            console.error("[mem] /memory/:id failed:", e);
            res.status(500).json({ err: "internal" });
        }
    });

    app.delete("/memory/:id", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        if (
            reject_tenant_mismatch(
                res,
                tenant,
                req.query.user_id,
                _optionalChain([req, 'access', _12 => _12.body, 'optionalAccess', _13 => _13.user_id]),
            )
        )
            return;
        try {
            const id = req.params.id;
            const m = await q.get_mem.get(id);
            if (!m) return res.status(404).json({ err: "nf" });
            if (m.user_id && m.user_id !== tenant) {
                return res.status(403).json({ err: "forbidden" });
            }
            await q.del_mem.run(id);
            await vector_store.deleteVectors(id);
            await q.del_waypoints.run(id, id);
            res.json({ ok: true });
        } catch (e) {
            console.error("[mem] /memory/:id delete failed:", e);
            res.status(500).json({ err: "internal" });
        }
    });
}

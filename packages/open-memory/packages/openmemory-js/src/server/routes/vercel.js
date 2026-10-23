 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { hsg_query, add_hsg_memory } from "../../memory/hsg";
import { j } from "../../utils";
import { require_tenant, reject_tenant_mismatch } from "../middleware/tenant";
import { parse_or_400, } from "../middleware/validate";

const query_schema = {
    query: { type: "string", required: true, min_length: 1, max_length: 4000 },
    user_id: { type: "string", max_length: 256 },
    k: { type: "number", min: 1, max: 32 },
    startTime: { type: "number", min: 0 },
    endTime: { type: "number", min: 0 },
};

const mem_schema = {
    content: {
        type: "string",
        required: true,
        min_length: 1,
        max_length: 200000,
    },
    user_id: { type: "string", max_length: 256 },
    tags: {
        type: "array",
        items: { type: "string", max_length: 256 },
        max_items: 64,
    },
    metadata: { type: "object" },
};

export function vercel(app) {
    app.post("/query", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        const b = parse_or_400





(res, req.body, query_schema);
        if (!b) return;
        if (reject_tenant_mismatch(res, tenant, b.user_id, req.query.user_id))
            return;

        try {
            const query = String(b.query).slice(0, 4000);
            const k = Math.max(1, Math.min(32, Number(b.k) || 8));
            const startTime =
                b.startTime !== undefined ? Number(b.startTime) : undefined;
            const endTime =
                b.endTime !== undefined ? Number(b.endTime) : undefined;
            const matches = await hsg_query(query, k, {
                user_id: tenant,
                startTime,
                endTime,
            });
            const lines = matches.map(
                (m) => `- (${(_nullishCoalesce(m.score, () => ( 0))).toFixed(2)}) ${m.content}`,
            );
            const result = lines.join("\n");

            res.json({
                query,
                user_id: tenant,
                k,
                result,
                matches: matches.map((m) => ({
                    id: m.id,
                    content: m.content,
                    score: m.score,
                    sectors: m.sectors,
                    primary_sector: m.primary_sector,
                    last_seen_at: m.last_seen_at,
                })),
            });
        } catch (e) {
            console.error("[vercel] /query failed:", e);
            res.status(500).json({ err: "internal" });
        }
    });

    app.post("/memories", async (req, res) => {
        const tenant = require_tenant(req, res);
        if (!tenant) return;
        const b = parse_or_400




(res, req.body, mem_schema);
        if (!b) return;
        if (reject_tenant_mismatch(res, tenant, b.user_id, req.query.user_id))
            return;

        try {
            const content = String(b.content).trim();
            if (!content) return res.status(400).json({ err: "content" });
            const tags = Array.isArray(b.tags) ? b.tags : [];
            const r = await add_hsg_memory(
                content,
                j(tags),
                b.metadata,
                tenant,
            );
            res.json(r);
        } catch (e) {
            console.error("[vercel] /memories failed:", e);
            res.status(500).json({ err: "internal" });
        }
    });
}

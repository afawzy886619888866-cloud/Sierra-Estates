 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { add_hsg_memory } from "../memory/hsg";
import { q, transaction } from "../core/db";
import { rid, now, j } from "../utils";
import { extractText, } from "./extract";

const LG = 8000,
    SEC = 3000;














const split = (t, sz) => {
    if (t.length <= sz) return [t];
    const secs = [];
    const paras = t.split(/\n\n+/);
    let cur = "";
    for (const p of paras) {
        if (cur.length + p.length > sz && cur.length > 0) {
            secs.push(cur.trim());
            cur = p;
        } else cur += (cur ? "\n\n" : "") + p;
    }
    if (cur.trim()) secs.push(cur.trim());
    return secs;
};

const mkRoot = async (
    txt,
    ex,
    meta,
    user_id,
) => {
    const sum = txt.length > 500 ? txt.slice(0, 500) + "..." : txt;
    const cnt = `[Document: ${ex.metadata.content_type.toUpperCase()}]\n\n${sum}\n\n[Full content split across ${Math.ceil(txt.length / SEC)} sections]`;
    const id = rid(),
        ts = now();
    await transaction.begin();
    try {
        await q.ins_mem.run(
            id,
            cnt,
            "reflective",
            j([]),
            j({
                ...meta,
                ...ex.metadata,
                is_root: true,
                ingestion_strategy: "root-child",
                ingested_at: ts,
            }),
            ts,
            ts,
            ts,
            1.0,
            0.1,
            1,
            user_id || "anonymous",
            null,
        );
        await transaction.commit();
        return id;
    } catch (e) {
        console.error("[ERROR] Root failed:", e);
        await transaction.rollback();
        throw e;
    }
};

const mkChild = async (
    txt,
    idx,
    tot,
    rid,
    meta,
    user_id,
) => {
    const r = await add_hsg_memory(
        txt,
        j([]),
        {
            ...meta,
            is_child: true,
            section_index: idx,
            total_sections: tot,
            parent_id: rid,
        },
        user_id || undefined,
    );
    return r.id;
};

const link = async (
    rid,
    cid,
    idx,
    user_id,
) => {
    const ts = now();
    await transaction.begin();
    try {
        await q.ins_waypoint.run(rid, cid, user_id || "anonymous", 1.0, ts, ts);
        await transaction.commit();
        console.log(
            `[INGEST] Linked: ${rid.slice(0, 8)} -> ${cid.slice(0, 8)} (section ${idx})`,
        );
    } catch (e) {
        await transaction.rollback();
        console.error(`[INGEST] Link failed for section ${idx}:`, e);
        throw e;
    }
};

export async function ingestDocument(
    t,
    data,
    meta,
    cfg,
    user_id,
) {
    const th = _optionalChain([cfg, 'optionalAccess', _ => _.lg_thresh]) || LG,
        sz = _optionalChain([cfg, 'optionalAccess', _2 => _2.sec_sz]) || SEC;
    const ex = await extractText(t, data);
    const { text, metadata: exMeta } = ex;
    const useRC = _optionalChain([cfg, 'optionalAccess', _3 => _3.force_root]) || exMeta.estimated_tokens > th;

    if (!useRC) {
        const r = await add_hsg_memory(
            text,
            j([]),
            {
                ...meta,
                ...exMeta,
                ingestion_strategy: "single",
                ingested_at: now(),
            },
            user_id || undefined,
        );
        return {
            root_memory_id: r.id,
            child_count: 0,
            total_tokens: exMeta.estimated_tokens,
            strategy: "single",
            extraction: exMeta,
        };
    }

    const secs = split(text, sz);
    console.log(`[INGEST] Document: ${exMeta.estimated_tokens} tokens`);
    console.log(`[INGEST] Splitting into ${secs.length} sections`);

    let rid;
    const cids = [];

    try {
        rid = await mkRoot(text, ex, meta, user_id);
        console.log(`[INGEST] Root memory created: ${rid}`);
        for (let i = 0; i < secs.length; i++) {
            try {
                const cid = await mkChild(
                    secs[i],
                    i,
                    secs.length,
                    rid,
                    meta,
                    user_id,
                );
                cids.push(cid);
                await link(rid, cid, i, user_id);
                console.log(
                    `[INGEST] Section ${i + 1}/${secs.length} processed: ${cid}`,
                );
            } catch (e) {
                console.error(
                    `[INGEST] Section ${i + 1}/${secs.length} failed:`,
                    e,
                );
                throw e;
            }
        }
        console.log(
            `[INGEST] Completed: ${cids.length} sections linked to ${rid}`,
        );
        return {
            root_memory_id: rid,
            child_count: secs.length,
            total_tokens: exMeta.estimated_tokens,
            strategy: "root-child",
            extraction: exMeta,
        };
    } catch (e) {
        console.error("[INGEST] Document ingestion failed:", e);
        throw e;
    }
}

export async function ingestURL(
    url,
    meta,
    cfg,
    user_id,
) {
    const { extractURL } = await import("./extract");
    const ex = await extractURL(url);
    const th = _optionalChain([cfg, 'optionalAccess', _4 => _4.lg_thresh]) || LG,
        sz = _optionalChain([cfg, 'optionalAccess', _5 => _5.sec_sz]) || SEC;
    const useRC = _optionalChain([cfg, 'optionalAccess', _6 => _6.force_root]) || ex.metadata.estimated_tokens > th;

    if (!useRC) {
        const r = await add_hsg_memory(
            ex.text,
            j([]),
            {
                ...meta,
                ...ex.metadata,
                ingestion_strategy: "single",
                ingested_at: now(),
            },
            user_id || undefined,
        );
        return {
            root_memory_id: r.id,
            child_count: 0,
            total_tokens: ex.metadata.estimated_tokens,
            strategy: "single",
            extraction: ex.metadata,
        };
    }

    const secs = split(ex.text, sz);
    console.log(`[INGEST] URL: ${ex.metadata.estimated_tokens} tokens`);
    console.log(`[INGEST] Splitting into ${secs.length} sections`);

    let rid;
    const cids = [];

    try {
        rid = await mkRoot(ex.text, ex, { ...meta, source_url: url }, user_id);
        console.log(`[INGEST] Root memory for URL: ${rid}`);
        for (let i = 0; i < secs.length; i++) {
            try {
                const cid = await mkChild(
                    secs[i],
                    i,
                    secs.length,
                    rid,
                    { ...meta, source_url: url },
                    user_id,
                );
                cids.push(cid);
                await link(rid, cid, i, user_id);
                console.log(
                    `[INGEST] URL section ${i + 1}/${secs.length} processed: ${cid}`,
                );
            } catch (e) {
                console.error(
                    `[INGEST] URL section ${i + 1}/${secs.length} failed:`,
                    e,
                );
                throw e;
            }
        }
        console.log(
            `[INGEST] URL completed: ${cids.length} sections linked to ${rid}`,
        );
        return {
            root_memory_id: rid,
            child_count: secs.length,
            total_tokens: ex.metadata.estimated_tokens,
            strategy: "root-child",
            extraction: ex.metadata,
        };
    } catch (e) {
        console.error("[INGEST] URL ingestion failed:", e);
        throw e;
    }
}

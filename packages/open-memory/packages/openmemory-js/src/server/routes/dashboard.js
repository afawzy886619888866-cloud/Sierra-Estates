 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { all_async, run_async } from "../../core/db";
import { env } from "../../core/cfg";
import * as fs from "fs";
import * as path from "path";

const is_pg = env.metadata_backend === "postgres";

const get_mem_table = () => {
    if (is_pg) {
        const sc = process.env.OM_PG_SCHEMA || "public";
        const tbl = process.env.OM_PG_TABLE || "openmemory_memories";
        return `"${sc}"."${tbl}"`;
    }
    return "memories";
};

let reqz = {
    win_start: Date.now(),
    win_cnt: 0,
    qps_hist: [] ,
};

const log_metric = async (type, value) => {
    try {
        const sc = process.env.OM_PG_SCHEMA || "public";
        const sql = is_pg
            ? `insert into "${sc}"."stats"(type,count,ts) values($1,$2,$3)`
            : "insert into stats(type,count,ts) values(?,?,?)";
        await run_async(sql, [type, value, Date.now()]);
    } catch (e) {
        console.error("[metrics] log err:", e);
    }
};

export function track_req(success) {
    const now = Date.now();
    if (now - reqz.win_start >= 1000) {
        const qps = reqz.win_cnt;

        reqz.qps_hist.push(qps);
        if (reqz.qps_hist.length > 5) reqz.qps_hist.shift();

        log_metric("qps", qps).catch(console.error);
        if (!success) log_metric("error", 1).catch(console.error);

        reqz.win_start = now;
        reqz.win_cnt = 1;
    } else {
        reqz.win_cnt++;
    }
}

export function req_tracker_mw() {
    return (req, res, next) => {
        if (req.url.startsWith("/dashboard") || req.url.startsWith("/health")) {
            return next();
        }
        const orig = res.json.bind(res);
        res.json = (data) => {
            track_req(res.statusCode < 400);
            return orig(data);
        };
        next();
    };
}

const get_db_sz = async () => {
    try {
        if (is_pg) {
            const db_name = process.env.OM_PG_DB || "openmemory";
            const result = await all_async(
                `SELECT pg_database_size('${db_name}') as size`,
            );
            return _optionalChain([result, 'access', _ => _[0], 'optionalAccess', _2 => _2.size])
                ? Math.round(result[0].size / 1024 / 1024)
                : 0;
        } else {
            const dbp = path.resolve(process.cwd(), "./backend", env.db_path);

            if (fs.existsSync(dbp)) {
                const st = fs.statSync(dbp);
                return Math.round(st.size / 1024 / 1024);
            }
            return 0;
        }
    } catch (e) {
        console.error("[db_sz] err:", e);
        return 0;
    }
};

export function dash(app) {
    app.get("/dashboard/projects", async (_req, res) => {
        try {
            const mem_table = get_mem_table();
            const projs = await all_async(
                `SELECT DISTINCT project_id FROM ${mem_table} WHERE project_id IS NOT NULL AND project_id != 'system_global'`,
            );
            res.json({
                projects: projs.map((p) => p.project_id),
            });
        } catch (e) {
            res.status(500).json({ err: "internal", message: e.message });
        }
    });

    app.get("/dashboard/stats", async (req, res) => {
        try {
            const mem_table = get_mem_table();
            const project_id = req.query.project_id;

            let where_clause = "";
            let params = [];

            if (project_id) {
                where_clause = is_pg
                    ? " WHERE (project_id = $1 OR project_id = 'system_global' OR project_id IS NULL)"
                    : " WHERE (project_id = ? OR project_id = 'system_global' OR project_id IS NULL)";
                params = [project_id];
            }

            const totmem = await all_async(
                `SELECT COUNT(*) as count FROM ${mem_table}${where_clause}`,
                params,
            );
            const sectcnt = await all_async(
                `
                SELECT primary_sector, COUNT(*) as count
                FROM ${mem_table}${where_clause}
                GROUP BY primary_sector
            `,
                params,
            );
            const dayago = Date.now() - 24 * 60 * 60 * 1000;

            const recent_where = where_clause
                ? where_clause +
                  (is_pg ? " AND created_at > $2" : " AND created_at > ?")
                : " WHERE created_at > " + (is_pg ? "$1" : "?");
            const recent_params = [...params, dayago];

            const recmem = await all_async(
                `SELECT COUNT(*) as count FROM ${mem_table}${recent_where}`,
                recent_params,
            );
            const avgsal = await all_async(
                `SELECT AVG(salience) as avg FROM ${mem_table}${where_clause}`,
                params,
            );
            const decst = await all_async(
                `
                SELECT
                    COUNT(*) as total,
                    AVG(decay_lambda) as avg_lambda,
                    MIN(salience) as min_salience,
                    MAX(salience) as max_salience
                FROM ${mem_table}${where_clause}
            `,
                params,
            );
            const upt = process.uptime();

            const hour_ago = Date.now() - 60 * 60 * 1000;
            const sc = process.env.OM_PG_SCHEMA || "public";
            const qps_data = await all_async(
                is_pg
                    ? `SELECT count, ts FROM "${sc}"."stats" WHERE type=$1 AND ts > $2 ORDER BY ts DESC`
                    : "SELECT count, ts FROM stats WHERE type=? AND ts > ? ORDER BY ts DESC",
                ["qps", hour_ago],
            );
            const err_data = await all_async(
                is_pg
                    ? `SELECT COUNT(*) as total FROM "${sc}"."stats" WHERE type=$1 AND ts > $2`
                    : "SELECT COUNT(*) as total FROM stats WHERE type=? AND ts > ?",
                ["error", hour_ago],
            );

            const peak_qps =
                qps_data.length > 0
                    ? Math.max(...qps_data.map((d) => d.count))
                    : 0;
            const avg_qps =
                reqz.qps_hist.length > 0
                    ? Math.round(
                          (reqz.qps_hist.reduce((a, b) => a + b, 0) /
                              reqz.qps_hist.length) *
                              100,
                      ) / 100
                    : 0;
            const total_reqs = qps_data.reduce(
                (sum, d) => sum + d.count,
                0,
            );
            const total_errs = _optionalChain([err_data, 'access', _3 => _3[0], 'optionalAccess', _4 => _4.total]) || 0;
            const err_rate =
                total_reqs > 0
                    ? ((total_errs / total_reqs) * 100).toFixed(1)
                    : "0.0";

            const dbsz = await get_db_sz();
            const dbpct =
                dbsz > 0 ? Math.min(100, Math.round((dbsz / 1024) * 100)) : 0;
            const cachit =
                _optionalChain([totmem, 'access', _5 => _5[0], 'optionalAccess', _6 => _6.count]) > 0
                    ? Math.round(
                          (totmem[0].count /
                              (totmem[0].count + total_errs * 2)) *
                              100,
                      )
                    : 0;

            res.json({
                totalMemories: _optionalChain([totmem, 'access', _7 => _7[0], 'optionalAccess', _8 => _8.count]) || 0,
                recentMemories: _optionalChain([recmem, 'access', _9 => _9[0], 'optionalAccess', _10 => _10.count]) || 0,
                sectorCounts: sectcnt.reduce((acc, row) => {
                    acc[row.primary_sector] = row.count;
                    return acc;
                }, {}),
                avgSalience: Number(_optionalChain([avgsal, 'access', _11 => _11[0], 'optionalAccess', _12 => _12.avg]) || 0).toFixed(3),
                decayStats: {
                    total: _optionalChain([decst, 'access', _13 => _13[0], 'optionalAccess', _14 => _14.total]) || 0,
                    avgLambda: Number(_optionalChain([decst, 'access', _15 => _15[0], 'optionalAccess', _16 => _16.avg_lambda]) || 0).toFixed(3),
                    minSalience: Number(_optionalChain([decst, 'access', _17 => _17[0], 'optionalAccess', _18 => _18.min_salience]) || 0).toFixed(3),
                    maxSalience: Number(_optionalChain([decst, 'access', _19 => _19[0], 'optionalAccess', _20 => _20.max_salience]) || 0).toFixed(3),
                },
                requests: {
                    total: total_reqs,
                    errors: total_errs,
                    errorRate: err_rate,
                    lastHour: qps_data.length,
                },
                qps: { peak: peak_qps, average: avg_qps, cacheHitRate: cachit },
                system: {
                    memoryUsage: dbpct,
                    heapUsed: dbsz,
                    heapTotal: 1024,
                    uptime: {
                        seconds: Math.floor(upt),
                        days: Math.floor(upt / 86400),
                        hours: Math.floor((upt % 86400) / 3600),
                    },
                },
                config: {
                    port: env.port,
                    vecDim: env.vec_dim,
                    cacheSegments: env.cache_segments,
                    maxActive: env.max_active,
                    decayInterval: env.decay_interval_minutes,
                    embedProvider: env.emb_kind,
                },
            });
        } catch (e) {
            console.error("[dash] stats err:", e);
            res.status(500).json({ err: "internal", message: e.message });
        }
    });

    app.get("/dashboard/health", async (_req, res) => {
        try {
            const memusg = process.memoryUsage();
            const upt = process.uptime();
            res.json({
                memory: {
                    heapUsed: Math.round(memusg.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(memusg.heapTotal / 1024 / 1024),
                    rss: Math.round(memusg.rss / 1024 / 1024),
                    external: Math.round(memusg.external / 1024 / 1024),
                },
                uptime: {
                    seconds: Math.floor(upt),
                    days: Math.floor(upt / 86400),
                    hours: Math.floor((upt % 86400) / 3600),
                },
                process: {
                    pid: process.pid,
                    version: process.version,
                    platform: process.platform,
                },
            });
        } catch (e) {
            res.status(500).json({ err: "internal", message: e.message });
        }
    });

    app.get("/dashboard/activity", async (req, res) => {
        try {
            const mem_table = get_mem_table();
            const lim = parseInt(req.query.limit || "50");
            const project_id = req.query.project_id;

            let where_clause = "";
            let params = [lim];

            if (project_id) {
                where_clause = is_pg
                    ? " WHERE (project_id = $2 OR project_id = 'system_global' OR project_id IS NULL)"
                    : " WHERE (project_id = ? OR project_id = 'system_global' OR project_id IS NULL)";
                params = [lim, project_id];
            }

            const recmem = await all_async(
                `SELECT id, content, primary_sector, salience, created_at, updated_at, last_seen_at
                 FROM ${mem_table}${where_clause} ORDER BY updated_at DESC LIMIT ${is_pg ? "$1" : "?"}`,
                params,
            );
            res.json({
                activities: recmem.map((m) => ({
                    id: m.id,
                    type: "memory_updated",
                    sector: m.primary_sector,
                    content: m.content.substring(0, 100) + "...",
                    salience: m.salience,
                    timestamp: m.updated_at || m.created_at,
                })),
            });
        } catch (e) {
            res.status(500).json({ err: "internal", message: e.message });
        }
    });

    app.get("/dashboard/sectors/timeline", async (req, res) => {
        try {
            const mem_table = get_mem_table();
            const hrs = parseInt(req.query.hours || "24");
            const strt = Date.now() - hrs * 60 * 60 * 1000;
            const project_id = req.query.project_id;

            let where_clause = is_pg
                ? " WHERE created_at > $1"
                : " WHERE created_at > ?";
            let params = [strt];

            if (project_id) {
                where_clause += is_pg
                    ? " AND (project_id = $2 OR project_id = 'system_global' OR project_id IS NULL)"
                    : " AND (project_id = ? OR project_id = 'system_global' OR project_id IS NULL)";
                params.push(project_id);
            }

            let displayFormat;
            let sortFormat;
            let timeKey;
            if (hrs <= 24) {
                displayFormat = is_pg
                    ? "to_char(to_timestamp(created_at/1000), 'HH24:00')"
                    : "strftime('%H:00', datetime(created_at/1000, 'unixepoch', 'localtime'))";
                sortFormat = is_pg
                    ? "to_char(to_timestamp(created_at/1000), 'YYYY-MM-DD HH24:00')"
                    : "strftime('%Y-%m-%d %H:00', datetime(created_at/1000, 'unixepoch', 'localtime'))";
                timeKey = "hour";
            } else if (hrs <= 168) {
                displayFormat = is_pg
                    ? "to_char(to_timestamp(created_at/1000), 'MM-DD')"
                    : "strftime('%m-%d', datetime(created_at/1000, 'unixepoch', 'localtime'))";
                sortFormat = is_pg
                    ? "to_char(to_timestamp(created_at/1000), 'YYYY-MM-DD')"
                    : "strftime('%Y-%m-%d', datetime(created_at/1000, 'unixepoch', 'localtime'))";
                timeKey = "day";
            } else {
                displayFormat = is_pg
                    ? "to_char(to_timestamp(created_at/1000), 'MM-DD')"
                    : "strftime('%m-%d', datetime(created_at/1000, 'unixepoch', 'localtime'))";
                sortFormat = is_pg
                    ? "to_char(to_timestamp(created_at/1000), 'YYYY-MM-DD')"
                    : "strftime('%Y-%m-%d', datetime(created_at/1000, 'unixepoch', 'localtime'))";
                timeKey = "day";
            }

            const tl = await all_async(
                `SELECT primary_sector, ${displayFormat} as label, ${sortFormat} as sort_key, COUNT(*) as count
                 FROM ${mem_table}${where_clause} GROUP BY primary_sector, ${sortFormat} ORDER BY sort_key`,
                params,
            );
            res.json({
                timeline: tl.map((row) => ({ ...row, hour: row.label })),
                grouping: timeKey,
            });
        } catch (e) {
            res.status(500).json({ err: "internal", message: e.message });
        }
    });

    app.get("/dashboard/top-memories", async (req, res) => {
        try {
            const mem_table = get_mem_table();
            const lim = parseInt(req.query.limit || "10");
            const project_id = req.query.project_id;

            let where_clause = "";
            let params = [lim];

            if (project_id) {
                where_clause = is_pg
                    ? " WHERE (project_id = $2 OR project_id = 'system_global' OR project_id IS NULL)"
                    : " WHERE (project_id = ? OR project_id = 'system_global' OR project_id IS NULL)";
                params = [lim, project_id];
            }

            const topm = await all_async(
                `SELECT id, content, primary_sector, salience, last_seen_at
                 FROM ${mem_table}${where_clause} ORDER BY salience DESC LIMIT ${is_pg ? "$1" : "?"}`,
                params,
            );
            res.json({
                memories: topm.map((m) => ({
                    id: m.id,
                    content: m.content,
                    sector: m.primary_sector,
                    salience: m.salience,
                    lastSeen: m.last_seen_at,
                })),
            });
        } catch (e) {
            res.status(500).json({ err: "internal", message: e.message });
        }
    });

    app.get("/dashboard/maintenance", async (req, res) => {
        try {
            const hrs = parseInt(req.query.hours || "24");
            const strt = Date.now() - hrs * 60 * 60 * 1000;
            const sc = process.env.OM_PG_SCHEMA || "public";

            const ops = await all_async(
                is_pg
                    ? `SELECT type, to_char(to_timestamp(ts/1000), 'HH24:00') as hour, SUM(count) as cnt
                       FROM "${sc}"."stats" WHERE ts > $1 GROUP BY type, hour ORDER BY hour`
                    : `SELECT type, strftime('%H:00', datetime(ts/1000, 'unixepoch', 'localtime')) as hour, SUM(count) as cnt
                       FROM stats WHERE ts > ? GROUP BY type, hour ORDER BY hour`,
                [strt],
            );

            const totals = await all_async(
                is_pg
                    ? `SELECT type, SUM(count) as total FROM "${sc}"."stats" WHERE type=$1 AND ts > $2 GROUP BY type`
                    : `SELECT type, SUM(count) as total FROM stats WHERE type=? AND ts > ? GROUP BY type`,
                [strt],
            );

            const by_hr = {};
            for (const op of ops) {
                if (!by_hr[op.hour])
                    by_hr[op.hour] = {
                        hour: op.hour,
                        decay: 0,
                        reflection: 0,
                        consolidation: 0,
                    };
                if (op.type === "decay") by_hr[op.hour].decay = op.cnt;
                else if (op.type === "reflect")
                    by_hr[op.hour].reflection = op.cnt;
                else if (op.type === "consolidate")
                    by_hr[op.hour].consolidation = op.cnt;
            }

            const tot_decay =
                _optionalChain([totals, 'access', _21 => _21.find, 'call', _22 => _22((t) => t.type === "decay"), 'optionalAccess', _23 => _23.total]) || 0;
            const tot_reflect =
                _optionalChain([totals, 'access', _24 => _24.find, 'call', _25 => _25((t) => t.type === "reflect"), 'optionalAccess', _26 => _26.total]) || 0;
            const tot_consol =
                _optionalChain([totals, 'access', _27 => _27.find, 'call', _28 => _28((t) => t.type === "consolidate"), 'optionalAccess', _29 => _29.total]) || 0;
            const tot_ops = tot_decay + tot_reflect + tot_consol;
            const efficiency =
                tot_ops > 0
                    ? Math.round(((tot_reflect + tot_consol) / tot_ops) * 100)
                    : 0;

            res.json({
                operations: Object.values(by_hr),
                totals: {
                    cycles: tot_decay,
                    reflections: tot_reflect,
                    consolidations: tot_consol,
                    efficiency,
                },
            });
        } catch (e) {
            res.status(500).json({ err: "internal", message: e.message });
        }
    });
}

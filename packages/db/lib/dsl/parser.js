 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// sierra-estates/lib/dsl/parser.ts
// Sierra Estates DSL V2.0 — Full Parser + Supabase Query Builder
//
// Usage:
//   import { parseDSL, buildSupabaseQuery } from "@sierra-estates/db";
//   const view = parseDSL(dsl, "listings");
//   const rows = await buildSupabaseQuery(view);

import { listRecords, } from "../records";

/**
 * The comparison operators the DSL accepts. This was Firestore's
 * `WhereFilterOp`; the set is narrowed to what the DSL actually emits and
 * what PostgREST can express, so the parser no longer depends on the
 * Firebase SDK for a type.
 */
 


































































// ════════════════════════════════════════════════════════════════
// LEXER — splits DSL into clean directive lines
// ════════════════════════════════════════════════════════════════

function lex(dsl) {
  return dsl
    .split(/\n|;/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("#") && !l.startsWith("//"));
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function extractQuoted(str) {
  return _nullishCoalesce(_optionalChain([str, 'access', _ => _.match, 'call', _2 => _2(/"([^"]+)"/g), 'optionalAccess', _3 => _3.map, 'call', _4 => _4(s => s.replace(/"/g, ""))]), () => ( []));
}

function coerce(raw) {
  const t = raw.trim().replace(/^"|"$/g, "");
  if (t === "null" || t === "")    return null;
  if (t === "true")                return true;
  if (t === "false")               return false;
  const n = Number(t.replace(/[^0-9.\-]/g, ""));
  if (!isNaN(n) && t.match(/^[\d.,\-]+$/)) return n;
  return t;
}

// ════════════════════════════════════════════════════════════════
// FILTER PARSER
// ════════════════════════════════════════════════════════════════

function parseFilterLine(line) {

  // BETWEEN: FILTER "Price" BETWEEN 500000 AND 2000000 [EGP]
  const between = line.match(/FILTER\s+"(.+?)"\s+BETWEEN\s+([\d,]+)\s+AND\s+([\d,]+)/i);
  if (between) {
    return {
      field: between[1],
      operator: "BETWEEN",
      value:  parseFloat(between[2].replace(/,/g, "")),
      value2: parseFloat(between[3].replace(/,/g, "")),
    };
  }

  // IN: FILTER "Status" IN ("a", "b", "c")
  const inOp = line.match(/FILTER\s+"(.+?)"\s+IN\s+\((.+?)\)/i);
  if (inOp) {
    return {
      field: inOp[1],
      operator: "in",
      value: extractQuoted(inOp[2]),
    };
  }

  // IS NOT EMPTY
  const notEmpty = line.match(/FILTER\s+"(.+?)"\s+IS\s+NOT\s+EMPTY/i);
  if (notEmpty) return { field: notEmpty[1], operator: "!=", value: null };

  // IS EMPTY
  const isEmpty = line.match(/FILTER\s+"(.+?)"\s+IS\s+EMPTY/i);
  if (isEmpty) return { field: isEmpty[1], operator: "==", value: null };

  // STARTS WITH
  const startsWith = line.match(/FILTER\s+"(.+?)"\s+STARTS\s+WITH\s+"(.+?)"/i);
  if (startsWith) {
    return { field: startsWith[1], operator: ">=", value: startsWith[2] };
  }

  // CONTAINS
  const contains = line.match(/FILTER\s+"(.+?)"\s+CONTAINS\s+"(.+?)"/i);
  if (contains) {
    return { field: contains[1], operator: ">=", value: contains[2] };
  }

  // PERCENT: FILTER "Field" >= 85 PERCENT
  const pct = line.match(/FILTER\s+"(.+?)"\s+(>=|<=|>|<|=|!=)\s+([\d.]+)\s+PERCENT/i);
  if (pct) {
    const op = pct[2] === "=" ? "==" : pct[2];
    return { field: pct[1], operator: op , value: parseFloat(pct[3]) };
  }

  // Standard: FILTER "Field" op "value" | number
  const std = line.match(/FILTER\s+"(.+?)"\s+(>=|<=|>|<|!=|=)\s+("?[^";\n]+"?)/i);
  if (std) {
    const op = std[2] === "=" ? "==" : std[2];
    return { field: std[1], operator: op , value: coerce(std[3]) };
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
// MAIN PARSER
// ════════════════════════════════════════════════════════════════

export function parseDSL(dsl, collectionName = "listings") {
  const lines = lex(dsl);

  const result = {
    collectionName,
    visibility:    "public",
    showFields:    [],
    showFieldsMap: {},
    hideFields:    [],
    filters:       [],
    sortBy:        [],
    compounds:     [],
    compareFields: [],
    aiTags:        [],
    wrapCells:     true,
    freezeColumns: 0,
    rawLines:      lines,
  };

  for (const line of lines) {
    const U = line.toUpperCase();

    // ── VISIBILITY ──────────────────────────────────────────────
    if (U.startsWith("VISIBILITY")) {
      result.visibility = (_nullishCoalesce(_optionalChain([line, 'access', _5 => _5.split, 'call', _6 => _6(/\s+/), 'access', _7 => _7[1], 'optionalAccess', _8 => _8.toLowerCase, 'call', _9 => _9()]), () => ( "public"))) ;
    }

    // ── SHOW "SBR_Code" AS PRIMARY_ID ───────────────────────────
    else if (U.startsWith("SHOW") && U.includes("AS PRIMARY_ID")) {
      const f = extractQuoted(line)[0];
      if (f) result.primaryIdField = f;
    }

    // ── SHOW ─────────────────────────────────────────────────────
    else if (U.startsWith("SHOW")) {
      const fields = extractQuoted(line.replace(/^SHOW\s+/i, ""));
      result.showFields = fields;
      for (const f of fields) result.showFieldsMap[f] = true;
    }

    // ── HIDE ─────────────────────────────────────────────────────
    else if (U.startsWith("HIDE")) {
      result.hideFields = extractQuoted(line);
    }

    // ── FILTER ──────────────────────────────────────────────────
    else if (U.startsWith("FILTER")) {
      const f = parseFilterLine(line);
      if (f) result.filters.push(f);
    }

    // ── SORT BY ─────────────────────────────────────────────────
    else if (U.startsWith("SORT BY")) {
      const parts = line.replace(/^SORT BY\s+/i, "").split(",");
      for (const p of parts) {
        const m = p.trim().match(/"(.+?)"\s*(ASC|DESC)?/i);
        if (m) {
          result.sortBy.push({
            field:     m[1],
            direction: (_nullishCoalesce(_optionalChain([m, 'access', _10 => _10[2], 'optionalAccess', _11 => _11.toLowerCase, 'call', _12 => _12()]), () => ( "asc"))) ,
          });
        }
      }
    }

    // ── GROUP BY ────────────────────────────────────────────────
    else if (U.startsWith("GROUP BY")) {
      result.groupBy = extractQuoted(line)[0];
    }

    // ── COMPOUND IN ─────────────────────────────────────────────
    else if (U.startsWith("COMPOUND IN")) {
      result.compounds = extractQuoted(line.replace(/^COMPOUND IN\s*/i, ""));
    }

    // ── COMPARE ─────────────────────────────────────────────────
    else if (U.startsWith("COMPARE")) {
      const m = line.match(/COMPARE\s+"(.+?)"\s+AGAINST\s+"(.+?)"/i);
      if (m) result.compareFields.push({ field: m[1], against: m[2] });
    }

    // ── AI TAGS ─────────────────────────────────────────────────
    else if (U.startsWith("AI TAGS")) {
      result.aiTags = extractQuoted(line.replace(/^AI TAGS\s*/i, ""));
    }

    // ── WRAP CELLS ───────────────────────────────────────────────
    else if (U.startsWith("WRAP CELLS")) {
      result.wrapCells = U.includes("TRUE");
    }

    // ── FREEZE COLUMNS ───────────────────────────────────────────
    else if (U.startsWith("FREEZE COLUMNS")) {
      result.freezeColumns = parseInt(_nullishCoalesce(line.split(/\s+/).pop(), () => ( "0"))) || 0;
    }

    // ── COVER ────────────────────────────────────────────────────
    else if (U.startsWith("COVER")) {
      const m = line.match(/COVER\s+"(.+?)"(?:\s+SIZE\s+(\w+))?(?:\s+ASPECT\s+(\w+))?/i);
      if (m) {
        result.cover = {
          field:  m[1],
          size:   m[2] ,
          aspect: m[3] ,
        };
      }
    }

    // ── CHART ────────────────────────────────────────────────────
    else if (U.startsWith("CHART")) {
      const typeM  = line.match(/CHART\s+(\w+)/i);
      const aggM   = line.match(/AGGREGATE\s+(\w+)(?:\s+ON\s+"(.+?)")?/i);
      const colorM = line.match(/COLOR\s+(\w+)/i);
      const hgtM   = line.match(/HEIGHT\s+(\w+)/i);
      const stackM = line.match(/STACK BY\s+"(.+?)"/i);
      const capM   = line.match(/CAPTION\s+"(.+?)"/i);
      if (typeM) {
        result.chart = {
          type:      typeM[1].toLowerCase() ,
          aggregate: _optionalChain([aggM, 'optionalAccess', _13 => _13[1], 'optionalAccess', _14 => _14.toLowerCase, 'call', _15 => _15()]) ,
          on:        _optionalChain([aggM, 'optionalAccess', _16 => _16[2]]),
          color:     _optionalChain([colorM, 'optionalAccess', _17 => _17[1]]),
          height:    _optionalChain([hgtM, 'optionalAccess', _18 => _18[1]]) ,
          stackBy:   _optionalChain([stackM, 'optionalAccess', _19 => _19[1]]),
          caption:   _optionalChain([capM, 'optionalAccess', _20 => _20[1]]),
        };
      }
    }
  }

  return result;
}

// ════════════════════════════════════════════════════════════════
// SUPABASE QUERY BUILDER
// ════════════════════════════════════════════════════════════════

/** Map a DSL operator onto the record layer's clause vocabulary. */
function toRecordOp(op) {
  switch (op) {
    case "!=": return "neq";
    case "<":  return "lt";
    case "<=": return "lte";
    case ">":  return "gt";
    case ">=": return "gte";
    case "in": return "in";
    case "==":
    default:   return "eq";
  }
}

/**
 * Translate a parsed view into record-layer where clauses.
 *
 * Exported separately from the fetch so callers can inspect or extend the
 * clauses, and so this stays testable without a database.
 */
export function buildQueryClauses(parsed) {
  const clauses = [];

  // ── Filters ──────────────────────────────────────────────────
  for (const f of parsed.filters) {
    if (f.operator === "BETWEEN" && f.value2 !== undefined) {
      clauses.push({ column: f.field, op: "gte", value: f.value });
      clauses.push({ column: f.field, op: "lte", value: f.value2 });
    } else if (f.operator === "IN" || f.operator === "in") {
      clauses.push({
        column: f.field,
        op: "in",
        value: Array.isArray(f.value) ? f.value : [f.value],
      });
    } else if (f.operator !== "BETWEEN") {
      clauses.push({ column: f.field, op: toRecordOp(f.operator ), value: f.value });
    }
  }

  // ── Compound scope ───────────────────────────────────────────
  // Firestore allowed only one array-membership filter per query, so
  // COMPOUND IN (...) alongside another IN filter used to throw. Postgres has
  // no such restriction, and both clauses are simply ANDed.
  if (parsed.compounds.length === 1) {
    clauses.push({ column: "Compound", op: "eq", value: parsed.compounds[0] });
  } else if (parsed.compounds.length > 1) {
    clauses.push({ column: "Compound", op: "in", value: parsed.compounds });
  }

  return clauses;
}

/**
 * Run a parsed view against its table.
 *
 * Firestore required any field used in an inequality to be the first orderBy
 * field; Postgres does not, so the sort is applied as authored. Only the first
 * sort key is passed down — the record layer takes a single orderBy, which is
 * all any existing view config uses.
 */
export async function buildSupabaseQuery(
  parsed,
  maxLimit = 50,
) {
  const primarySort = parsed.sortBy[0];

  return listRecords(parsed.collectionName, {
    where: buildQueryClauses(parsed),
    ...(primarySort
      ? { orderBy: { column: primarySort.field, ascending: primarySort.direction === "asc" } }
      : {}),
    limit: maxLimit,
  });
}

// ════════════════════════════════════════════════════════════════
// CLIENT-SIDE HELPERS (for fields the database query cannot handle)
// ════════════════════════════════════════════════════════════════

/** Filter displayed fields to only those in SHOW, minus HIDE */
export function applyFieldVisibility(
  doc,
  parsed,
) {
  if (parsed.showFields.length === 0 && parsed.hideFields.length === 0) return doc;

  const result = {};

  const fields = parsed.showFields.length > 0
    ? parsed.showFields
    : Object.keys(doc);

  for (const f of fields) {
    if (!parsed.hideFields.includes(f)) {
      result[f ] = doc[f ];
    }
  }

  return result;
}

/** Client-side groupBy — returns a Map of groupValue → docs */
export function groupDocuments(
  docs,
  groupBy,
) {
  const map = new Map();
  for (const doc of docs) {
    const key = String(_nullishCoalesce(doc[groupBy], () => ( "Uncategorized")));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(doc);
  }
  return map;
}

/** Returns delta % between a field value and a benchmark value */
export function computeComparisonDelta(
  fieldValue,
  benchmarkValue,
) {
  if (!benchmarkValue) return { delta: 0, label: "N/A", direction: "neutral" };
  const delta = ((fieldValue - benchmarkValue) / benchmarkValue) * 100;
  const abs   = Math.abs(delta).toFixed(1);
  return {
    delta,
    label:     delta > 0 ? `+${abs}%` : `${abs}%`,
    direction: delta > 0.5 ? "up" : delta < -0.5 ? "down" : "neutral",
  };
}

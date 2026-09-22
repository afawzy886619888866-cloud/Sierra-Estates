// sierra-estates/lib/dsl/parser.ts
// Sierra Estates DSL V2.0 — Full Parser + Supabase Query Builder
//
// Usage:
//   import { parseDSL, buildSupabaseQuery } from "@sierra-estates/db";
//   const view = parseDSL(dsl, "listings");
//   const rows = await buildSupabaseQuery(view);

import { listRecords, type WhereClause } from "../records";

/**
 * The comparison operators the DSL accepts. This was Firestore's
 * `WhereFilterOp`; the set is narrowed to what the DSL actually emits and
 * what PostgREST can express, so the parser no longer depends on the
 * Firebase SDK for a type.
 */
export type DslFilterOp =
  | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in";

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

export type Visibility   = "public" | "broker" | "investor" | "internal";
export type AgentName    = "Scribe" | "Curator" | "Matchmaker" | "Closer";
export type ChartType    = "column" | "bar" | "line" | "donut" | "number";
export type CoverSize    = "small" | "medium" | "large";
export type CoverAspect  = "cover" | "contain";
export type SortDir      = "asc" | "desc";

export interface FilterClause {
  field: string;
  operator: DslFilterOp | "BETWEEN" | "IN";
  value: unknown;
  value2?: unknown; // BETWEEN upper bound
}

export interface SortClause {
  field: string;
  direction: SortDir;
}

export interface CompareClause {
  field: string;
  against: string;
}

export interface ChartConfig {
  type: ChartType;
  aggregate?: "count" | "sum" | "average" | "min" | "max";
  on?: string;
  color?: string;
  height?: "small" | "medium" | "large" | "extra_large";
  stackBy?: string;
  caption?: string;
}

export interface CoverConfig {
  field: string;
  size?: CoverSize;
  aspect?: CoverAspect;
}

export interface ParsedView {
  collectionName: string;
  visibility: Visibility;
  showFields: string[];
  showFieldsMap: Record<string, string | true>; // field → alias or true
  hideFields: string[];
  filters: FilterClause[];
  sortBy: SortClause[];
  groupBy?: string;
  compounds: string[];
  compareFields: CompareClause[];
  aiTags: string[];
  chart?: ChartConfig;
  cover?: CoverConfig;
  wrapCells: boolean;
  freezeColumns: number;
  primaryIdField?: string; // field marked AS PRIMARY_ID
  rawLines: string[];
}

// ════════════════════════════════════════════════════════════════
// LEXER — splits DSL into clean directive lines
// ════════════════════════════════════════════════════════════════

function lex(dsl: string): string[] {
  return dsl
    .split(/\n|;/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("#") && !l.startsWith("//"));
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function extractQuoted(str: string): string[] {
  return str.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, "")) ?? [];
}

function coerce(raw: string): string | number | boolean | null {
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

function parseFilterLine(line: string): FilterClause | null {

  // BETWEEN: FILTER "Price" BETWEEN 500000 AND 2000000 [EGP]
  const between = line.match(/FILTER\s+"([^"]+)"\s+BETWEEN\s+([\d,]+)\s+AND\s+([\d,]+)/i);
  if (between) {
    return {
      field: between[1],
      operator: "BETWEEN",
      value:  parseFloat(between[2].replace(/,/g, "")),
      value2: parseFloat(between[3].replace(/,/g, "")),
    };
  }

  // IN: FILTER "Status" IN ("a", "b", "c")
  const inOp = line.match(/FILTER\s+"([^"]+)"\s+IN\s*\(([^)]+)\)/i);
  if (inOp) {
    return {
      field: inOp[1],
      operator: "in",
      value: extractQuoted(inOp[2]),
    };
  }

  // IS NOT EMPTY
  const notEmpty = line.match(/FILTER\s+"([^"]+)"\s+IS\s+NOT\s+EMPTY/i);
  if (notEmpty) return { field: notEmpty[1], operator: "!=", value: null };

  // IS EMPTY
  const isEmpty = line.match(/FILTER\s+"([^"]+)"\s+IS\s+EMPTY/i);
  if (isEmpty) return { field: isEmpty[1], operator: "==", value: null };

  // STARTS WITH
  const startsWith = line.match(/FILTER\s+"([^"]+)"\s+STARTS\s+WITH\s+"([^"]+)"/i);
  if (startsWith) {
    return { field: startsWith[1], operator: ">=", value: startsWith[2] };
  }

  // CONTAINS
  const contains = line.match(/FILTER\s+"([^"]+)"\s+CONTAINS\s+"([^"]+)"/i);
  if (contains) {
    return { field: contains[1], operator: ">=", value: contains[2] };
  }

  // PERCENT: FILTER "Field" >= 85 PERCENT
  const pct = line.match(/FILTER\s+"([^"]+)"\s+(>=|<=|>|<|=|!=)\s+([\d.]+)\s+PERCENT/i);
  if (pct) {
    const op = pct[2] === "=" ? "==" : pct[2];
    return { field: pct[1], operator: op as DslFilterOp, value: parseFloat(pct[3]) };
  }

  // Standard: FILTER "Field" op "value" | number
  const std = line.match(/FILTER\s+"([^"]+)"\s+(>=|<=|>|<|!=|=)\s+("?[^";\n]+"?)/i);
  if (std) {
    const op = std[2] === "=" ? "==" : std[2];
    return { field: std[1], operator: op as DslFilterOp, value: coerce(std[3]) };
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
// MAIN PARSER
// ════════════════════════════════════════════════════════════════

export function parseDSL(dsl: string, collectionName = "listings"): ParsedView {
  const lines = lex(dsl);

  const result: ParsedView = {
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
      result.visibility = (line.split(/\s+/)[1]?.toLowerCase() ?? "public") as Visibility;
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
            direction: (m[2]?.toLowerCase() ?? "asc") as SortDir,
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
      const m = line.match(/COMPARE\s+"([^"]+)"\s+AGAINST\s+"([^"]+)"/i);
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
      result.freezeColumns = parseInt(line.split(/\s+/).pop() ?? "0") || 0;
    }

    // ── COVER ────────────────────────────────────────────────────
    else if (U.startsWith("COVER")) {
      const m = line.match(/COVER\s+"(.+?)"(?:\s+SIZE\s+(\w+))?(?:\s+ASPECT\s+(\w+))?/i);
      if (m) {
        result.cover = {
          field:  m[1],
          size:   m[2] as CoverSize | undefined,
          aspect: m[3] as CoverAspect | undefined,
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
          type:      typeM[1].toLowerCase() as ChartType,
          aggregate: aggM?.[1]?.toLowerCase() as ChartConfig["aggregate"],
          on:        aggM?.[2],
          color:     colorM?.[1],
          height:    hgtM?.[1] as ChartConfig["height"],
          stackBy:   stackM?.[1],
          caption:   capM?.[1],
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
function toRecordOp(op: DslFilterOp): WhereClause["op"] {
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
export function buildQueryClauses(parsed: ParsedView): WhereClause[] {
  const clauses: WhereClause[] = [];

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
      clauses.push({ column: f.field, op: toRecordOp(f.operator as DslFilterOp), value: f.value });
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
export async function buildSupabaseQuery<T = Record<string, unknown>>(
  parsed: ParsedView,
  maxLimit = 50,
): Promise<T[]> {
  const primarySort = parsed.sortBy[0];

  return listRecords<T>(parsed.collectionName, {
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
export function applyFieldVisibility<T extends Record<string, unknown>>(
  doc: T,
  parsed: ParsedView,
): Partial<T> {
  if (parsed.showFields.length === 0 && parsed.hideFields.length === 0) return doc;

  const result: Partial<T> = {};

  const fields = parsed.showFields.length > 0
    ? parsed.showFields
    : Object.keys(doc);

  for (const f of fields) {
    if (!parsed.hideFields.includes(f)) {
      result[f as keyof T] = doc[f as keyof T];
    }
  }

  return result;
}

/** Client-side groupBy — returns a Map of groupValue → docs */
export function groupDocuments<T extends Record<string, unknown>>(
  docs: T[],
  groupBy: string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const doc of docs) {
    const key = String(doc[groupBy] ?? "Uncategorized");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(doc);
  }
  return map;
}

/** Returns delta % between a field value and a benchmark value */
export function computeComparisonDelta(
  fieldValue: number,
  benchmarkValue: number,
): { delta: number; label: string; direction: "up" | "down" | "neutral" } {
  if (!benchmarkValue) return { delta: 0, label: "N/A", direction: "neutral" };
  const delta = ((fieldValue - benchmarkValue) / benchmarkValue) * 100;
  const abs   = Math.abs(delta).toFixed(1);
  return {
    delta,
    label:     delta > 0 ? `+${abs}%` : `${abs}%`,
    direction: delta > 0.5 ? "up" : delta < -0.5 ? "down" : "neutral",
  };
}

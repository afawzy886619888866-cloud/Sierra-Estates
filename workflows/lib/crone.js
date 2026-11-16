'use strict';
/**
 * crone.js — 5-field cron matcher for the EC2 workflow runner.
 * ─────────────────────────────────────────────────────────────
 * Upgraded 2026-10 from the minute/hour-only matcher to FULL 5-field
 * support, so any standard cron expression typed in the admin Workflow
 * Studio behaves exactly as the admin expects:
 *
 *   minute  0-59      * , - / numbers
 *   hour    0-23      * , - / numbers
 *   dom     1-31      * , - / numbers          (was: ignored)
 *   month   1-12      * , - / numbers JAN-DEC  (was: ignored)
 *   dow     0-7       * , - / numbers SUN-SAT  (was: ignored; 7 == 0 == Sunday)
 *
 * POSIX dom/dow OR-semantics is implemented: when BOTH dom and dow are
 * restricted (neither is '*') the job runs if EITHER field matches.
 *
 * All matching happens in the runner process' LOCAL time (systemd unit pins
 * TZ=Africa/Cairo so "0 10 * * 1" means Monday 10:00 Cairo, as admins expect).
 *
 * Same-field quirks kept for backward compatibility with previously stored
 * schedules: "10/5" in a field means start..max with step 5.
 */

const MONTH_NAMES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const DOW_NAMES = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function tokenToNumber(token, names) {
  const t = String(token || '').trim().toLowerCase();
  if (t in names) return names[t];
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

/** Match one cron field against `value`, given the field's min/max and name map. */
function matchField(expr, value, { min = 0, max = 59, names = {} } = {}) {
  const e = String(expr ?? '').trim();
  if (e === '' ) return false;
  return e.split(',').some((rawPart) => {
    let part = rawPart.trim().toLowerCase();
    if (part === '') return false;
    let step = 1;
    const slash = part.indexOf('/');
    if (slash !== -1) {
      step = parseInt(part.slice(slash + 1), 10) || 1;
      part = part.slice(0, slash).trim();
      if (step < 1) return false;
    }
    let lo = min;
    let hi = max;
    if (part !== '*' && part !== '') {
      const dash = part.indexOf('-');
      if (dash !== -1) {
        lo = tokenToNumber(part.slice(0, dash), names);
        hi = tokenToNumber(part.slice(dash + 1), names);
      } else {
        lo = tokenToNumber(part, names);
        if (lo === null) return false;
        // plain number with a step (e.g. "10/5") behaves as start..max
        hi = slash !== -1 ? max : lo;
      }
    } else if (slash === -1 && part === '') {
      return false;
    }
    if (lo === null || hi === null || Number.isNaN(lo) || Number.isNaN(hi)) return false;
    if (lo > hi) return false; // no wrap-around support (documented)
    for (let v = lo; v <= hi; v += step) {
      let candidate = v;
      // dow field: allow 7 as Sunday alias
      if (max === 7 && candidate === 7) candidate = 0;
      if (candidate === value) return true;
      if (step === 1 && v > value) break;
    }
    return false;
  });
}

/** Is `date` (a JS Date) due for this 5-field cron expression? */
function isDue(expr, date = new Date()) {
  const f = String(expr || '').trim().split(/\s+/);
  if (f.length !== 5) return false;

  const minuteOK = matchField(f[0], date.getMinutes(), { min: 0, max: 59 });
  if (!minuteOK) return false;

  const hourOK = matchField(f[1], date.getHours(), { min: 0, max: 23 });
  if (!hourOK) return false;

  const monthOK = matchField(f[3], date.getMonth() + 1, { min: 1, max: 12, names: MONTH_NAMES });
  if (!monthOK) return false;

  const domAny = String(f[2]).trim() === '*';
  const dowAny = String(f[4]).trim() === '*';
  if (domAny && dowAny) return true;

  const domOK = matchField(f[2], date.getDate(), { min: 1, max: 31 });
  const dowOK = matchField(f[4], date.getDay(), { min: 0, max: 7, names: DOW_NAMES });

  // POSIX: both restricted → EITHER may fire
  return domAny ? dowOK : dowAny ? domOK : (domOK || dowOK);
}

module.exports = { isDue, matchField };

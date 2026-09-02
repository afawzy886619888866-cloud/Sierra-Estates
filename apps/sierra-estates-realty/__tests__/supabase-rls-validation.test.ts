/**
 * Supabase RLS — Structural Validation Tests
 *
 * Validates supabase/schema.sql, the file the migration script tells operators
 * to run. Every table's authenticated policy used to read
 * `FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)`. Sign-ups land as
 * role 'client', so on a self-serve Supabase Auth project that gave any
 * customer who registered full read/write over leads, deals, viewings and the
 * whole listings catalogue.
 *
 * Like the Firestore equivalent, this does not run Postgres — it guards the
 * policy text against regression.
 */
import * as fs from 'fs';
import * as path from 'path';

const SCHEMA_PATH = path.resolve(__dirname, '../../../supabase/schema.sql');
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

/** Tables holding customer PII, commercial terms, or operational control. */
const STAFF_ONLY_TABLES = [
  'leads',
  'deals',
  'proposals',
  'viewing_appointments',
  'whatsapp_queue',
  'unified_memory',
  'agent_executions',
];

describe('Supabase RLS — role helpers', () => {
  it('defines is_admin() over profiles.role', () => {
    expect(schema).toMatch(/CREATE OR REPLACE FUNCTION public\.is_admin\(\)/);
    expect(schema).toMatch(/role IN \('superadmin', 'admin'\)/);
  });

  it('defines is_staff() covering the staff roles', () => {
    expect(schema).toMatch(/CREATE OR REPLACE FUNCTION public\.is_staff\(\)/);
    expect(schema).toMatch(/role IN \('superadmin', 'admin', 'agent', 'broker'\)/);
  });

  it('marks both helpers SECURITY DEFINER with a pinned search_path', () => {
    // SECURITY DEFINER is required to read the RLS-protected profiles table
    // without recursing; the pinned search_path stops a caller redirecting it.
    const definers = schema.match(/SECURITY DEFINER/g) ?? [];
    expect(definers.length).toBeGreaterThanOrEqual(2);

    const pinned = schema.match(/SET search_path = public, pg_temp/g) ?? [];
    expect(pinned.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Supabase RLS — no blanket authenticated access', () => {
  it('grants USING (TRUE) to service_role only, never to authenticated', () => {
    const blanket = schema.match(/FOR ALL TO authenticated USING \(TRUE\)/g) ?? [];
    expect(blanket).toEqual([]);
  });

  it.each(STAFF_ONLY_TABLES)('gates public.%s behind is_staff()', (table) => {
    const policy = new RegExp(
      `ON public\\.${table}\\s+FOR ALL TO authenticated USING \\(public\\.is_staff\\(\\)\\) WITH CHECK \\(public\\.is_staff\\(\\)\\)`
    );
    expect(schema).toMatch(policy);
  });
});

describe('Supabase RLS — listings', () => {
  it('keeps active inventory publicly readable', () => {
    expect(schema).toMatch(/FOR SELECT USING \(status = 'active' OR public\.is_staff\(\)\)/);
  });

  it('restricts writes to staff', () => {
    expect(schema).toMatch(
      /"listings_staff_write" ON public\.listings\s+FOR ALL TO authenticated USING \(public\.is_staff\(\)\)/
    );
  });

  it('drops the old permissive policy by name so a re-run replaces it', () => {
    expect(schema).toMatch(/DROP POLICY IF EXISTS "Authenticated users can manage listings"/);
  });
});

describe('Supabase RLS — profiles', () => {
  it('has policies at all (RLS was enabled with none, denying every read)', () => {
    expect(schema).toMatch(/"profiles_self_read" ON public\.profiles/);
  });

  it('lets a user update their own profile but never their own role', () => {
    // role is the privilege boundary: the WITH CHECK pins it to the stored
    // value, so a self-update cannot escalate.
    expect(schema).toMatch(
      /WITH CHECK \(\s*id = auth\.uid\(\)\s*AND role = \(SELECT p\.role FROM public\.profiles p WHERE p\.id = auth\.uid\(\)\)/
    );
  });

  it('reserves role changes for admins', () => {
    expect(schema).toMatch(
      /"profiles_admin_manage" ON public\.profiles\s+FOR ALL TO authenticated USING \(public\.is_admin\(\)\)/
    );
  });
});

 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
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
  // Added by the Firebase -> Supabase migration.
  'owners',
  'followups',
  'knowledge_base',
  'agents_registry',
  'bot_commands',
  'workflows',
];

/** Public forms may INSERT but must never SELECT their own submissions back. */
const PUBLIC_INSERT_TABLES = ['viewing_requests', 'inquiries', 'career_applications'];

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
    const definers = _nullishCoalesce(schema.match(/SECURITY DEFINER/g), () => ( []));
    expect(definers.length).toBeGreaterThanOrEqual(2);

    const pinned = _nullishCoalesce(schema.match(/SET search_path = public, pg_temp/g), () => ( []));
    expect(pinned.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Supabase RLS — no blanket authenticated access', () => {
  it('grants USING (TRUE) to service_role only, never to authenticated', () => {
    const blanket = _nullishCoalesce(schema.match(/FOR ALL TO authenticated USING \(TRUE\)/g), () => ( []));
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

describe('Supabase RLS — migrated tables', () => {
  it.each(PUBLIC_INSERT_TABLES)(
    'restricts public.%s to staff access with public inserts handled via service role API routes',
    (table) => {
      // Unconstrained anon INSERT with WITH CHECK (TRUE) was removed to prevent spam/injection.
      // Server API routes write via service_role, while client access is restricted to staff.
      expect(schema).toMatch(
        new RegExp(`ON public\\.${table}\\s+FOR ALL TO authenticated USING \\(public\\.is_staff\\(\\)\\)`)
      );
    }
  );

  it('restricts contracts to admins, not all staff — they hold buyer national IDs', () => {
    expect(schema).toMatch(
      /"contracts_admin_access" ON public\.contracts\s+FOR ALL TO authenticated USING \(public\.is_admin\(\)\)/
    );
  });

  it('makes audit_logs admin-read-only, with no client insert path', () => {
    expect(schema).toMatch(
      /"audit_logs_admin_read" ON public\.audit_logs\s+FOR SELECT TO authenticated USING \(public\.is_admin\(\)\)/
    );
    expect(schema).not.toMatch(/ON public\.audit_logs\s+FOR (INSERT|ALL) TO (anon|authenticated)/);
  });

  it('keeps published CMS pages public but drafts staff-only', () => {
    expect(schema).toMatch(/FOR SELECT TO anon, authenticated USING \(published = TRUE OR public\.is_staff\(\)\)/);
  });
});

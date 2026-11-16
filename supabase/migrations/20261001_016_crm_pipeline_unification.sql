-- ═══════════════════════════════════════════════════════════════════════════
-- 20261001_016_crm_pipeline_unification.sql — Phase 10 (CRM PIPELINE)
--
-- One status vocabulary, audited transitions:
--
--   Problem: 4 overlapping vocabularies describe the same lead journey —
--     · leads.pipeline_stage (canonical 10-stage enum used by the SPA board)
--     · leads.status        (legacy CHECK: new/contacted/qualified/… + the
--                            odd 'Viewing Requested' free-form value)
--     · leads.orchestration_state->stage  (Firestore-era S1..S10 machine)
--     · viewings.status     (pending_approval → scheduled → … lifecycle)
--
--   Decision (roadmap): pipeline_stage IS the canonical CRM vocabulary.
--   leads.status becomes a DERIVED, coarse projection of it, kept in sync by
--   a BEFORE UPDATE trigger; every stage/status change writes a transition
--   record into orchestration_history (existing table, reused per roadmap —
--   no new audit table).
--
-- NON-DESTRUCTIVE:
--   * 'Viewing Requested' rows are NORMALIZED to 'viewing_scheduled' (same
--     semantic, canonical spelling) BEFORE the CHECK is swapped;
--   * the CHECK swap is DROP + ADD (no data touched);
--   * triggers are DROP IF EXISTS + CREATE (idempotent re-run safe);
--   * no columns added, no tables dropped.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Pure mapping: pipeline_stage → coarse leads.status projection. ──────
CREATE OR REPLACE FUNCTION public.lead_status_for_stage(p_stage TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_stage
        WHEN 'inbound'   THEN 'new'
        WHEN 'qualify'   THEN 'qualified'
        WHEN 'engage'    THEN 'contacted'
        WHEN 'proposal'  THEN 'contacted'
        WHEN 'viewing'   THEN 'viewing_scheduled'
        WHEN 'negotiate' THEN 'negotiating'
        WHEN 'reserve'   THEN 'negotiating'
        WHEN 'contract'  THEN 'negotiating'
        WHEN 'handover'  THEN 'negotiating'
        WHEN 'closed-won' THEN 'won'
        ELSE 'new'
    END;
$$;

-- ── 2. BEFORE UPDATE: keep leads.status derived from pipeline_stage. ─────────
--    Only fires when the stage ACTUALLY changes; manual status-only edits
--    (e.g. marking a lead 'lost' / 'nurture') survive until the next stage
--    change, at which point the projection wins by design.
CREATE OR REPLACE FUNCTION public.sync_lead_status_from_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
        NEW.status := public.lead_status_for_stage(NEW.pipeline_stage);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_leads_status_sync ON public.leads;
CREATE TRIGGER trigger_leads_status_sync
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_lead_status_from_stage();

-- ── 3. Normalize the one non-canonical status value, THEN swap the CHECK. ──
UPDATE public.leads
   SET status = 'viewing_scheduled'
 WHERE status = 'Viewing Requested';

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
    CHECK (status IN (
        'new', 'contacted', 'qualified', 'viewing_scheduled',
        'negotiating', 'won', 'lost', 'nurture'
    ));

-- ── 4. AFTER UPDATE: transition audit into orchestration_history. ──────────
--    Reused table per roadmap ("orchestration_history + audit_logs already
--    exist — reuse"). SECURITY DEFINER so authenticated staff writes (whose
--    role has only read on orchestration_history) can still record the
--    transition; service-role bypasses RLS anyway.
CREATE OR REPLACE FUNCTION public.audit_lead_stage_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage
       OR NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.orchestration_history (
            parent_table, parent_id, stage, status, engine_version, details
        ) VALUES (
            'leads',
            NEW.id,
            COALESCE(NEW.pipeline_stage, NEW.status, 'unknown'),
            'transition',
            'phase10-crm-unification',
            jsonb_build_object(
                'from', jsonb_build_object('stage', OLD.pipeline_stage, 'status', OLD.status),
                'to',   jsonb_build_object('stage', NEW.pipeline_stage, 'status', NEW.status),
                'at',   to_jsonb(NOW())
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_leads_stage_audit ON public.leads;
CREATE TRIGGER trigger_leads_stage_audit
    AFTER UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_lead_stage_transition();

COMMENT ON FUNCTION public.lead_status_for_stage(TEXT) IS
    'Phase 10: canonical mapping pipeline_stage → coarse leads.status projection (leads.status is derived).';

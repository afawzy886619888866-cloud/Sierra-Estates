ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS external_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS leads_external_message_id_unique
    ON public.leads (external_message_id)
    WHERE external_message_id IS NOT NULL;

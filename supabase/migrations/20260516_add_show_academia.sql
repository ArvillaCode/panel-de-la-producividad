-- Migration: add show_academia to system_config
ALTER TABLE public.system_config
ADD COLUMN IF NOT EXISTS show_academia BOOLEAN DEFAULT TRUE;

-- Ensure existing row has value
UPDATE public.system_config SET show_academia = TRUE WHERE id = 1;

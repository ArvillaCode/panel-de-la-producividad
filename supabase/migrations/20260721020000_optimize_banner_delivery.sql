BEGIN;

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS display_version BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

UPDATE public.banners
SET activated_at = COALESCE(activated_at, created_at, now())
WHERE activated_at IS NULL;

ALTER TABLE public.banners
  ALTER COLUMN activated_at SET DEFAULT now(),
  ALTER COLUMN activated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.bump_banner_display_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (OLD.is_active = FALSE AND NEW.is_active = TRUE)
     OR OLD.image_url IS DISTINCT FROM NEW.image_url
     OR OLD.link_url IS DISTINCT FROM NEW.link_url THEN
    NEW.display_version := OLD.display_version + 1;
    NEW.activated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bump_banner_display_version_trigger ON public.banners;
CREATE TRIGGER bump_banner_display_version_trigger
BEFORE UPDATE OF is_active, image_url, link_url ON public.banners
FOR EACH ROW EXECUTE FUNCTION public.bump_banner_display_version();

CREATE INDEX IF NOT EXISTS banners_active_activated_at_idx
ON public.banners (activated_at DESC)
WHERE is_active = TRUE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'banners'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.banners';
  END IF;
END $$;

COMMIT;

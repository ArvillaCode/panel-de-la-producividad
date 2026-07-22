BEGIN;

-- Complete structural effects that were applied only partially in production,
-- without restoring the older and less restrictive policies/RPCs.
ALTER TABLE public.academy_lessons
  ALTER COLUMN is_visible SET DEFAULT TRUE;

UPDATE public.academy_lessons
SET is_visible = TRUE
WHERE is_visible IS NULL;

ALTER TABLE public.academy_lessons
  ALTER COLUMN is_visible SET NOT NULL;

UPDATE public.banners
SET link_url = NULL
WHERE link_url = '';

ALTER TABLE public.banners
  DROP CONSTRAINT IF EXISTS banners_link_url_check;

ALTER TABLE public.banners
  ADD CONSTRAINT banners_link_url_check
  CHECK (link_url IS NULL OR link_url ~ '^https://');

COMMIT;

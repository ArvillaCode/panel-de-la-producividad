-- Database migration for YouTube Embed LMS integration
-- File: supabase/migrations/20260602000000_academy_youtube_integration.sql

BEGIN;

-- 1. Actualizar academy_lessons con metadatos de YouTube y restricciones académicas
ALTER TABLE public.academy_lessons ADD COLUMN IF NOT EXISTS youtube_id VARCHAR(11);
ALTER TABLE public.academy_lessons DROP CONSTRAINT IF EXISTS academy_lessons_youtube_id_check;
ALTER TABLE public.academy_lessons ADD CONSTRAINT academy_lessons_youtube_id_check CHECK (youtube_id ~ '^[a-zA-Z0-9_-]{11}$');

ALTER TABLE public.academy_lessons ADD COLUMN IF NOT EXISTS youtube_title TEXT;
ALTER TABLE public.academy_lessons ADD COLUMN IF NOT EXISTS youtube_duration_seconds INTEGER;
ALTER TABLE public.academy_lessons ADD COLUMN IF NOT EXISTS youtube_thumbnail_url TEXT;

ALTER TABLE public.academy_lessons ADD COLUMN IF NOT EXISTS require_completion BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.academy_lessons ADD COLUMN IF NOT EXISTS minimum_watch_percent INTEGER DEFAULT 90 NOT NULL;
ALTER TABLE public.academy_lessons DROP CONSTRAINT IF EXISTS academy_lessons_min_watch_check;
ALTER TABLE public.academy_lessons ADD CONSTRAINT academy_lessons_min_watch_check CHECK (minimum_watch_percent BETWEEN 1 AND 100);

-- 2. Actualizar academy_progress con la columna de visualización máxima
ALTER TABLE public.academy_progress ADD COLUMN IF NOT EXISTS max_watched_seconds INTEGER DEFAULT 0 NOT NULL;

-- 3. Habilitar RLS en academy_progress y crear políticas si no existen
ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_select_own" ON public.academy_progress;
CREATE POLICY "progress_select_own" ON public.academy_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_insert_own" ON public.academy_progress;
CREATE POLICY "progress_insert_own" ON public.academy_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_update_own" ON public.academy_progress;
CREATE POLICY "progress_update_own" ON public.academy_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_delete_own" ON public.academy_progress;
CREATE POLICY "progress_delete_own" ON public.academy_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 4. Crear la tabla de analíticas de visualización si no existe
CREATE TABLE IF NOT EXISTS public.academy_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Habilitar RLS en academy_analytics_events y crear políticas
ALTER TABLE public.academy_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_insert_authenticated" ON public.academy_analytics_events;
CREATE POLICY "analytics_insert_authenticated" ON public.academy_analytics_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "analytics_select_admin" ON public.academy_analytics_events;
CREATE POLICY "analytics_select_admin" ON public.academy_analytics_events
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

COMMIT;

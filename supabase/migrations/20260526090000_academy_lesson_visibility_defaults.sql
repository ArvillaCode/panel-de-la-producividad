-- Ensure existing academy lessons remain visible unless explicitly hidden.
DO $$
BEGIN
  IF to_regclass('public.academy_lessons') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'academy_lessons'
         AND column_name = 'is_visible'
     ) THEN
    ALTER TABLE public.academy_lessons
      ALTER COLUMN is_visible SET DEFAULT TRUE;

    UPDATE public.academy_lessons
      SET is_visible = TRUE
      WHERE is_visible IS NULL;

    ALTER TABLE public.academy_lessons
      ALTER COLUMN is_visible SET NOT NULL;

    DROP POLICY IF EXISTS "lessons_select" ON public.academy_lessons;

    CREATE POLICY "lessons_select" ON public.academy_lessons
      FOR SELECT TO authenticated
      USING (is_visible = TRUE OR public.is_admin(auth.uid()));
  END IF;
END $$;

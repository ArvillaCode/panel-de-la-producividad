BEGIN;

-- =====================================================================
-- 1. reset_user_password: RPC faltante para que admins puedan resetear
--    contraseñas de usuarios. Ausente del versionado hasta ahora.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reset_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores pueden resetear contraseñas';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes resetear tu propia contraseña';
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_user_password(UUID, TEXT) TO authenticated;

-- =====================================================================
-- 2. Endurecer RLS de academy_lessons: solo admins ven lecciones ocultas
-- =====================================================================
DO $$
BEGIN
  IF to_regclass('public.academy_lessons') IS NOT NULL THEN
    DROP POLICY IF EXISTS "lessons_select" ON public.academy_lessons;

    CREATE POLICY "lessons_select" ON public.academy_lessons
      FOR SELECT TO authenticated
      USING (is_visible = true OR public.is_admin(auth.uid()));
  END IF;
END $$;

-- =====================================================================
-- 3. CHECK constraint en banners.link_url para defense-in-depth
-- =====================================================================
DO $$
BEGIN
  IF to_regclass('public.banners') IS NOT NULL THEN
    ALTER TABLE public.banners
      DROP CONSTRAINT IF EXISTS banners_link_url_check;

    ALTER TABLE public.banners
      ADD CONSTRAINT banners_link_url_check
      CHECK (link_url IS NULL OR link_url ~ '^https://');
  END IF;
END $$;

COMMIT;

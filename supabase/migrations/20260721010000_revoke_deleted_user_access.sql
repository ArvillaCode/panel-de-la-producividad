BEGIN;

-- A signed JWT is not enough: the Auth identity and an active, approved
-- profile must still exist for every protected application request.
CREATE OR REPLACE FUNCTION public.has_auth_identity(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT user_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM auth.users WHERE id = user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_active_access(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT user_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM auth.users WHERE id = user_id)
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = user_id
        AND status = 'active'
        AND is_approved = TRUE
        AND (
          role IN ('admin', 'core_admin')
          OR is_legacy_fallback = TRUE
          OR end_date IS NULL
          OR end_date >= now()
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT public.has_active_access(user_id)
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = user_id
        AND role IN ('admin', 'core_admin')
    );
$$;

REVOKE ALL ON FUNCTION public.has_auth_identity(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_auth_identity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_legacy_fallback()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET plan = 'legacy',
      end_date = NULL,
      status = 'active'
  WHERE id = auth.uid()
    AND public.has_auth_identity(auth.uid())
    AND is_legacy_fallback = TRUE
    AND end_date IS NOT NULL
    AND end_date < now();

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_legacy_fallback() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_legacy_fallback() TO authenticated;

-- Keep profile reads available for pending/inactive users so the client can
-- explain their state, but require that the Auth identity still exists.
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT TO authenticated
USING (
  (auth.uid() = id AND public.has_auth_identity(auth.uid()))
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "profiles_insert_own_pending" ON public.profiles;

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id AND public.has_auth_identity(auth.uid()))
WITH CHECK (auth.uid() = id AND public.has_auth_identity(auth.uid()));

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin"
ON public.profiles FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- Keep the existing RPC name so frontend and database deployments can occur
-- independently. Its behavior now deletes the complete user, not only a profile.
CREATE OR REPLACE FUNCTION public.admin_delete_profile(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_count INT;
  target_role TEXT;
  target_is_active BOOLEAN;
  target_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores activos pueden eliminar usuarios';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id requerido';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propio usuario';
  END IF;

  PERFORM 1
  FROM public.profiles
  WHERE role IN ('admin', 'core_admin')
    AND status = 'active'
    AND is_approved = TRUE
  FOR UPDATE;

  SELECT role,
         status = 'active' AND is_approved = TRUE
  INTO target_role, target_is_active
  FROM public.profiles
  WHERE id = target_user_id;

  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id)
      OR EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id)
  INTO target_exists;

  IF NOT target_exists THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  IF target_role IN ('admin', 'core_admin') AND target_is_active THEN
    SELECT COUNT(*)
    INTO admin_count
    FROM public.profiles
    WHERE role IN ('admin', 'core_admin')
      AND status = 'active'
      AND is_approved = TRUE;

    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'No se permite eliminar al ultimo administrador activo';
    END IF;
  END IF;

  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id::TEXT;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_profile(UUID) TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.agents') IS NOT NULL THEN
    DROP POLICY IF EXISTS "agents_select_policy" ON public.agents;
    CREATE POLICY "agents_select_policy" ON public.agents
      FOR SELECT TO authenticated
      USING (public.has_active_access(auth.uid()) AND (visible = TRUE OR public.is_admin(auth.uid())));
  END IF;

  IF to_regclass('public.academy_courses') IS NOT NULL THEN
    DROP POLICY IF EXISTS "courses_select" ON public.academy_courses;
    CREATE POLICY "courses_select" ON public.academy_courses
      FOR SELECT TO authenticated USING (public.has_active_access(auth.uid()));
  END IF;

  IF to_regclass('public.academy_modules') IS NOT NULL THEN
    DROP POLICY IF EXISTS "modules_select" ON public.academy_modules;
    CREATE POLICY "modules_select" ON public.academy_modules
      FOR SELECT TO authenticated USING (public.has_active_access(auth.uid()));
  END IF;

  IF to_regclass('public.academy_lessons') IS NOT NULL THEN
    DROP POLICY IF EXISTS "lessons_select" ON public.academy_lessons;
    CREATE POLICY "lessons_select" ON public.academy_lessons
      FOR SELECT TO authenticated
      USING (public.has_active_access(auth.uid()) AND (is_visible = TRUE OR public.is_admin(auth.uid())));
  END IF;

  IF to_regclass('public.user_favorites') IS NOT NULL THEN
    DROP POLICY IF EXISTS "favorites_owner" ON public.user_favorites;
    CREATE POLICY "favorites_owner" ON public.user_favorites
      FOR ALL TO authenticated
      USING (public.has_active_access(auth.uid()) AND user_id = auth.uid())
      WITH CHECK (public.has_active_access(auth.uid()) AND user_id = auth.uid());
  END IF;

  IF to_regclass('public.agent_ratings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "ratings_select" ON public.agent_ratings;
    DROP POLICY IF EXISTS "ratings_owner" ON public.agent_ratings;
    CREATE POLICY "ratings_select" ON public.agent_ratings
      FOR SELECT TO authenticated USING (public.has_active_access(auth.uid()));
    CREATE POLICY "ratings_owner" ON public.agent_ratings
      FOR ALL TO authenticated
      USING (public.has_active_access(auth.uid()) AND user_id = auth.uid())
      WITH CHECK (public.has_active_access(auth.uid()) AND user_id = auth.uid());
  END IF;

  IF to_regclass('public.agent_suggestions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "suggestions_select" ON public.agent_suggestions;
    DROP POLICY IF EXISTS "suggestions_insert" ON public.agent_suggestions;
    CREATE POLICY "suggestions_select" ON public.agent_suggestions
      FOR SELECT TO authenticated
      USING (public.has_active_access(auth.uid()) AND (user_id = auth.uid() OR public.is_admin(auth.uid())));
    CREATE POLICY "suggestions_insert" ON public.agent_suggestions
      FOR INSERT TO authenticated
      WITH CHECK (public.has_active_access(auth.uid()) AND user_id = auth.uid());
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    DROP POLICY IF EXISTS "notifications_owner_select" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_owner_update" ON public.notifications;
    CREATE POLICY "notifications_owner_select" ON public.notifications
      FOR SELECT TO authenticated
      USING (public.has_active_access(auth.uid()) AND (user_id = auth.uid() OR public.is_admin(auth.uid())));
    CREATE POLICY "notifications_owner_update" ON public.notifications
      FOR UPDATE TO authenticated
      USING (public.has_active_access(auth.uid()) AND (user_id = auth.uid() OR public.is_admin(auth.uid())))
      WITH CHECK (public.has_active_access(auth.uid()) AND (user_id = auth.uid() OR public.is_admin(auth.uid())));
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "audit_logs_user_insert" ON public.audit_logs;
    CREATE POLICY "audit_logs_user_insert" ON public.audit_logs
      FOR INSERT TO authenticated
      WITH CHECK (public.has_active_access(auth.uid()) AND user_id = auth.uid());
  END IF;

  IF to_regclass('public.release_notes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "releases_select" ON public.release_notes;
    CREATE POLICY "releases_select" ON public.release_notes
      FOR SELECT TO authenticated
      USING (public.has_active_access(auth.uid()) AND (is_visible = TRUE OR public.is_admin(auth.uid())));
  END IF;

  IF to_regclass('public.user_release_reads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "release_reads_owner" ON public.user_release_reads;
    CREATE POLICY "release_reads_owner" ON public.user_release_reads
      FOR ALL TO authenticated
      USING (public.has_active_access(auth.uid()) AND user_id = auth.uid())
      WITH CHECK (public.has_active_access(auth.uid()) AND user_id = auth.uid());
  END IF;

  IF to_regclass('public.academy_progress') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can manage their own progress" ON public.academy_progress;
    DROP POLICY IF EXISTS "progress_select_own" ON public.academy_progress;
    DROP POLICY IF EXISTS "progress_insert_own" ON public.academy_progress;
    DROP POLICY IF EXISTS "progress_update_own" ON public.academy_progress;
    DROP POLICY IF EXISTS "progress_delete_own" ON public.academy_progress;
    CREATE POLICY "progress_select_own" ON public.academy_progress
      FOR SELECT TO authenticated
      USING (public.has_active_access(auth.uid()) AND auth.uid() = user_id);
    CREATE POLICY "progress_insert_own" ON public.academy_progress
      FOR INSERT TO authenticated
      WITH CHECK (public.has_active_access(auth.uid()) AND auth.uid() = user_id);
    CREATE POLICY "progress_update_own" ON public.academy_progress
      FOR UPDATE TO authenticated
      USING (public.has_active_access(auth.uid()) AND auth.uid() = user_id)
      WITH CHECK (public.has_active_access(auth.uid()) AND auth.uid() = user_id);
    CREATE POLICY "progress_delete_own" ON public.academy_progress
      FOR DELETE TO authenticated
      USING (public.has_active_access(auth.uid()) AND (auth.uid() = user_id OR public.is_admin(auth.uid())));
  END IF;

  IF to_regclass('public.academy_analytics_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS "analytics_insert_authenticated" ON public.academy_analytics_events;
    CREATE POLICY "analytics_insert_authenticated" ON public.academy_analytics_events
      FOR INSERT TO authenticated
      WITH CHECK (public.has_active_access(auth.uid()) AND auth.uid() = user_id);
  END IF;
END $$;

COMMIT;

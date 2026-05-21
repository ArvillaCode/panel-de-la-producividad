-- =====================================================================
-- Migration: 20260521_rls_hardening.sql
-- Descripción: Activa Row Level Security (RLS) y define políticas Zero-Trust
--              para 11 tablas críticas del core de la plataforma Upfunnel.
-- =====================================================================

BEGIN;

-- 1. Habilitar RLS en las 11 Tablas Críticas del Sistema
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_release_reads ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. Políticas para Configuración Global (system_config)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "system_config_select" ON public.system_config;
DROP POLICY IF EXISTS "system_config_admin_write" ON public.system_config;

CREATE POLICY "system_config_select" ON public.system_config 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "system_config_admin_write" ON public.system_config 
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 3. Políticas para Catálogo de Agentes (agents)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "agents_select_policy" ON public.agents;
DROP POLICY IF EXISTS "agents_admin_policy" ON public.agents;

CREATE POLICY "agents_select_policy" ON public.agents 
  FOR SELECT TO authenticated USING (visible = true OR public.is_admin(auth.uid()));

CREATE POLICY "agents_admin_policy" ON public.agents 
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 4. Políticas para la Academia Upfunnel (courses, modules, lessons)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "courses_select" ON public.academy_courses;
DROP POLICY IF EXISTS "courses_admin" ON public.academy_courses;
CREATE POLICY "courses_select" ON public.academy_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "courses_admin" ON public.academy_courses FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "modules_select" ON public.academy_modules;
DROP POLICY IF EXISTS "modules_admin" ON public.academy_modules;
CREATE POLICY "modules_select" ON public.academy_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules_admin" ON public.academy_modules FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "lessons_select" ON public.academy_lessons;
DROP POLICY IF EXISTS "lessons_admin" ON public.academy_lessons;
CREATE POLICY "lessons_select" ON public.academy_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "lessons_admin" ON public.academy_lessons FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 5. Políticas de Privacidad del Usuario (Favorites, Ratings, Suggestions)
-- ---------------------------------------------------------------------
-- user_favorites: Solo el dueño lee/escribe
DROP POLICY IF EXISTS "favorites_owner" ON public.user_favorites;
CREATE POLICY "favorites_owner" ON public.user_favorites 
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- agent_ratings: Todos leen promedios, solo dueño crea/edita su calificación
DROP POLICY IF EXISTS "ratings_select" ON public.agent_ratings;
DROP POLICY IF EXISTS "ratings_owner" ON public.agent_ratings;
CREATE POLICY "ratings_select" ON public.agent_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ratings_owner" ON public.agent_ratings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- agent_suggestions: Usuario lee/crea lo propio, Admin gestiona todo
DROP POLICY IF EXISTS "suggestions_select" ON public.agent_suggestions;
DROP POLICY IF EXISTS "suggestions_insert" ON public.agent_suggestions;
DROP POLICY IF EXISTS "suggestions_admin" ON public.agent_suggestions;
CREATE POLICY "suggestions_select" ON public.agent_suggestions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "suggestions_insert" ON public.agent_suggestions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "suggestions_admin" ON public.agent_suggestions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 6. Políticas de Control Operativo (Notifications, Audit Logs, Release Notes)
-- ---------------------------------------------------------------------
-- notifications: Usuario lee/actualiza lectura de lo propio, Admin inserta
DROP POLICY IF EXISTS "notifications_owner_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_owner_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_insert" ON public.notifications;
CREATE POLICY "notifications_owner_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "notifications_owner_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "notifications_admin_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- audit_logs: Lectura exclusiva Admin, inserción automática por el usuario actual
DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_user_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "audit_logs_user_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- release_notes: Lectura pública, Admin gestiona
DROP POLICY IF EXISTS "releases_select" ON public.release_notes;
DROP POLICY IF EXISTS "releases_admin" ON public.release_notes;
CREATE POLICY "releases_select" ON public.release_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "releases_admin" ON public.release_notes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_release_reads: Lectura y escritura de lo propio
DROP POLICY IF EXISTS "release_reads_owner" ON public.user_release_reads;
CREATE POLICY "release_reads_owner" ON public.user_release_reads FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMIT;

-- =====================================================================
-- MIGRACIÓN DEFINITIVA: SPRINT DE SEGURIDAD 1 (HARDENING V3.1)
-- Ubicación: supabase/migrations/20260531_security_sprint_1_hardening_v31.sql
-- =====================================================================

BEGIN;

-- 1.0 Crear la tabla audit_logs si no existe para la bitácora inmutable
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  action TEXT,
  entity TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- SECCIÓN 1: SEC-01 - AUDITORÍA INMUTABLE CON MUTEX DEFENSIVO TRY-CATCH
-- =====================================================================

-- 1.1 Trigger para garantizar la inmutabilidad de audit_logs con bypass de mantenimiento seguro
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
DECLARE
  maintenance_flag TEXT;
BEGIN
  -- A) Control de Rol de Conexión y de Supabase Auth (caller JWT / session role)
  IF (auth.role() IN ('anon', 'authenticated')) OR (session_user IN ('anon', 'authenticated')) THEN
    RAISE EXCEPTION 'Operación denegada. Los registros de auditoría (audit_logs) son estrictamente inmutables para accesos de aplicación.';
  END IF;

  -- B) Para superusuarios directos, requerir variable de sesión local explícita
  BEGIN
    maintenance_flag := current_setting('system.audit_logs_maintenance_mode', true);
  EXCEPTION WHEN OTHERS THEN
    maintenance_flag := 'inactive';
  END;

  IF maintenance_flag IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Operación denegada. Modificación bloqueada. Active system.audit_logs_maintenance_mode para mantenimiento extraordinario.';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS limit_audit_log_mutation ON public.audit_logs;
CREATE TRIGGER limit_audit_log_mutation
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();


-- 1.2 Trigger genérico para auditoría de tablas administrativas estándar (Con Mutex Defensivo)
CREATE OR REPLACE FUNCTION public.audit_administrative_actions()
RETURNS TRIGGER AS $$
DECLARE
  actor_id UUID;
  action_name TEXT;
  detail_json JSONB;
  target_id TEXT;
BEGIN
  -- Evitar bucles de auditoría mediante bandera de sesión de transacción (Anti-Recursión)
  IF current_setting('system.audit_in_progress', true) = 'on' THEN
    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Bloque Try-Catch Defensivo para asegurar el reset de la bandera ante excepciones
  BEGIN
    -- Activar bandera de auditoría
    PERFORM set_config('system.audit_in_progress', 'on', true);

    actor_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
      action_name := 'CREATE_' || UPPER(TG_TABLE_NAME);
      detail_json := jsonb_build_object('new', to_jsonb(NEW));
      BEGIN target_id := (to_jsonb(NEW) ->> 'id'); EXCEPTION WHEN OTHERS THEN target_id := NULL; END;
    ELSIF (TG_OP = 'UPDATE') THEN
      action_name := 'UPDATE_' || UPPER(TG_TABLE_NAME);
      detail_json := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
      BEGIN target_id := (to_jsonb(NEW) ->> 'id'); EXCEPTION WHEN OTHERS THEN target_id := NULL; END;
    ELSIF (TG_OP = 'DELETE') THEN
      action_name := 'DELETE_' || UPPER(TG_TABLE_NAME);
      detail_json := jsonb_build_object('old', to_jsonb(OLD));
      BEGIN target_id := (to_jsonb(OLD) ->> 'id'); EXCEPTION WHEN OTHERS THEN target_id := NULL; END;
    END IF;

    IF target_id IS NULL THEN
      target_id := 'N/A';
    END IF;

    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
    VALUES (actor_id, action_name, TG_TABLE_NAME, target_id, detail_json);

    -- Desactivar bandera en flujo normal
    PERFORM set_config('system.audit_in_progress', 'off', true);

  EXCEPTION WHEN OTHERS THEN
    -- Garantizar la desactivación de la bandera ante cualquier excepción
    PERFORM set_config('system.audit_in_progress', 'off', true);
    RAISE;
  END;

  IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Vincular Triggers de Auditoría
DROP TRIGGER IF EXISTS audit_system_config_trigger ON public.system_config;
CREATE TRIGGER audit_system_config_trigger AFTER INSERT OR UPDATE OR DELETE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.audit_administrative_actions();

DROP TRIGGER IF EXISTS audit_agents_trigger ON public.agents;
CREATE TRIGGER audit_agents_trigger AFTER INSERT OR UPDATE OR DELETE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.audit_administrative_actions();

DROP TRIGGER IF EXISTS audit_release_notes_trigger ON public.release_notes;
CREATE TRIGGER audit_release_notes_trigger AFTER INSERT OR UPDATE OR DELETE ON public.release_notes FOR EACH ROW EXECUTE FUNCTION public.audit_administrative_actions();

DROP TRIGGER IF EXISTS audit_banners_trigger ON public.banners;
CREATE TRIGGER audit_banners_trigger AFTER INSERT OR UPDATE OR DELETE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.audit_administrative_actions();

-- Triggers condicionales para la Academia (si existen)
DO $$
BEGIN
  IF to_regclass('public.academy_courses') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS audit_academy_courses_trigger ON public.academy_courses;
    CREATE TRIGGER audit_academy_courses_trigger AFTER INSERT OR UPDATE OR DELETE ON public.academy_courses FOR EACH ROW EXECUTE FUNCTION public.audit_administrative_actions();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.academy_modules') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS audit_academy_modules_trigger ON public.academy_modules;
    CREATE TRIGGER audit_academy_modules_trigger AFTER INSERT OR UPDATE OR DELETE ON public.academy_modules FOR EACH ROW EXECUTE FUNCTION public.audit_administrative_actions();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.academy_lessons') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS audit_academy_lessons_trigger ON public.academy_lessons;
    CREATE TRIGGER audit_academy_lessons_trigger AFTER INSERT OR UPDATE OR DELETE ON public.academy_lessons FOR EACH ROW EXECUTE FUNCTION public.audit_administrative_actions();
  END IF;
END $$;


-- Trigger específico de perfiles de usuario
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER AS $$
DECLARE
  actor_id UUID;
  action_name TEXT;
  detail_json JSONB;
  is_admin_actor BOOLEAN;
BEGIN
  IF current_setting('system.audit_in_progress', true) = 'on' THEN
    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  BEGIN
    PERFORM set_config('system.audit_in_progress', 'on', true);

    actor_id := auth.uid();
    is_admin_actor := (actor_id IS NOT NULL AND public.is_admin(actor_id));
    
    IF is_admin_actor OR (
      TG_OP = 'UPDATE' AND (
        OLD.role IS DISTINCT FROM NEW.role OR
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.is_approved IS DISTINCT FROM NEW.is_approved OR
        OLD.plan IS DISTINCT FROM NEW.plan OR
        OLD.end_date IS DISTINCT FROM NEW.end_date
      )
    ) OR TG_OP = 'DELETE' THEN
      
      IF (TG_OP = 'INSERT') THEN
        action_name := 'CREATE_PROFILE';
        detail_json := jsonb_build_object('new', jsonb_build_object('id', NEW.id, 'email', NEW.email, 'name', NEW.name, 'role', NEW.role, 'status', NEW.status, 'is_approved', NEW.is_approved, 'plan', NEW.plan));
      ELSIF (TG_OP = 'UPDATE') THEN
        action_name := 'UPDATE_PROFILE';
        detail_json := jsonb_build_object(
          'old', jsonb_build_object('id', OLD.id, 'email', OLD.email, 'name', OLD.name, 'role', OLD.role, 'status', OLD.status, 'is_approved', OLD.is_approved, 'plan', OLD.plan),
          'new', jsonb_build_object('id', NEW.id, 'email', NEW.email, 'name', NEW.name, 'role', NEW.role, 'status', NEW.status, 'is_approved', NEW.is_approved, 'plan', NEW.plan)
        );
      ELSIF (TG_OP = 'DELETE') THEN
        action_name := 'DELETE_PROFILE';
        detail_json := jsonb_build_object('old', jsonb_build_object('id', OLD.id, 'email', OLD.email, 'name', OLD.name, 'role', OLD.role, 'status', OLD.status, 'is_approved', OLD.is_approved, 'plan', OLD.plan));
      END IF;

      INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
      VALUES (actor_id, action_name, 'profiles', CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END, detail_json);
    END IF;

    PERFORM set_config('system.audit_in_progress', 'off', true);

  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('system.audit_in_progress', 'off', true);
    RAISE;
  END;

  IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_profile_changes();


-- =====================================================================
-- SECCIÓN 2: SEC-02 - PROTECCIÓN DEL ÚLTIMO ADMIN (BLOQUEOS PESIMISTAS ZERO-TRUST)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.check_last_admin_protection()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INT;
BEGIN
  -- A) Bloqueo de eliminación física
  IF (TG_OP = 'DELETE') THEN
    IF OLD.role IN ('admin', 'core_admin') THEN
      PERFORM 1 FROM public.profiles
      WHERE role IN ('admin', 'core_admin')
        AND status = 'active'
        AND is_approved = TRUE
      FOR UPDATE;

      SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role IN ('admin', 'core_admin');
      
      IF admin_count <= 1 THEN
        RAISE EXCEPTION 'Violación de Seguridad: No se permite la eliminación física del último administrador del sistema.';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- B) Bloqueo de degradación de rol, desactivación o retiro de aprobación
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.role IN ('admin', 'core_admin') AND (
      NEW.role NOT IN ('admin', 'core_admin') OR
      NEW.status <> 'active' OR
      NEW.is_approved = FALSE
    ) THEN
      PERFORM 1 FROM public.profiles
      WHERE role IN ('admin', 'core_admin')
        AND status = 'active'
        AND is_approved = TRUE
      FOR UPDATE;

      SELECT COUNT(*) INTO admin_count
      FROM public.profiles
      WHERE role IN ('admin', 'core_admin')
        AND status = 'active'
        AND is_approved = TRUE;
        
      IF OLD.status = 'active' AND OLD.is_approved = TRUE AND admin_count <= 1 THEN
        RAISE EXCEPTION 'Violación de Seguridad: No se permite degradar, desactivar o desaprobar al último administrador activo del sistema.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS last_admin_protection_trigger ON public.profiles;
CREATE TRIGGER last_admin_protection_trigger BEFORE UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.check_last_admin_protection();


CREATE OR REPLACE FUNCTION public.admin_delete_profile(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_count INT;
  target_role TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar perfiles';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propio perfil';
  END IF;

  -- Bloqueo pesimista inmediato de todos los admins activos para serializar la transacción (Zero-Trust)
  PERFORM 1 FROM public.profiles
  WHERE role IN ('admin', 'core_admin')
    AND status = 'active'
    AND is_approved = TRUE
  FOR UPDATE;

  SELECT role INTO target_role FROM public.profiles WHERE id = target_user_id;
  
  IF target_role IN ('admin', 'core_admin') THEN
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role IN ('admin', 'core_admin');
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'Protección absoluta: No se permite la eliminación del último administrador del sistema.';
    END IF;
  END IF;

  -- Invalidación inmediata de tokens de sesión concurrentes en Supabase Auth
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id::TEXT;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_update_profile(target_user_id UUID, profile_patch JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_role TEXT;
  next_status TEXT;
  next_is_approved BOOLEAN;
  existing_role TEXT;
  existing_status TEXT;
  existing_is_approved BOOLEAN;
  admin_count INT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores pueden actualizar perfiles';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id requerido';
  END IF;

  -- Bloqueo pesimista inmediato de todos los admins activos
  PERFORM 1 FROM public.profiles
  WHERE role IN ('admin', 'core_admin')
    AND status = 'active'
    AND is_approved = TRUE
  FOR UPDATE;

  SELECT role, status, is_approved 
  INTO existing_role, existing_status, existing_is_approved 
  FROM public.profiles 
  WHERE id = target_user_id;

  next_role := COALESCE(NULLIF(profile_patch->>'role', ''), existing_role);
  next_status := COALESCE(NULLIF(profile_patch->>'status', ''), existing_status);
  
  IF profile_patch ? 'is_approved' THEN
    next_is_approved := COALESCE((profile_patch->>'is_approved')::BOOLEAN, FALSE);
  ELSE
    next_is_approved := existing_is_approved;
  END IF;

  IF next_role NOT IN ('user', 'admin', 'core_admin', 'editor', 'support') THEN
    RAISE EXCEPTION 'Rol no permitido';
  END IF;

  IF next_status NOT IN ('pending', 'active', 'inactive', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Estado no permitido';
  END IF;

  IF existing_role IN ('admin', 'core_admin') AND (
    next_role NOT IN ('admin', 'core_admin') OR
    next_status <> 'active' OR
    next_is_approved = FALSE
  ) THEN
    SELECT COUNT(*) INTO admin_count 
    FROM public.profiles 
    WHERE role IN ('admin', 'core_admin') 
      AND status = 'active' 
      AND is_approved = TRUE;
      
    IF existing_status = 'active' AND existing_is_approved = TRUE AND admin_count <= 1 THEN
      RAISE EXCEPTION 'Protección absoluta: No se permite degradar, desactivar o desaprobar al último administrador activo del sistema.';
    END IF;
  END IF;

  -- Forzar desconexión inmediata en GoTrue al degradar o desactivar
  IF next_status <> 'active' OR next_is_approved = FALSE OR next_role NOT IN ('admin', 'core_admin') THEN
    DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id::TEXT;
  END IF;

  UPDATE public.profiles
  SET
    name = COALESCE(profile_patch->>'name', name),
    avatar_url = COALESCE(profile_patch->>'avatar_url', avatar_url),
    timezone = COALESCE(profile_patch->>'timezone', timezone),
    role = next_role,
    status = next_status,
    is_approved = next_is_approved,
    start_date = CASE WHEN profile_patch ? 'start_date' THEN NULLIF(profile_patch->>'start_date', '')::TIMESTAMPTZ ELSE start_date END,
    end_date = CASE WHEN profile_patch ? 'end_date' THEN NULLIF(profile_patch->>'end_date', '')::TIMESTAMPTZ ELSE end_date END,
    plan = CASE WHEN profile_patch ? 'plan' THEN profile_patch->>'plan' ELSE plan END,
    is_legacy_fallback = CASE WHEN profile_patch ? 'is_legacy_fallback' THEN COALESCE((profile_patch->>'is_legacy_fallback')::BOOLEAN, FALSE) ELSE is_legacy_fallback END
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;
END;
$$;


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

  -- Actualizar credencial y notificar GoTrue
  UPDATE auth.users
  SET 
    encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10)),
    updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Forzar deslogueo atómico invalidando refresh tokens
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id::TEXT;

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
  VALUES (auth.uid(), 'RESET_PASSWORD', 'profiles', target_user_id::TEXT, jsonb_build_object('message', 'Contraseña restablecida de forma forzada y sesiones concurrentes invalidadas.'));
END;
$$;

-- ---------------------------------------------------------------------
-- SECCIÓN 3: SEC-03 - POLÍTICA RLS EN RELEASE_NOTES
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.release_notes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "releases_select" ON public.release_notes;
    CREATE POLICY "releases_select" ON public.release_notes
      FOR SELECT TO authenticated
      USING (is_visible = true OR public.is_admin(auth.uid()));
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- DOCUMENTACIÓN DEL PLAN DE ROLLBACK COMPLETO (REVERSIÓN UNIFICADA)
-- =====================================================================
/*
Para revertir de forma atómica y completa todas las modificaciones introducidas 
por esta migración en caso de un incidente mayor en producción, ejecute el 
siguiente script SQL consolidado en el Editor SQL de Supabase:

BEGIN;

-- 1. Remover Triggers (Eliminar dependencias jerárquicas primero)
DROP TRIGGER IF EXISTS limit_audit_log_mutation ON public.audit_logs;
DROP TRIGGER IF EXISTS audit_system_config_trigger ON public.system_config;
DROP TRIGGER IF EXISTS audit_agents_trigger ON public.agents;
DROP TRIGGER IF EXISTS audit_release_notes_trigger ON public.release_notes;
DROP TRIGGER IF EXISTS audit_banners_trigger ON public.banners;
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
DROP TRIGGER IF EXISTS audit_academy_courses_trigger ON public.academy_courses;
DROP TRIGGER IF EXISTS audit_academy_modules_trigger ON public.academy_modules;
DROP TRIGGER IF EXISTS audit_academy_lessons_trigger ON public.academy_lessons;
DROP TRIGGER IF EXISTS last_admin_protection_trigger ON public.profiles;

-- 2. Remover Funciones de Trigger
DROP FUNCTION IF EXISTS public.prevent_audit_log_mutation();
DROP FUNCTION IF EXISTS public.audit_administrative_actions();
DROP FUNCTION IF EXISTS public.audit_profile_changes();
DROP FUNCTION IF EXISTS public.check_last_admin_protection();

-- 3. Restaurar RPCs Originales (admin_delete_profile, admin_update_profile, reset_user_password)
CREATE OR REPLACE FUNCTION public.admin_delete_profile(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar perfiles';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propio perfil';
  END IF;

  DELETE FROM auth.users
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_profile(target_user_id UUID, profile_patch JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_role TEXT;
  next_status TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores pueden actualizar perfiles';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id requerido';
  END IF;

  next_role := COALESCE(NULLIF(profile_patch->>'role', ''), (SELECT role FROM public.profiles WHERE id = target_user_id));
  next_status := COALESCE(NULLIF(profile_patch->>'status', ''), (SELECT status FROM public.profiles WHERE id = target_user_id));

  IF next_role NOT IN ('user', 'admin', 'core_admin', 'editor', 'support') THEN
    RAISE EXCEPTION 'Rol no permitido';
  END IF;

  IF next_status NOT IN ('pending', 'active', 'inactive', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Estado no permitido';
  END IF;

  UPDATE public.profiles
  SET
    name = COALESCE(profile_patch->>'name', name),
    avatar_url = COALESCE(profile_patch->>'avatar_url', avatar_url),
    timezone = COALESCE(profile_patch->>'timezone', timezone),
    role = next_role,
    status = next_status,
    is_approved = CASE
      WHEN profile_patch ? 'is_approved' THEN COALESCE((profile_patch->>'is_approved')::BOOLEAN, FALSE)
      ELSE is_approved
    END,
    start_date = CASE
      WHEN profile_patch ? 'start_date' THEN NULLIF(profile_patch->>'start_date', '')::TIMESTAMPTZ
      ELSE start_date
    END,
    end_date = CASE
      WHEN profile_patch ? 'end_date' THEN NULLIF(profile_patch->>'end_date', '')::TIMESTAMPTZ
      ELSE end_date
    END,
    plan = CASE
      WHEN profile_patch ? 'plan' THEN profile_patch->>'plan'
      ELSE plan
    END,
    is_legacy_fallback = CASE
      WHEN profile_patch ? 'is_legacy_fallback' THEN COALESCE((profile_patch->>'is_legacy_fallback')::BOOLEAN, FALSE)
      ELSE is_legacy_fallback
    END
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;
END;
$$;

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

-- 4. Re-establecer Permisos de Ejecución (GRANTS)
GRANT EXECUTE ON FUNCTION public.admin_delete_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_password(UUID, TEXT) TO authenticated;

-- 5. Restaurar la Política RLS original permisiva en release_notes
DO $$
BEGIN
  IF to_regclass('public.release_notes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "releases_select" ON public.release_notes;
    CREATE POLICY "releases_select" ON public.release_notes FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

COMMIT;
*/

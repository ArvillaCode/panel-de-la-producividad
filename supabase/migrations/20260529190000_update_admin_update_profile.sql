-- Migración de Base de Datos para Upfunnel: Actualizar función admin_update_profile
-- ID de Migración: 20260529190000_update_admin_update_profile.sql

BEGIN;

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
  -- Verificar permisos de administrador
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores pueden actualizar perfiles';
  END IF;

  -- Validar parámetro obligatorio
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id requerido';
  END IF;

  -- Resolver roles y estados con coalescencia defensiva
  next_role := COALESCE(NULLIF(profile_patch->>'role', ''), (SELECT role FROM public.profiles WHERE id = target_user_id));
  next_status := COALESCE(NULLIF(profile_patch->>'status', ''), (SELECT status FROM public.profiles WHERE id = target_user_id));

  -- Validar restricciones
  IF next_role NOT IN ('user', 'admin', 'core_admin', 'editor', 'support') THEN
    RAISE EXCEPTION 'Rol no permitido';
  END IF;

  IF next_status NOT IN ('pending', 'active', 'inactive', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Estado no permitido';
  END IF;

  -- Ejecutar actualización incluyendo plan y reversión legacy
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

  -- Validar existencia del registro
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;
END;
$$;

COMMIT;

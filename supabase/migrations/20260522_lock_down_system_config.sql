BEGIN;

DROP POLICY IF EXISTS "system_config_select" ON public.system_config;

CREATE POLICY "system_config_select"
ON public.system_config
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_public_system_config()
RETURNS TABLE (
  max_login_attempts INTEGER,
  password_min_length INTEGER,
  require_strong_password BOOLEAN,
  show_academia BOOLEAN,
  ai_assistant_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(sc.max_login_attempts, 5)::INTEGER,
    COALESCE(sc.password_min_length, 8)::INTEGER,
    COALESCE(sc.require_strong_password, TRUE)::BOOLEAN,
    COALESCE(sc.show_academia, TRUE)::BOOLEAN,
    COALESCE(sc.ai_assistant_enabled, TRUE)::BOOLEAN
  FROM (SELECT 1) seed
  LEFT JOIN public.system_config sc ON sc.id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_system_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_system_config() TO authenticated;

COMMIT;

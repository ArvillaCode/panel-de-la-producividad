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

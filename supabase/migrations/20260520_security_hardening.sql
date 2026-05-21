BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'expired')),
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'google/gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS ai_assistant_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT DEFAULT '';

ALTER TABLE public.system_config
  DROP COLUMN IF EXISTS openrouter_api_key;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND role IN ('admin', 'core_admin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    status,
    is_approved,
    timezone,
    start_date,
    end_date
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Usuario'),
    'user',
    'pending',
    FALSE,
    COALESCE(new.raw_user_meta_data->>'timezone', 'UTC'),
    NULL,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

INSERT INTO public.profiles (
  id,
  email,
  name,
  role,
  status,
  is_approved,
  timezone,
  start_date,
  end_date
)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Usuario'),
  'user',
  'pending',
  FALSE,
  COALESCE(u.raw_user_meta_data->>'timezone', 'UTC'),
  NULL,
  NULL
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles
SET status = 'active',
    is_approved = TRUE
WHERE role IN ('admin', 'core_admin');

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir insercion de perfil propio" ON public.profiles;
DROP POLICY IF EXISTS "Permitir inserción de perfil propio" ON public.profiles;
DROP POLICY IF EXISTS "Permitir inserciÃ³n de perfil propio" ON public.profiles;
DROP POLICY IF EXISTS "Permitir lectura de perfil propio" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir lectura de perfil propio o admin" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualizacion de perfil propio o admin" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualización de perfil propio o admin" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualizaciÃ³n de perfil propio o admin" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualizacion de perfil propio" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "profiles_insert_own_pending"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role = 'user'
  AND status = 'pending'
  AND is_approved = FALSE
);

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_admin"
ON public.profiles FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name, avatar_url, timezone) ON public.profiles TO authenticated;

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
    END
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_profile(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar perfiles';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propio perfil';
  END IF;

  DELETE FROM public.profiles
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_profile(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_profile(UUID) TO authenticated;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de banners" ON public.banners;
DROP POLICY IF EXISTS "Permitir lectura pública de banners" ON public.banners;
DROP POLICY IF EXISTS "Permitir lectura pÃºblica de banners" ON public.banners;
DROP POLICY IF EXISTS "Permitir insercion de banners a autenticados" ON public.banners;
DROP POLICY IF EXISTS "Permitir inserción de banners a autenticados" ON public.banners;
DROP POLICY IF EXISTS "Permitir inserciÃ³n de banners a autenticados" ON public.banners;
DROP POLICY IF EXISTS "Permitir actualizacion de banners a autenticados" ON public.banners;
DROP POLICY IF EXISTS "Permitir actualización de banners a autenticados" ON public.banners;
DROP POLICY IF EXISTS "Permitir actualizaciÃ³n de banners a autenticados" ON public.banners;
DROP POLICY IF EXISTS "Permitir eliminacion de banners a autenticados" ON public.banners;
DROP POLICY IF EXISTS "Permitir eliminación de banners a autenticados" ON public.banners;
DROP POLICY IF EXISTS "Permitir eliminaciÃ³n de banners a autenticados" ON public.banners;

CREATE POLICY "banners_public_select"
ON public.banners FOR SELECT
USING (TRUE);

CREATE POLICY "banners_admin_insert"
ON public.banners FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "banners_admin_update"
ON public.banners FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "banners_admin_delete"
ON public.banners FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DROP POLICY IF EXISTS "Permitir lectura publica de imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura pública de imágenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura pÃºblica de imÃ¡genes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir insercion de imagenes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir inserción de imágenes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir inserciÃ³n de imÃ¡genes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualizacion de imagenes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de imágenes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualizaciÃ³n de imÃ¡genes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminacion de imagenes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de imágenes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminaciÃ³n de imÃ¡genes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;

CREATE POLICY "images_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

CREATE POLICY "images_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images' AND public.is_admin(auth.uid()));

CREATE POLICY "images_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'images' AND public.is_admin(auth.uid()));

CREATE POLICY "images_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND public.is_admin(auth.uid()));

CREATE POLICY "avatars_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    name LIKE (auth.uid()::TEXT || '-%')
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "avatars_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    name LIKE (auth.uid()::TEXT || '-%')
    OR public.is_admin(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    name LIKE (auth.uid()::TEXT || '-%')
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "avatars_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    name LIKE (auth.uid()::TEXT || '-%')
    OR public.is_admin(auth.uid())
  )
);

COMMIT;

-- 1. ACTUALIZAR TABLA DE PERFILES
-- Añadimos las columnas necesarias para el flujo de aprobación si no existen
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'expired')),
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- 2. ASEGURAR VALORES INICIALES PARA ADMINS EXISTENTES
-- Si el usuario es el administrador principal, lo aprobamos automáticamente
UPDATE profiles 
SET status = 'active', is_approved = TRUE 
WHERE role = 'admin';

-- 3. TRIGGER PARA CREACIÓN DE PERFILES DESDE AUTH.USERS
-- Este trigger se asegura de que cuando un usuario se registra, se cree su perfil en estado PENDIENTE
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() 
RETURNS trigger AS $$
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
    COALESCE(new.raw_user_meta_data->>'name', 'Nuevo Usuario'), 
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    COALESCE(new.raw_user_meta_data->>'status', 'pending'),
    COALESCE((new.raw_user_meta_data->>'is_approved')::boolean, false),
    COALESCE(new.raw_user_meta_data->>'timezone', 'UTC'),
    NOW(),
    NOW() + INTERVAL '1 year'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-vincular el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 4. COMENTARIO DE ÉXITO
-- Ejecuta este script en el editor SQL de Supabase para activar el flujo de aprobación.

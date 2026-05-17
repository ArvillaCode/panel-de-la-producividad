-- =========================================================================
-- SCRIPT DE ACTUALIZACIÓN DE PERFILES Y FLUJO DE APROBACIÓN
-- =========================================================================
-- Versión 2.0 - Libre de Recursión RLS (Solución a Bucle Infinito)
-- =========================================================================

-- 1. ACTUALIZAR TABLA DE PERFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'expired')),
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- 2. ASEGURAR VALORES INICIALES PARA ADMINS EXISTENTES
UPDATE public.profiles 
SET status = 'active', is_approved = TRUE 
WHERE role = 'admin' OR email = 'admin@admin.com';

-- 3. FUNCIÓN AUXILIAR PARA EVITAR RECURSIÓN INFINITA EN RLS
-- Esta función corre como SECURITY DEFINER (privilegios de sistema) para evadir bucles RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. TRIGGER PARA CREACIÓN DE PERFILES DESDE AUTH.USERS
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-vincular el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS) OPTIMIZADAS (LIBRES DE RECURSIÓN)
-- Habilitar RLS en public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas antiguas conflictivas
DROP POLICY IF EXISTS "Permitir inserción de perfil propio" ON public.profiles;
DROP POLICY IF EXISTS "Permitir lectura de perfil propio" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir lectura de perfil propio o admin" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualización de perfil propio o admin" ON public.profiles;

-- Política 1: Lectura (El propio usuario o un Administrador)
CREATE POLICY "Permitir lectura de perfil propio o admin" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Política 2: Inserción (Permitir a los usuarios insertar su propio perfil en el registro)
CREATE POLICY "Permitir inserción de perfil propio" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Política 3: Actualización (El propio usuario para editar sus datos, o un Administrador)
CREATE POLICY "Permitir actualización de perfil propio o admin" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id OR public.is_admin(auth.uid()))
WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

-- Política 4: Eliminación (Solo los Administradores)
CREATE POLICY "Admins can delete profiles" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 6. AUTOCURACIÓN (SELF-HEALING)
-- Genera los perfiles faltantes para cualquier usuario en auth.users
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
  COALESCE(u.raw_user_meta_data->>'name', 'Nuevo Usuario'), 
  COALESCE(u.raw_user_meta_data->>'role', 'user'),
  'pending',
  FALSE,
  COALESCE(u.raw_user_meta_data->>'timezone', 'UTC'),
  NOW(),
  NOW() + INTERVAL '1 year'
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Asegurar que todos los administradores sigan teniendo acceso total sin importar el estado inicial
UPDATE public.profiles 
SET status = 'active', is_approved = TRUE 
WHERE role = 'admin' OR email = 'admin@admin.com';

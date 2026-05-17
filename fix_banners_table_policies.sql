-- =========================================================================
-- SCRIPT DE CONFIGURACIÓN DE POLÍTICAS DE BASE DE DATOS PARA 'BANNERS'
-- =========================================================================
-- Instrucciones: 
-- 1. Copia todo el contenido de este archivo.
-- 2. Ve a tu panel de Supabase (https://supabase.com).
-- 3. Dirígete a la sección "SQL Editor" en el menú lateral izquierdo.
-- 4. Haz clic en "New Query", pega este código y presiona el botón "Run".
-- =========================================================================

-- 1. Asegurar que la tabla de banners en la base de datos pública tiene habilitado RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas para evitar duplicados o conflictos
DROP POLICY IF EXISTS "Permitir lectura pública de banners" ON public.banners;
DROP POLICY IF EXISTS "Permitir inserción de banners a autenticados" ON public.banners;
DROP POLICY IF EXISTS "Permitir actualización de banners a autenticados" ON public.banners;
DROP POLICY IF EXISTS "Permitir eliminación de banners a autenticados" ON public.banners;

-- 3. Crear política de lectura pública (Cualquier usuario de la web puede ver los banners)
CREATE POLICY "Permitir lectura pública de banners"
ON public.banners FOR SELECT
USING (true);

-- 4. Crear política de inserción (Permite a administradores subir nuevos banners)
CREATE POLICY "Permitir inserción de banners a autenticados"
ON public.banners FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Crear política de actualización (Permite activar/desactivar banners)
CREATE POLICY "Permitir actualización de banners a autenticados"
ON public.banners FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Crear política de eliminación (Permite a administradores borrar banners)
CREATE POLICY "Permitir eliminación de banners a autenticados"
ON public.banners FOR DELETE
TO authenticated
USING (true);

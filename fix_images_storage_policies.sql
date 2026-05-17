-- =========================================================================
-- SCRIPT DE CONFIGURACIÓN DE POLÍTICAS DE ALMACENAMIENTO PARA 'IMAGES'
-- =========================================================================
-- Instrucciones: 
-- 1. Copia todo el contenido de este archivo.
-- 2. Ve a tu panel de Supabase (https://supabase.com).
-- 3. Dirígete a la sección "SQL Editor" en el menú lateral izquierdo.
-- 4. Haz clic en "New Query", pega este código y presiona el botón "Run".
-- =========================================================================

-- 1. Asegurar que existe el bucket 'images' y es público para lectura de banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. (El sistema ya tiene habilitado RLS por defecto en las tablas de storage)


-- 3. Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Permitir lectura pública de imágenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir inserción de imágenes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de imágenes a autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de imágenes a autenticados" ON storage.objects;

-- 4. Crear Política de Lectura (Permite a cualquier persona ver las imágenes de banners)
CREATE POLICY "Permitir lectura pública de imágenes"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- 5. Crear Política de Inserción (Permite a usuarios autenticados/admins subir imágenes)
CREATE POLICY "Permitir inserción de imágenes a autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- 6. Crear Política de Actualización
CREATE POLICY "Permitir actualización de imágenes a autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- 7. Crear Política de Eliminación (Permite a admins eliminar banners antiguos)
CREATE POLICY "Permitir eliminación de imágenes a autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');

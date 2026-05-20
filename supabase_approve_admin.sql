-- =====================================================================
-- SCRIPT DE RECUPERACIÓN DE ACCESO ADMINISTRATIVO (HOTFIX MANUAL)
-- =====================================================================
-- Ejecuta este script en el "SQL Editor" de tu panel de control de Supabase.
-- Aprobará y elevará tu cuenta 'admin@admin.com' al rol de Administrador Activo.

-- 1. Actualizar el rol, estado de aprobación y estatus en la tabla de perfiles
UPDATE profiles
SET 
    role = 'admin',
    status = 'active',
    is_approved = true
WHERE email = 'admin@admin.com';

-- 2. Opcional: Si el perfil fue creado por primera vez bajo otro ID, 
-- este script garantiza que quede registrado correctamente como administrador.
SELECT * FROM profiles WHERE email = 'admin@admin.com';

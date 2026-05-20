-- SQL MIGRATION: ADD ADMIN-ONLY DRAFT STATE FOR AGENTS
-- Este script agrega de forma segura y retrocompatible la columna `admin_only` a la tabla `agents`.

-- 1. Agregar la columna con valor por defecto false
ALTER TABLE agents ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT false;

-- 2. Asegurarse de que los registros existentes tengan el valor por defecto false (en lugar de NULL)
UPDATE agents SET admin_only = false WHERE admin_only IS NULL;

-- 3. Añadir comentario explicativo para la columna
COMMENT ON COLUMN agents.admin_only IS 'Indica si este agente es solo visible y utilizable por administradores para pruebas internas.';

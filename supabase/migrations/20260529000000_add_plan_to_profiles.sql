-- Migración de Base de Datos para Upfunnel: Agregar Columna de Plan Mensual / Anual / Legacy
-- ID de Migración: 20260529000000_add_plan_to_profiles.sql

BEGIN;

-- 1. Agregar columna 'plan' a la tabla de perfiles con restricción CHECK
-- Valores permitidos: 'monthly' (mensual), 'annual' (anual) y 'legacy' (antiguo/básico). Valor por defecto: 'annual'
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'annual' CHECK (plan IN ('monthly', 'annual', 'legacy'));

-- 2. Agregar columna 'is_legacy_fallback' para marcar a los usuarios antiguos
-- Si esta bandera está en TRUE, el usuario nunca será bloqueado al expirar su suscripción y volverá a 'legacy'
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_legacy_fallback BOOLEAN DEFAULT FALSE;

-- 3. Asegurarse de que los administradores existentes tengan el plan configurado (por defecto 'annual')
UPDATE public.profiles
  SET plan = 'annual'
  WHERE plan IS NULL;

-- 4. Documentar y registrar en comentarios de Postgres para referencia técnica
COMMENT ON COLUMN public.profiles.plan IS 'Identificador del plan de suscripción contratado por el usuario (monthly, annual o legacy)';
COMMENT ON COLUMN public.profiles.is_legacy_fallback IS 'Bandera que indica si el usuario goza de reversión automática a plan legacy al expirar su suscripción premium';

COMMIT;

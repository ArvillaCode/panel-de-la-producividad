-- Migración para añadir el plan 'trial' a la tabla profiles y registrar el plan de precios
-- ID de Migración: 20260601000000_add_trial_to_profiles_constraint.sql

BEGIN;

-- 1. Eliminar la restricción check anterior en la tabla profiles
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- 2. Crear la nueva restricción que acepta 'trial'
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_plan_check 
  CHECK (plan IN ('monthly', 'annual', 'legacy', 'trial'));

-- 3. Registrar el plan trial en la tabla parametrizable de planes de precios (pricing_plans)
INSERT INTO public.pricing_plans (id, name, price, currency, billing_interval, is_active)
VALUES ('trial', 'Prueba Gratis (7 días)', 0, 'usd', 'month', TRUE)
ON CONFLICT (id) DO UPDATE 
SET price = EXCLUDED.price, name = EXCLUDED.name, is_active = EXCLUDED.is_active;

COMMIT;

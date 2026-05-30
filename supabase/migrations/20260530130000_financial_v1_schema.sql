-- Migración de Base de Datos para Upfunnel: Módulo Financiero SaaS V1
-- ID de Migración: 20260530130000_financial_v1_schema.sql

BEGIN;

-- 1. Crear tabla parametrizable de planes de precios (pricing_plans)
CREATE TABLE IF NOT EXISTS public.pricing_plans (
    id TEXT PRIMARY KEY, -- 'monthly', 'annual', 'legacy', etc.
    name TEXT NOT NULL, -- 'Plan Mensual', 'Plan Anual'
    price INTEGER NOT NULL, -- Precio en centavos (ej: 1499 = $14.99 USD)
    currency TEXT DEFAULT 'usd' NOT NULL,
    billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year', 'lifetime')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Registrar planes predeterminados iniciales
INSERT INTO public.pricing_plans (id, name, price, currency, billing_interval, is_active)
VALUES 
  ('monthly', 'Plan Mensual', 1499, 'usd', 'month', TRUE),
  ('annual', 'Plan Anual', 7999, 'usd', 'year', TRUE),
  ('legacy', 'Plan Legacy', 0, 'usd', 'lifetime', TRUE)
ON CONFLICT (id) DO UPDATE 
SET price = EXCLUDED.price, name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 1.5. Crear tabla para control de idempotencia de Stripe Webhooks (webhook_events)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL UNIQUE, -- Restricción UNIQUE para evitar duplicidad
    type TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexar stripe_event_id para búsquedas instantáneas
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON public.webhook_events(stripe_event_id);

-- 2. Crear tabla extendida de transacciones contables (payments) con las 19 columnas exactas
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL, -- Monto en centavos (ej: $14.99 = 1499)
    currency TEXT DEFAULT 'usd' NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded', 'disputed', 'pending')),
    source TEXT DEFAULT 'stripe' NOT NULL CHECK (source IN ('stripe', 'manual', 'paypal', 'mercadopago', 'hotmart', 'gohighlevel', 'historical_estimate')),
    payment_method TEXT, -- 'credit_card', 'wire_transfer', 'cash', 'transfer', etc.
    processor_payment_id TEXT UNIQUE, -- ID del cargo/pago en Stripe, PayPal, etc.
    processor_customer_id TEXT, -- ID del cliente en Stripe, etc.
    processor_event_id TEXT, -- ID del evento de webhook para control y trazabilidad
    product_name TEXT, -- Nombre del producto vendido
    plan_type TEXT REFERENCES public.pricing_plans(id) ON DELETE SET NULL, -- Referencia al plan de precios
    description TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Admin que registró si es manual
    is_estimated BOOLEAN DEFAULT FALSE NOT NULL, -- Identificar si es estimación o pago real
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL, -- Metadatos flexibles para futuras integraciones
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexación de fechas y estados para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- 3. Modificar la tabla 'system_config' para almacenar la meta mensual en centavos
ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS monthly_financial_target_cents INTEGER DEFAULT 1000000; -- Guardado en centavos ($10,000.00 USD por defecto)

COMMENT ON COLUMN public.system_config.monthly_financial_target_cents IS 'Meta de facturación bruta mensual en centavos de dólar fijada por administradores';

-- 4. Crear tabla de historial de metas financieras (Fácil implementación - CFO Value)
CREATE TABLE IF NOT EXISTS public.financial_targets_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_cents INTEGER NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.financial_targets_history IS 'Bitácora de auditoría histórica para cambios de meta financiera de facturación mensual';

-- 5. Habilitar seguridad de nivel de fila (RLS)
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_targets_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acceso Estrictas (Zero-Trust)
DROP POLICY IF EXISTS "pricing_plans_select_auth" ON public.pricing_plans;
CREATE POLICY "pricing_plans_select_auth" ON public.pricing_plans
    FOR SELECT TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "pricing_plans_all_admin" ON public.pricing_plans;
CREATE POLICY "pricing_plans_all_admin" ON public.pricing_plans
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "payments_admin_select" ON public.payments;
CREATE POLICY "payments_admin_select" ON public.payments
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
CREATE POLICY "payments_admin_all" ON public.payments
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "targets_history_admin_select" ON public.financial_targets_history;
CREATE POLICY "targets_history_admin_select" ON public.financial_targets_history
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "targets_history_admin_write" ON public.financial_targets_history;
CREATE POLICY "targets_history_admin_write" ON public.financial_targets_history
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "webhook_events_admin_select" ON public.webhook_events;
CREATE POLICY "webhook_events_admin_select" ON public.webhook_events
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

-- 7. Crear la función RPC consolidada con ARR integrado y dinámico
CREATE OR REPLACE FUNCTION public.get_financial_dashboard_stats(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    prev_start_date TIMESTAMPTZ,
    prev_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_net INTEGER;
    current_gross INTEGER;
    prev_net INTEGER;
    prev_gross INTEGER;
    active_premium_subscribers INTEGER;
    mrr_cents INTEGER;
    arr_cents INTEGER;
    target_cents INTEGER;
    result JSONB;
BEGIN
    -- Validar privilegios de administrador de forma estricta
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Acceso denegado: Privilegios de administrador requeridos';
    END IF;

    -- 1. Ingresos periodo actual (Neto = succeeded - refunded)
    -- Los refunded tienen montos positivos, por lo que se restan directamente
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0)
    INTO current_net, current_gross
    FROM public.payments
    WHERE paid_at >= start_date AND paid_at <= end_date AND is_estimated = FALSE;

    -- 2. Ingresos periodo anterior equivalente
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0)
    INTO prev_net, prev_gross
    FROM public.payments
    WHERE paid_at >= prev_start_date AND paid_at <= prev_end_date AND is_estimated = FALSE;

    -- 3. Contar miembros premium activos reales en perfiles
    SELECT COUNT(p.id)
    INTO active_premium_subscribers
    FROM public.profiles p
    WHERE p.status = 'active' AND p.plan IN ('monthly', 'annual');

    -- 4. Calcular MRR Estimado Dinámico cruzando con pricing_plans en centavos
    SELECT COALESCE(SUM(
        CASE 
            WHEN pr.billing_interval = 'month' THEN pr.price
            WHEN pr.billing_interval = 'year' THEN pr.price / 12
            ELSE 0 
        END
    ), 0)
    INTO mrr_cents
    FROM public.profiles p
    INNER JOIN public.pricing_plans pr ON p.plan = pr.id
    WHERE p.status = 'active' AND pr.is_active = TRUE;

    -- Calcular ARR dinámico en centavos (MRR * 12)
    arr_cents := mrr_cents * 12;

    -- 5. Obtener la meta financiera mensual configurada en el sistema (en centavos)
    SELECT COALESCE(monthly_financial_target_cents, 1000000)
    INTO target_cents
    FROM public.system_config
    LIMIT 1;

    -- Consolidar respuesta JSON
    result := jsonb_build_object(
        'current_net_cents', current_net,
        'current_gross_cents', current_gross,
        'prev_net_cents', prev_net,
        'prev_gross_cents', prev_gross,
        'active_premium_subscribers', active_premium_subscribers,
        'mrr_cents', mrr_cents,
        'arr_cents', arr_cents,
        'target_cents', target_cents
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_dashboard_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMIT;

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS public.system_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    site_name TEXT DEFAULT 'Panel de Administración',
    site_description TEXT DEFAULT 'Sistema de gestión administrativa',
    admin_email TEXT DEFAULT 'admin@sistema.com',
    timezone TEXT DEFAULT 'America/Mexico_City',
    language TEXT DEFAULT 'es',
    session_timeout INTEGER DEFAULT 30,
    max_login_attempts INTEGER DEFAULT 3,
    password_min_length INTEGER DEFAULT 8,
    require_strong_password BOOLEAN DEFAULT TRUE,
    enable_two_factor BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    system_alerts BOOLEAN DEFAULT TRUE,
    user_registration_notify BOOLEAN DEFAULT TRUE,
    backup_frequency TEXT DEFAULT 'daily',
    retention_days INTEGER DEFAULT 30,
    auto_backup BOOLEAN DEFAULT TRUE,
    default_theme TEXT DEFAULT 'dark',
    allow_user_theme_change BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    debug_mode BOOLEAN DEFAULT FALSE,
    log_level TEXT DEFAULT 'info',
    show_academia BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT only_one_row CHECK (id = 1)
);

-- Habilitar RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer la configuración
CREATE POLICY "Allow public read access" ON public.system_config
    FOR SELECT USING (true);

-- Política: Solo admins pueden actualizar la configuración
CREATE POLICY "Allow admin update access" ON public.system_config
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Política: Solo admins pueden insertar (aunque solo debería haber una fila)
CREATE POLICY "Allow admin insert access" ON public.system_config
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insertar configuración inicial si no existe
INSERT INTO public.system_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

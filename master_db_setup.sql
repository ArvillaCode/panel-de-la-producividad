-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES (ACTUALIZACIÓN)
ALTER TABLE IF EXISTS profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year');

-- 3. TABLA DE AUDITORÍA (SOLUCIONA REGISTRO DE HISTORIAL)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Los admins pueden ver todo
CREATE POLICY "Admins can view all logs" 
ON audit_logs FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Política: Sistema/Usuarios pueden insertar
CREATE POLICY "Anyone authenticated can insert logs" 
ON audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. TABLA DE CALIFICACIONES DE AGENTES (PERSISTENCIA)
CREATE TABLE IF NOT EXISTS agent_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, user_id)
);

-- Habilitar RLS en agent_ratings
ALTER TABLE agent_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ratings" 
ON agent_ratings FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Everyone can view ratings" 
ON agent_ratings FOR SELECT 
TO authenticated 
USING (true);

-- 5. FIX SYSTEM_CONFIG (RLS Y PERMISOS)
-- Asegurar que la tabla existe con los campos correctos
CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    site_name TEXT DEFAULT 'Panel IA',
    site_description TEXT,
    admin_email TEXT,
    timezone TEXT DEFAULT 'UTC',
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_row_only CHECK (id = 1)
);

-- Habilitar RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Borrar políticas antiguas para evitar duplicados
DROP POLICY IF EXISTS "Admins can manage system_config" ON system_config;
DROP POLICY IF EXISTS "Public can view system_config" ON system_config;

-- Crear políticas limpias
CREATE POLICY "Admins can manage system_config" 
ON system_config FOR ALL 
TO authenticated 
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' )
WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Anyone authenticated can view system_config" 
ON system_config FOR SELECT 
TO authenticated 
USING (true);

-- Insertar fila inicial si no existe
INSERT INTO system_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 6. CONFIGURACIÓN DE STORAGE (AVATARES)
-- Nota: La creación de buckets suele requerir permisos de superusuario o usar la API de Storage.
-- Estos comandos intentan configurar las políticas si el bucket ya fue creado manualmente o vía consola.
-- Si el bucket 'avatars' no existe, créalo manualmente en Supabase Dashboard primero.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket de avatares
CREATE POLICY "Avatar access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Avatar upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Avatar update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Avatar delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

-- 7. TRIGGER PARA FECHAS SaaS (RECURRENCIA ANUAL)
CREATE OR REPLACE FUNCTION set_subscription_dates()
RETURNS TRIGGER AS $$
BEGIN
    NEW.start_date := NOW();
    NEW.end_date := NOW() + INTERVAL '1 year';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_subscription ON profiles;
CREATE TRIGGER on_profile_created_subscription
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_subscription_dates();

-- 8. RPC PARA RESET DE CONTRASEÑA (REQUERIDO POR EL PANEL ADMIN)
CREATE OR REPLACE FUNCTION reset_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

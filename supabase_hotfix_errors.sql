-- =====================================================================
-- HOTFIX DE BASE DE DATOS: CORRECCIÓN DE ERRORES DE CONSULTA (ESTADO 400)
-- =====================================================================
-- Ejecuta este script en el Editor SQL de tu panel de Supabase.
-- Corrige la falta de columnas de IA y el estado de borrador en las tablas.

-- 1. Añadir la columna 'ai_model' a la tabla 'agents' si no existe
ALTER TABLE agents ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'meta-llama/llama-3-8b-instruct:free';

-- 2. Añadir la columna 'admin_only' (modo Borrador) a la tabla 'agents' si no existe
ALTER TABLE agents ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT false;

-- 3. Añadir la columna 'status' a la tabla 'agents' si no existe (para asegurar soporte y compatibilidad)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 4. Añadir columnas de IA y Asistente en 'system_config' (evita error de PostgREST 400 en AgentGuide.jsx)
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'meta-llama/llama-3-8b-instruct:free';
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS ai_assistant_enabled BOOLEAN DEFAULT true;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT 'Eres el Asistente de Upfunnel y del Panel de la Productividad. Tu misión es ser un consultor profesional que ayuda a los usuarios a encontrar la herramienta ideal en nuestro ecosistema. Ayuda al usuario a seleccionar el mejor agente del catálogo.';
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT DEFAULT 'Eres el Asistente de Upfunnel y del Panel de la Productividad. Tu misión es ser un consultor profesional que ayuda a los usuarios a encontrar la herramienta ideal en nuestro ecosistema. Ayuda al usuario a seleccionar el mejor agente del catálogo.';
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT DEFAULT '';

-- 5. Asegurar datos por defecto correctos en la configuración única
UPDATE system_config
SET 
    ai_model = COALESCE(ai_model, 'meta-llama/llama-3.1-8b-instruct:free'),
    ai_assistant_enabled = COALESCE(ai_assistant_enabled, true),
    system_prompt = COALESCE(system_prompt, 'Eres el Asistente de Upfunnel y del Panel de la Productividad. Tu misión es ser un consultor profesional que ayuda a los usuarios a encontrar la herramienta ideal en nuestro ecosistema. Ayuda al usuario a seleccionar el mejor agente del catálogo.'),
    ai_system_prompt = COALESCE(ai_system_prompt, 'Eres el Asistente de Upfunnel y del Panel de la Productividad. Tu misión es ser un consultor profesional que ayuda a los usuarios a encontrar la herramienta ideal en nuestro ecosistema. Ayuda al usuario a seleccionar el mejor agente del catálogo.')
WHERE id = 1;

-- 6. Insertar/Actualizar la configuración global con la nueva clave API de OpenRouter
INSERT INTO system_config (id, ai_model, ai_assistant_enabled, openrouter_api_key)
VALUES (1, 'meta-llama/llama-3.1-8b-instruct:free', true, 'TU_CLAVE_OPENROUTER_AQUI')
ON CONFLICT (id) DO UPDATE 
SET openrouter_api_key = 'TU_CLAVE_OPENROUTER_AQUI',
    ai_model = COALESCE(system_config.ai_model, 'meta-llama/llama-3.1-8b-instruct:free');

-- Comentarios explicativos
COMMENT ON COLUMN agents.ai_model IS 'Modelo LLM de OpenRouter configurado para este agente';
COMMENT ON COLUMN agents.admin_only IS 'Flag para ocultar el agente del público general y reservarlo para desarrollo/pruebas';
COMMENT ON COLUMN system_config.ai_assistant_enabled IS 'Indica si el chat matchmaker global está activado para el usuario final';
COMMENT ON COLUMN system_config.ai_model IS 'Modelo LLM global de OpenRouter para la guía del agente / matchmaker';

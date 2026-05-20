-- =====================================================================
-- MIGRACIÓN DE PROVEEDOR DE IA: DE GEMINI A OPENROUTER (SOPORTE MULTI-MODELO)
-- =====================================================================
--
-- Ejecuta este script en el Editor SQL de tu panel de Supabase
-- para habilitar la selección dinámica de modelos.
--

-- 1. Añadir la columna 'ai_model' a la tabla 'agents'
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'meta-llama/llama-3-8b-instruct:free';

-- 2. Añadir la columna 'ai_model' a la tabla 'system_config' para el Asistente Guía / Matchmaker
ALTER TABLE system_config 
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'meta-llama/llama-3-8b-instruct:free';

-- 3. Actualizar la fila inicial de la configuración del sistema para garantizar el valor por defecto
UPDATE system_config 
SET ai_model = COALESCE(ai_model, 'meta-llama/llama-3-8b-instruct:free')
WHERE id = 1;

COMMENT ON COLUMN agents.ai_model IS 'ID del modelo LLM de OpenRouter para este agente específico';
COMMENT ON COLUMN system_config.ai_model IS 'ID del modelo LLM global de OpenRouter para el Matchmaker / Guía';

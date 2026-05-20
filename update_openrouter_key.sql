-- =====================================================================
-- ACTUALIZACIÓN DE CLAVE API DE OPENROUTER EN SUPABASE
-- =====================================================================
-- Ejecuta este script en el Editor SQL de tu panel de Supabase
-- para sincronizar la nueva clave API de OpenRouter en la base de datos.

UPDATE system_config
SET openrouter_api_key = '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'
WHERE id = 1;

-- Script para eliminar la columna template_id de la tabla campaign_custom_variables
-- Base de datos: PostgreSQL

-- Eliminar foreign key si existe
ALTER TABLE campaign_custom_variables
DROP CONSTRAINT IF EXISTS campaign_custom_variables_template_id_foreign;

-- Eliminar índice si existe (sintaxis PostgreSQL)
DROP INDEX IF EXISTS campaign_custom_variables_template_id_index;

-- Eliminar la columna template_id
ALTER TABLE campaign_custom_variables
DROP COLUMN IF EXISTS template_id;


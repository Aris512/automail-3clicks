-- Script SQL para eliminar columnas relacionadas con variables personalizadas
-- Ejecutar este script en la base de datos PostgreSQL

-- Eliminar columna variable_values de campaigns
ALTER TABLE campaigns DROP COLUMN IF EXISTS variable_values;

-- Eliminar columna variable_values de campaign_stages
ALTER TABLE campaign_stages DROP COLUMN IF EXISTS variable_values;

-- Eliminar columna available_variables de templates
ALTER TABLE templates DROP COLUMN IF EXISTS available_variables;


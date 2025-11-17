<!-- c0f08bf0-898d-4f52-8fbb-229b1bf6a337 54ae88bd-84bb-44ea-a7e2-3abafc600b22 -->
# Refactorizar Sistema de Variables Personalizadas

## Objetivo

Refactorizar el sistema de variables personalizadas siguiendo el flujo: crear variables en campaign → agregar valores en campaign → heredar a etapas → modificar valores por etapa → asociar variables a templates desde etapas.

## Flujo de Variables Personalizadas

1. **Crear variable en Campaign**: Se crea en `custom_variables` y se asocia en `campaign_custom_variables` (sin valor inicial)
2. **Agregar valores en Campaign**: Se guardan valores en `campaign_custom_variables` donde `campaign_stage_id` es null
3. **Heredar a Etapas**: Las etapas heredan automáticamente las variables de su campaign padre
4. **Modificar valores por Etapa**: Se pueden sobrescribir valores en `campaign_custom_variables` con `campaign_stage_id` = stage.id
5. **Asociar a Template desde Etapa**: Desde la etapa se asocian variables disponibles al template mediante `template_custom_variables`

## Cambios en Base de Datos

### 1. Crear migraciones AdonisJS (node ace make:migration)

- **`custom_variables`**: id, name, description, created_at, updated_at
  - Comando: `node ace make:migration create_custom_variables_table`
  - Ubicación: `database/migrations/[timestamp]_create_custom_variables_table.ts`
  
- **`campaign_custom_variables`**: id, customVar_id, campaign_id, campaign_stage_id (nullable), valor, created_at, updated_at
  - `campaign_stage_id` null = valor a nivel campaign
  - `campaign_stage_id` con valor = valor específico de esa etapa (sobrescribe el de campaign)
  - Comando: `node ace make:migration create_campaign_custom_variables_table`
  - Ubicación: `database/migrations/[timestamp]_create_campaign_custom_variables_table.ts`
  
- **`template_custom_variables`**: id, customVar_id, template_id, created_at, updated_at
  - Comando: `node ace make:migration create_template_custom_variables_table`
  - Ubicación: `database/migrations/[timestamp]_create_template_custom_variables_table.ts`

### 2. Crear script SQL para eliminar columnas

- Script: `database/scripts/remove_variable_columns.sql`
- Eliminar columna `variable_values` de `campaigns`
- Eliminar columna `variable_values` de `campaign_stages`
- Eliminar columna `available_variables` de `templates`

## Cambios en Modelos

### 3. Crear modelo CustomVariable

- `app/models/custom_variable.ts`
- Campos: id, name, description, timestamps
- Relaciones: manyToMany con Campaign y Template

### 4. Crear modelo CampaignCustomVariable (pivote)

- `app/models/campaign_custom_variable.ts`
- Campos: id, customVarId, campaignId, campaignStageId (nullable), valor, timestamps
- Relaciones: belongsTo CustomVariable, Campaign, CampaignStage

### 5. Crear modelo TemplateCustomVariable (pivote)

- `app/models/template_custom_variable.ts`
- Campos: id, customVarId, templateId, timestamps
- Relaciones: belongsTo CustomVariable, Template

### 6. Actualizar modelo Campaign

- Eliminar campo `variableValues`
- Agregar relación manyToMany con CustomVariable a través de CampaignCustomVariable
- Método helper para obtener variables con valores

### 7. Actualizar modelo CampaignStage

- Eliminar campo `variableValues`
- Método helper para obtener variables heredadas de campaign + valores específicos de stage

### 8. Actualizar modelo Template

- Eliminar campo `availableVariables`
- Agregar relación manyToMany con CustomVariable a través de TemplateCustomVariable

## Cambios en Controladores

### 9. Actualizar CampaignsController

- `store`: Crear variables personalizadas en `custom_variables` y asociarlas en `campaign_custom_variables` con valores
- `update`: Actualizar variables y valores
- `show`: Incluir variables con valores en la respuesta
- Eliminar manejo de `variableValues` JSON

### 10. Actualizar CampaignStagesController

- `store`: No crear variables (heredan de campaign)
- `update`: Permitir actualizar valores de variables existentes en `campaign_custom_variables` con `campaign_stage_id`
- `show`: Incluir variables heredadas de campaign + valores específicos de stage
- Eliminar manejo de `variableValues` JSON

### 11. Actualizar TemplatesController

- `store`: Eliminar manejo de `availableVariables`
- `update`: Eliminar manejo de `availableVariables`
- Agregar endpoints para asociar/desasociar variables a templates mediante `template_custom_variables`

## Cambios en Servicios

### 12. Actualizar TemplateRenderService

- Modificar `getVariableValues` para:
- Obtener variables del template desde `template_custom_variables`
- Obtener valores de campaign desde `campaign_custom_variables` (donde `campaign_stage_id` es null)
- Obtener valores de stage desde `campaign_custom_variables` (donde `campaign_stage_id` = stage.id)
- Aplicar cascada: stage > campaign

## Cambios en Frontend

### 13. Actualizar formulario de Campaigns

- Agregar sección para crear/editar variables personalizadas
- Formulario para cada variable: nombre, descripción, valor
- Lista de variables con opción de editar/eliminar
- Guardar en `custom_variables` y asociar en `campaign_custom_variables`

### 14. Actualizar formulario de Campaign Stages

- Mostrar variables heredadas de campaign
- Permitir sobrescribir valores a nivel de stage
- Guardar valores en `campaign_custom_variables` con `campaign_stage_id`

### 15. Actualizar formulario de Templates

- Eliminar sección de `availableVariables`
- Agregar selector para asociar variables desde la campaign/stage relacionada
- Guardar asociaciones en `template_custom_variables`

### 16. Actualizar SimpleEditor

- Obtener variables disponibles desde el template asociado
- Mostrar botones de variables personalizadas además de las del contacto

## Archivos a Modificar

### Backend

- `app/models/campaign.ts` - Eliminar variableValues, agregar relación
- `app/models/campaign_stage.ts` - Eliminar variableValues
- `app/models/template.ts` - Eliminar availableVariables, agregar relación
- `app/models/custom_variable.ts` - Nuevo modelo
- `app/models/campaign_custom_variable.ts` - Nuevo modelo pivote
- `app/models/template_custom_variable.ts` - Nuevo modelo pivote
- `app/controllers/campaigns_controller.ts` - Manejo de variables
- `app/controllers/campaign_stages_controller.ts` - Manejo de valores de stage
- `app/controllers/templates_controller.ts` - Eliminar availableVariables
- `app/services/templatesRenderService.ts` - Nueva lógica de obtención de variables

### Frontend

- `inertia/pages/auth/etapas-plantillas.tsx` - Formularios de variables
- `inertia/components/tiptap-templates/simple/simple-editor.tsx` - Variables personalizadas

### Base de Datos

- Migraciones AdonisJS para crear tablas (node ace make:migration)
- Script SQL para eliminar columnas existentes

### To-dos

- [ ] Crear migraciones AdonisJS para tablas custom_variables, campaign_custom_variables, template_custom_variables usando `node ace make:migration`
- [ ] Crear script SQL `database/scripts/remove_variable_columns.sql` para eliminar columnas variable_values de campaigns y campaign_stages, y available_variables de templates
- [ ] Crear modelo CustomVariable con relaciones manyToMany
- [ ] Crear modelo CampaignCustomVariable (pivote) con relaciones belongsTo
- [ ] Crear modelo TemplateCustomVariable (pivote) con relaciones belongsTo
- [ ] Actualizar modelo Campaign: eliminar variableValues, agregar relación manyToMany con CustomVariable
- [ ] Actualizar modelo CampaignStage: eliminar variableValues, agregar método helper para obtener variables
- [ ] Actualizar modelo Template: eliminar availableVariables, agregar relación manyToMany con CustomVariable
- [ ] Actualizar CampaignsController: crear/actualizar variables y valores en tablas pivote
- [ ] Actualizar CampaignStagesController: manejar valores de stage en campaign_custom_variables
- [ ] Actualizar TemplatesController: eliminar availableVariables, agregar endpoints para asociar variables
- [ ] Actualizar TemplateRenderService: nueva lógica para obtener variables desde tablas pivote con cascada stage > campaign
- [ ] Actualizar formulario de Campaigns en frontend: sección para crear/editar variables personalizadas
- [ ] Actualizar formulario de Campaign Stages en frontend: mostrar variables heredadas y permitir sobrescribir valores
- [ ] Actualizar formulario de Templates en frontend: eliminar availableVariables, agregar selector de variables
- [ ] Actualizar SimpleEditor: obtener y mostrar variables personalizadas desde template asociado


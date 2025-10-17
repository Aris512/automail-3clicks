# Automail for 3Clicks - Esquemas del Proyecto

## Descripción General del Sistema

Automail for 3Clicks es una aplicación JavaScript alojada localmente que automatiza la prospección por correo electrónico en frío. El sistema envía emails personalizados de forma coordinada y temporizada, utilizando plantillas configurables en múltiples etapas. Los usuarios cargan listas de contactos (nombre:email:descripción), configuran campañas con diferentes etapas, y el sistema se encarga de enviar emails personalizados, gestionar respuestas, detectar cancelaciones de suscripción, y rastrear estadísticas básicas. Utiliza AdonisJS como framework backend y PostgreSQL como base de datos.

## Diagrama de Arquitectura

```
SISTEMA AUTOMAIL FOR 3CLICKS

Frontend (React/Inertia)
  - Autenticación y Registro
  - Gestión de Campañas (Crear, Editar, Eliminar)
  - Gestión de Dominios y Configuración SMTP
  - Gestión de Plantillas (Markdown/BBCode por Etapa)
  - Importación de Listas (Manual, API Externa)
  - Visualización de Respuestas
  - Panel de Estadísticas Básicas
  - Configuración de Palabras Clave de Cancelación

Backend (AdonisJS)
  - Auth (Guards y Middleware)
  - Controllers (Campañas, Dominios, Contactos, Respuestas)
  - Models (Lucid ORM)
  - Services (Email, Template, Stats, API Import)
  - Validators (Schemas de validación)
  - Schedulers (Cron Jobs para envío y verificación)
  - Events y Listeners (Respuestas, Bounces, Unsubscribes)

Capa de Datos
  - PostgreSQL: Todo (usuarios, campañas, contactos, plantillas, respuestas)

Conexiones Externas:
  - SMTP Propio (múltiples dominios)
  - API Externa de Proveedores de Emails (opcional, programable)
  - Email de Notificación (para alertas de respuestas)
```

## Modelo de Datos

```
PostgreSQL (Base de datos única)

tenants
  - id, name, slug (unique)
  - active, created_at, updated_at

users
  - id, email, password, notification_email
  - created_at, updated_at

tenant_user (pivot table)
  - id, tenant_id, user_id
  - role (owner/admin/member)
  - active, created_at, updated_at

email_setup
  - id, tenant_id, user_id, email, name, from,
  - active, created_at, updated_at

SMTP_config
  - user, password, host, port, protocole(insecure, ssl, tls) 
  - email_setup_id "unique"
  - isActive  


campaigns
  - id, tenant_id, user_id, domain_id, name, description
  - status (active/paused/completed), created_at, updated_at


//relacion entre list-campaigns

campaign_stages
  - id, tenant_id, campaign_id, stage_number, name
  - delay_days, delay_hours, created_at, updated_at

templates
  - id, tenant_id, stage_id, name, subject, body_markdown
  - available_variables, active, created_at, updated_at

subscribers
  - id, tenant_id, name, email, description
  - status (active/unsubscribed)
  - current_stage, last_sent_at, created_at, updated_at

list
  -id, tenant_id, name, slug, description(nullable)
  -status (active/inactive/archived)
  -created_by (con user_id, nullable)
   -created_at, updated_at

subscriber_lists
  -id, suscriber_id, list_id
  -source (manual/form/import)
  -status (active/unsubscribed)
  -created_at, updated_at
  -subscribed_at
  -status



sendings
  - id, tenant_id, contact_id, template_id, sent_at
  - sent_subject, sent_body, delivery_status
  - message_id, created_at

replies
  - id, tenant_id, contact_id, sending_id, replied_at
  - subject, body, read, notified, created_at

bounces
  - id, tenant_id, contact_id, sending_id, bounced_at
  - bounce_type, reason, created_at

unsubscribe_keywords
  - id, tenant_id, user_id, keyword, active, created_at

external_api_config
  - id, tenant_id, user_id, provider, api_url
  - api_key (encrypted), fetch_frequency_hours
  - last_fetched_at, active, created_at

campaign_stats
  - id, tenant_id, campaign_id, total_contacts, emails_sent
  - replies_received, unsubscribes, bounces
  - open_rate, reply_rate, updated_at

system_logs
  - id, tenant_id, user_id, event_type, description
  - metadata_json, created_at
```

## Flujos Principales

### Flujo de Configuración Inicial

```
Usuario → Registro (asignado a Tenant) → Agregar Dominio → Configurar SMTP (encriptado)
  → Establecer Email de Notificación → Configurar Palabras Clave Cancelación
```

### Flujo de Creación de Campaña

```
Crear Campaña (scoped to tenant) → Asociar Dominio → Definir Etapas
  → Crear Plantillas por Etapa (múltiples opciones) → Configurar Delays
  → Importar Lista de Contactos (Manual o API) → Activar Campaña
```

### Flujo de Envío Automatizado

```
Scheduler (Cron) → Buscar Contactos Pendientes (por tenant)
  → Verificar Delay desde Último Envío → Seleccionar Plantilla (Random si múltiples)
  → Personalizar Email (Variables: nombre, descripción) → Enviar vía SMTP
  → Registrar Envío → Actualizar Estado Contacto → Programar Siguiente Etapa
```

### Flujo de Gestión de Respuestas

```
Listener IMAP/POP3 → Detectar Email Entrante → Buscar message_id Original
  → Verificar Palabras Clave de Cancelación
    → Si "stop" detectado → Marcar Contacto como Unsubscribed
    → Si respuesta normal → Guardar Respuesta → Pausar Envíos Futuros
  → Enviar Notificación a Usuario → Actualizar Estadísticas
```

### Flujo de Importación desde API Externa

```
Scheduler (Configurable) → Consultar API Externa (por tenant)
  → Parsear Datos → Mapear a Formato (nombre:email:descripción)
  → Validar Emails → Agregar Nuevos Contactos a Campaña
  → Log de Importación
```

### Flujo de Gestión de Bounces

```
Listener SMTP/Bounce → Detectar Email Rebotado → Identificar Contacto
  → Clasificar Tipo de Bounce (Hard/Soft) → Actualizar Estado Contacto
  → Si Hard Bounce → Marcar como Inválido → Actualizar Estadísticas
```

## Integración con Servicios Externos

### SMTP Propio (Múltiples Dominios)

```
Automail → Selecciona Dominio de Campaña (scoped to tenant)
    ↓
Recupera Credenciales SMTP Encriptadas
    ↓
Establece Conexión SMTP (TLS/SSL)
    ↓
Autentica con smtp_user y smtp_password
    ↓
Envía Email Personalizado
    ↓
Captura message_id para tracking
    ↓
Registra estado de envío
```

### API Externa de Proveedores (Opcional)

```
Scheduler → Verifica frecuencia_consulta_horas (por tenant)
    ↓
Si es tiempo → Consulta API Externa
    ↓
Autenticación con API Key (encriptada)
    ↓
Obtiene lista de nuevos emails
    ↓
Parsea y valida datos
    ↓
Inserta en tabla contacts
    ↓
Actualiza last_fetched_at
```

### Sistema de Notificaciones

```
Evento de Respuesta → Formatea Información
    ↓
Envía Email a notification_email del Usuario
    ↓
Incluye: Campaña, Contacto, Extracto de Respuesta
    ↓
Registra notificación enviada
```

## Stack Tecnológico

**Frontend:** React con Inertia.js  
**Backend:** AdonisJS 6  
**ORM:** Lucid (integrado en AdonisJS)  
**Base de Datos:** PostgreSQL  
**Seguridad:** AdonisJS Auth, Hash, Encryption  
**Validación:** VineJS (AdonisJS validator)  
**Email:** Nodemailer (SMTP directo, múltiples dominios)  
**Plantillas:** Markdown-it o BBCode parser  
**Scheduler:** node-cron o AdonisJS Scheduler  
**Monitoreo Email:** imap-simple o mailparser para detección de respuestas  
**Estadísticas:** Cálculos en PostgreSQL con agregaciones

## Estructura de Archivos AdonisJS

```
automail-3clicks/
  app/
    controllers/
      - auth_controller.ts
      - campaigns_controller.ts
      - domains_controller.ts
      - contacts_controller.ts
      - templates_controller.ts
      - replies_controller.ts
      - stats_controller.ts
      - external_api_controller.ts
    models/
      - tenant.ts
      - user.ts
      - domain.ts
      - campaign.ts
      - campaign_stage.ts
      - template.ts
      - contact.ts
      - sending.ts
      - reply.ts
      - bounce.ts
    services/
      - email_service.ts
      - template_service.ts
      - scheduler_service.ts
      - stats_service.ts
      - api_import_service.ts
      - bounce_handler_service.ts
      - response_listener_service.ts
    validators/
      - campaign_validator.ts
      - contact_validator.ts
      - template_validator.ts
      - domain_validator.ts
    middleware/
      - auth.ts
      - tenant_scope.ts
      - campaign_access.ts
    listeners/
      - response_listener.ts
      - bounce_listener.ts
      - unsubscribe_listener.ts
  database/
    migrations/
  start/
    - routes.ts
    - kernel.ts
    - scheduler.ts
  config/
    - database.ts
    - mail.ts
    - scheduler.ts
    - app.ts
```

## Consideraciones de Seguridad

Todas las credenciales SMTP y API Keys encriptadas usando el módulo Encryption de AdonisJS. Contraseñas de usuario nunca almacenadas en texto plano. Sistema de autenticación integrado con sesiones o tokens JWT. **Tenant isolation:** Todos los queries deben incluir tenant_id para prevenir acceso cruzado entre tenants. Rate limiting para prevenir abuso del sistema de envío. Variables de entorno gestionadas con el sistema Env de AdonisJS. Validación automática con VineJS en todos los inputs. Logs de auditoría para todas las acciones críticas. Detección de palabras clave de cancelación case-insensitive. Gestión segura de message_id para tracking sin exponer información sensible.

---

**Nota:** El sistema debe implementar mecanismos de throttling para evitar ser marcado como spam. Se recomienda límites configurables de emails por hora/día por dominio. Todos los modelos deben incluir scope automático por tenant_id mediante Global Scopes en Lucid ORM para garantizar aislamiento de datos.

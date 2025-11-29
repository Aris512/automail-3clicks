/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { HttpContext } from '@adonisjs/core/http'
import RegisterController from '#controllers/register_controller'
import LoginController from '#controllers/login_controller'
import AuthController from '#controllers/auth_controller'
import { middleware } from './kernel.js'

// Importar MailController
const MailController = () => import('#controllers/mail_controller')

// Importar controladores de contactos
const SubscribersController = () => import('#controllers/subscribers_controller')
const ListsController = () => import('#controllers/lists_controller')
const SubscribersListsController = () => import('#controllers/subscribers_lists_controller')

// Importar controlador de plantillas
const TemplatesController = () => import('#controllers/templates_controller')

// Rutas de API (sin Inertia) - Deben ir ANTES de las rutas de Inertia
const EmailsController = () => import('#controllers/emails_controller')
router.post('/test-email', [EmailsController, 'sendEmail'])

// Ruta pública para suscripción desde formularios externos (sin middleware de autenticación)
router.post('/api/public/subscribe', [SubscribersController, 'publicSubscribe'])

// Ruta pública para obtener lista de subscribers (con middleware de auth opcional)
router.get('/api/public/subscribers', [SubscribersController, 'publicIndex']).use(middleware.auth())

// API para estadísticas del dashboard
router.get('/api/dashboard/stats/sendings-over-time', async ({ request, response, auth }: HttpContext) => {
  const TenantUser = (await import('#models/tenant_user')).default
  const DashboardStatsService = (await import('#services/dashboardStatsService')).default
  
  const user = auth.user!
  const tenantUser = await TenantUser.query()
    .where('userId', user.id)
    .where('active', true)
    .first()

  if (!tenantUser) {
    return response.json({
      success: false,
      message: 'Usuario no tiene acceso a ningún tenant activo',
      data: []
    })
  }

  const period = (request.qs().period as 'minute' | 'hour' | 'day' | 'week') || 'day'
  const statsService = new DashboardStatsService()
  const data = await statsService.getSendingsOverTime(tenantUser.tenantId, period)

  return response.json({
    success: true,
    data
  })
}).use(middleware.auth())

// API para envíos por campaña por período
router.get('/api/dashboard/stats/sendings-by-campaign', async ({ request, response, auth }: HttpContext) => {
  const TenantUser = (await import('#models/tenant_user')).default
  const DashboardStatsService = (await import('#services/dashboardStatsService')).default
  
  const user = auth.user!
  const tenantUser = await TenantUser.query()
    .where('userId', user.id)
    .where('active', true)
    .first()

  if (!tenantUser) {
    return response.json({
      success: false,
      message: 'Usuario no tiene acceso a ningún tenant activo',
      data: []
    })
  }

  const period = (request.qs().period as 'daily' | 'weekly' | 'monthly') || 'daily'
  const statsService = new DashboardStatsService()
  const data = await statsService.getSendingsByCampaignByPeriod(tenantUser.tenantId, period)

  return response.json({
    success: true,
    data
  })
}).use(middleware.auth())

// Página principal 
router.get('/', ({ response }: HttpContext) => {
   response.redirect('/login')
})

// Rutas de autenticación - Frontend (Inertia)
router.get('/login', [AuthController, 'showLogin'])
router.get('/register', [AuthController, 'showRegister'])

// Dashboard - Página principal después del login (protegida)
router.get('/dashboard', async ({ inertia, response, auth, session }: HttpContext) => {
  // Headers de seguridad para prevenir caché
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.header('Pragma', 'no-cache')
  response.header('Expires', '0')
  response.header('X-Frame-Options', 'DENY')
  response.header('X-Content-Type-Options', 'nosniff')
  
  // Detectar si es la primera visita al dashboard después del login
  const isFirstVisit = !session.get('dashboard_visited')
  
  // Marcar que el usuario ya visitó el dashboard
  if (isFirstVisit) {
    session.put('dashboard_visited', true)
  }

  // Obtener el tenant del usuario
  const TenantUser = (await import('#models/tenant_user')).default
  const tenantUser = await TenantUser.query()
    .where('userId', auth.user!.id)
    .where('active', true)
    .first()

  // Obtener estadísticas del dashboard
  let stats = null
  if (tenantUser) {
    const DashboardStatsService = (await import('#services/dashboardStatsService')).default
    const statsService = new DashboardStatsService()
    stats = await statsService.getDashboardStats(tenantUser.tenantId)
  }
  
  return inertia.render('auth/dashboard', {
    user: auth.user,
    isFirstVisit,
    stats
  })
}).use(middleware.auth())

// Rutas de las páginas principales del sistema (protegidas)
router.get('/campanas', ({ inertia, response, auth }: HttpContext) => {
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.header('Pragma', 'no-cache')
  response.header('Expires', '0')
  response.header('X-Frame-Options', 'DENY')
  response.header('X-Content-Type-Options', 'nosniff')
  
  return inertia.render('auth/campanas', {
    user: auth.user
  })
}).use(middleware.auth())

router.get('/etapas-plantillas', ({ inertia, response, auth }: HttpContext) => {
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.header('Pragma', 'no-cache')
  response.header('Expires', '0')
  response.header('X-Frame-Options', 'DENY')
  response.header('X-Content-Type-Options', 'nosniff')
  
  return inertia.render('auth/etapas-plantillas', {
    user: auth.user
  })
}).use(middleware.auth())

router.get('/contactos', [SubscribersController, 'index']).use(middleware.auth())

router.get('/dominios-smtp', ({ inertia, response, auth }: HttpContext) => {
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.header('Pragma', 'no-cache')
  response.header('Expires', '0')
  response.header('X-Frame-Options', 'DENY')
  response.header('X-Content-Type-Options', 'nosniff')
  
  return inertia.render('auth/dominios-smtp', {
    user: auth.user
  })
}).use(middleware.auth())

router.get('/respuestas', ({ inertia, response, auth }: HttpContext) => {
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.header('Pragma', 'no-cache')
  response.header('Expires', '0')
  response.header('X-Frame-Options', 'DENY')
  response.header('X-Content-Type-Options', 'nosniff')
  
  return inertia.render('auth/respuestas', {
    user: auth.user
  })
}).use(middleware.auth())

router.get('/bounces', ({ inertia, response, auth }: HttpContext) => {
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.header('Pragma', 'no-cache')
  response.header('Expires', '0')
  response.header('X-Frame-Options', 'DENY')
  response.header('X-Content-Type-Options', 'nosniff')
  
  return inertia.render('auth/bounces', {
    user: auth.user
  })
}).use(middleware.auth())

router.get('/cancelaciones', ({ inertia, response, auth }: HttpContext) => {
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.header('Pragma', 'no-cache')
  response.header('Expires', '0')
  response.header('X-Frame-Options', 'DENY')
  response.header('X-Content-Type-Options', 'nosniff')
  
  return inertia.render('auth/cancelaciones', {
    user: auth.user
  })
}).use(middleware.auth())

// Importar SendingsController
const SendingsController = () => import('#controllers/sendings_controller')
router.get('/envios', [SendingsController, 'index']).use(middleware.auth())

router.get('/configuracion-tenant', ({ inertia, response, auth }: HttpContext) => {
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.header('Pragma', 'no-cache')
  response.header('Expires', '0')
  response.header('X-Frame-Options', 'DENY')
  response.header('X-Content-Type-Options', 'nosniff')
  
  return inertia.render('auth/configuracion-tenant', {
    user: auth.user
  })
}).use(middleware.auth())

// Rutas de autenticación - Backend (API)
router.post('/login', [LoginController, 'login'])
router.post('/logout', [LoginController, 'logout'])
router.post('/register', [RegisterController, 'register'])

// Rutas de correo electrónico (protegidas)
router.post('/send-email', [EmailsController, 'sendEmail']).use(middleware.auth())

// Importar SmtpConfigsController
const SmtpConfigsController = () => import('#controllers/smtp_configs_controller')

// Rutas para configuración SMTP
router.post('/smtp-config', [SmtpConfigsController, 'store']).use(middleware.auth())
router.get('/smtp-config', [SmtpConfigsController, 'show']).use(middleware.auth())
router.put('/smtp-config/:id', [SmtpConfigsController, 'update']).use(middleware.auth())
router.delete('/smtp-config/:id', [SmtpConfigsController, 'destroy']).use(middleware.auth())
router.put('/smtp-config/:id/activate', [SmtpConfigsController, 'activate']).use(middleware.auth())

// Rutas para envío de correos
router.post('/send-mail', [MailController, 'send']).use(middleware.auth())

// Rutas para contactos (subscribers)
router.get('/subscribers', [SubscribersController, 'index']).use(middleware.auth())
router.post('/subscribers', [SubscribersController, 'store']).use(middleware.auth())
router.put('/subscribers/:id', [SubscribersController, 'update']).use(middleware.auth())
router.delete('/subscribers/:id', [SubscribersController, 'destroy']).use(middleware.auth())
router.post('/subscribers/import', [SubscribersController, 'import']).use(middleware.auth())

// Rutas para listas
router.get('/lists', [ListsController, 'index']).use(middleware.auth())
router.post('/lists', [ListsController, 'store']).use(middleware.auth())
router.get('/lists/:id', [ListsController, 'show']).use(middleware.auth())
router.put('/lists/:id', [ListsController, 'update']).use(middleware.auth())
router.delete('/lists/:id', [ListsController, 'destroy']).use(middleware.auth())
router.get('/lists/:id/subscribers', [ListsController, 'subscribers']).use(middleware.auth())

// Rutas para relaciones contacto-lista
router.get('/subscribers-lists', [SubscribersListsController, 'index']).use(middleware.auth())
router.post('/subscribers-lists', [SubscribersListsController, 'store']).use(middleware.auth())
router.get('/subscribers-lists/:id', [SubscribersListsController, 'show']).use(middleware.auth())
router.put('/subscribers-lists/:id', [SubscribersListsController, 'update']).use(middleware.auth())
router.delete('/subscribers-lists/:id', [SubscribersListsController, 'destroy']).use(middleware.auth())
router.post('/subscribers-lists/add-to-lists', [SubscribersListsController, 'addToLists']).use(middleware.auth())
router.post('/subscribers-lists/remove-from-lists', [SubscribersListsController, 'removeFromLists']).use(middleware.auth())

// Rutas para plantillas
router.get('/templates', [TemplatesController, 'index']).use(middleware.auth())
router.post('/templates', [TemplatesController, 'store']).use(middleware.auth())
router.get('/templates/:id', [TemplatesController, 'show']).use(middleware.auth())
router.put('/templates/:id', [TemplatesController, 'update']).use(middleware.auth())
router.delete('/templates/:id', [TemplatesController, 'destroy']).use(middleware.auth())

// Rutas para envíos (sendings)
router.get('/sendings', [SendingsController, 'index']).use(middleware.auth())
router.post('/sendings', [SendingsController, 'store']).use(middleware.auth())
router.get('/sendings/:id', [SendingsController, 'show']).use(middleware.auth())
router.put('/sendings/:id', [SendingsController, 'update']).use(middleware.auth())
router.delete('/sendings/:id', [SendingsController, 'destroy']).use(middleware.auth())

// Rutas para email setups
const EmailSetupsController = () => import('#controllers/email_setups_controller')
router.get('/email-setups', [EmailSetupsController, 'index']).use(middleware.auth())

// Rutas para campañas
const CampaignsController = () => import('#controllers/campaigns_controller')
router.get('/campaigns', [CampaignsController, 'index']).use(middleware.auth())
router.post('/campaigns', [CampaignsController, 'store']).use(middleware.auth())
router.get('/campaigns/:id', [CampaignsController, 'show']).use(middleware.auth())
router.put('/campaigns/:id', [CampaignsController, 'update']).use(middleware.auth())
router.delete('/campaigns/:id', [CampaignsController, 'destroy']).use(middleware.auth())
router.get('/campaigns/custom-variables/all', [CampaignsController, 'getCustomVariables']).use(middleware.auth())
router.post('/campaigns/custom-variables', [CampaignsController, 'createCustomVariable']).use(middleware.auth())
router.put('/campaigns/custom-variables/:id', [CampaignsController, 'updateCustomVariable']).use(middleware.auth())
router.delete('/campaigns/custom-variables/:id', [CampaignsController, 'deleteCustomVariable']).use(middleware.auth())

// Rutas para relaciones campaña-lista
const CampaignListsController = () => import('#controllers/campaign_lists_controller')
router.get('/campaign-lists', [CampaignListsController, 'index']).use(middleware.auth())
router.get('/campaigns/:campaignId/lists', [CampaignListsController, 'getCampaignLists']).use(middleware.auth())
router.post('/campaign-lists', [CampaignListsController, 'store']).use(middleware.auth())
router.delete('/campaign-lists/:id', [CampaignListsController, 'destroy']).use(middleware.auth())
router.post('/campaign-lists/remove-relation', [CampaignListsController, 'removeRelation']).use(middleware.auth())

// Rutas para etapas de campaña
const CampaignStagesController = () => import('#controllers/campaign_stages_controller')
router.get('/campaign-stages', [CampaignStagesController, 'index']).use(middleware.auth())
router.get('/campaign-stages/with-templates', [CampaignStagesController, 'indexWithTemplates']).use(middleware.auth())
router.get('/campaigns/:campaignId/stages', [CampaignStagesController, 'index']).use(middleware.auth())
router.post('/campaigns/:campaignId/stages', [CampaignStagesController, 'store']).use(middleware.auth())
router.post('/campaign-stages', [CampaignStagesController, 'store']).use(middleware.auth())
router.get('/campaign-stages/:id', [CampaignStagesController, 'show']).use(middleware.auth())
router.put('/campaign-stages/:id', [CampaignStagesController, 'update']).use(middleware.auth())
router.delete('/campaign-stages/:id', [CampaignStagesController, 'destroy']).use(middleware.auth())
router.get('/campaign-stages/:id/templates', [CampaignStagesController, 'getTemplates']).use(middleware.auth())
router.post('/campaign-stages/:id/templates', [CampaignStagesController, 'associateTemplate']).use(middleware.auth())
router.delete('/campaign-stages/:id/templates', [CampaignStagesController, 'dissociateTemplate']).use(middleware.auth())

// Rutas para attachments
const AttachmentsController = () => import('#controllers/attachments_controller')
router.post('/attachments', [AttachmentsController, 'store']).use(middleware.auth())
router.post('/attachments/temp', [AttachmentsController, 'storeTemp']).use(middleware.auth())

// Rutas del dashboard de QueueDash para monitorear colas de trabajos
// IMPORTANTE: Debe ir ANTES de otras rutas para que las rutas tRPC funcionen
router.jobs('/admin/queue').use(middleware.auth())

// Ruta para servir archivos temporales
router.get('/uploads/temp/:tenantId/:fileName', async ({ params, response }: HttpContext) => {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  const { tenantId, fileName } = params
  let filePath = path.join(process.cwd(), 'public', 'uploads', 'temp', tenantId, fileName)
  
  try {
    // Verificar que el path existe
    const stats = await fs.stat(filePath)
    
    // Si es un directorio, buscar el archivo dentro de él (esto puede pasar con file.move en Windows)
    if (stats.isDirectory()) {
      // Buscar archivos dentro del directorio
      const files = await fs.readdir(filePath)
      if (files.length > 0) {
        // Tomar el primer archivo encontrado dentro del directorio
        filePath = path.join(filePath, files[0])
      } else {
        return response.status(404).json({
          success: false,
          message: 'Directorio vacío'
        })
      }
    }
    
    // Verificar que ahora es un archivo
    const fileStats = await fs.stat(filePath)
    if (!fileStats.isFile()) {
      return response.status(404).json({
        success: false,
        message: 'No es un archivo válido'
      })
    }
    
    // Determinar Content-Type basado en la extensión original
    const ext = path.extname(fileName).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'
    
    // Leer el archivo y enviarlo
    const fileBuffer = await fs.readFile(filePath)
    
    response.header('Content-Type', contentType)
    response.header('Content-Length', fileStats.size.toString())
    response.header('Cache-Control', 'public, max-age=31536000')
    
    return response.send(fileBuffer)
  } catch (error: any) {
    console.error('[SERVE TEMP FILE] Error:', error.message)
    console.error('[SERVE TEMP FILE] Path intentado:', filePath)
    return response.status(404).json({
      success: false,
      message: 'Archivo no encontrado'
    })
  }
}).use(middleware.auth())

// Ruta para servir archivos de attachments (públicos para que funcionen en correos)
router.get('/uploads/attachments/:tenantId/:fileName', async ({ params, response }: HttpContext) => {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  const { tenantId, fileName } = params
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'attachments', tenantId, fileName)
  
  try {
    // Verificar que el archivo existe
    const fileStats = await fs.stat(filePath)
    if (!fileStats.isFile()) {
      return response.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      })
    }
    
    // Determinar Content-Type basado en la extensión
    const ext = path.extname(fileName).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.rar': 'application/x-rar-compressed',
      '.zip': 'application/zip',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'
    
    // Leer el archivo y enviarlo
    const fileBuffer = await fs.readFile(filePath)
    
    // Headers para permitir que se carguen en correos
    response.header('Content-Type', contentType)
    response.header('Content-Length', fileStats.size.toString())
    response.header('Cache-Control', 'public, max-age=31536000')
    response.header('Access-Control-Allow-Origin', '*') // Permitir CORS para correos
    
    return response.send(fileBuffer)
  } catch (error: any) {
    console.error('[SERVE ATTACHMENT FILE] Error:', error.message)
    console.error('[SERVE ATTACHMENT FILE] Path intentado:', filePath)
    return response.status(404).json({
      success: false,
      message: 'Archivo no encontrado'
    })
  }
}) // ⚠️ IMPORTANTE: NO usar middleware.auth() aquí para que sea accesible desde correos


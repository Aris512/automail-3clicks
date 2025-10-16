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

// Rutas de API (sin Inertia) - Deben ir ANTES de las rutas de Inertia
const EmailsController = () => import('#controllers/emails_controller')
router.post('/test-email', [EmailsController, 'sendEmail'])

// Página principal 
router.get('/', ({ response }: HttpContext) => {
   response.redirect('/login')
})

// Rutas de autenticación - Frontend (Inertia)
router.get('/login', [AuthController, 'showLogin'])
router.get('/register', [AuthController, 'showRegister'])

// Dashboard - Página principal después del login (protegida)
router.get('/dashboard', ({ inertia, response, auth, session }: HttpContext) => {
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
  
  return inertia.render('auth/dashboard', {
    user: auth.user,
    isFirstVisit
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

router.get('/contactos', ({ inertia, response, auth }: HttpContext) => {
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.header('Pragma', 'no-cache')
  response.header('Expires', '0')
  response.header('X-Frame-Options', 'DENY')
  response.header('X-Content-Type-Options', 'nosniff')
  
  return inertia.render('auth/contactos', {
    user: auth.user
  })
}).use(middleware.auth())

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
router.delete('/smtp-config/:id', [SmtpConfigsController, 'destroy']).use(middleware.auth())
router.put('/smtp-config/:id/activate', [SmtpConfigsController, 'activate']).use(middleware.auth())

// Rutas para envío de correos
router.post('/send-mail', [MailController, 'send']).use(middleware.auth())


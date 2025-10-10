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

// Página principal 
router.get('/', ({ response }: HttpContext) => {
   response.redirect('/login')
})

// Rutas de autenticación - Frontend (Inertia)
router.get('/login', [AuthController, 'showLogin'])
router.get('/register', [AuthController, 'showRegister'])

// Dashboard - Página principal después del login (protegida)
router.get('/dashboard', ({ inertia, response }: HttpContext) => {
  // Headers de seguridad para prevenir caché
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.header('Pragma', 'no-cache')
  response.header('Expires', '0')
  response.header('X-Frame-Options', 'DENY')
  response.header('X-Content-Type-Options', 'nosniff')
  
  return inertia.render('auth/dashboard')
}).use(middleware.auth())

// Rutas de autenticación - Backend (API)
router.post('/login', [LoginController, 'login'])
router.post('/logout', [LoginController, 'logout'])
router.post('/register', [RegisterController, 'register'])


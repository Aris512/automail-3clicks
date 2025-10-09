/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import RegisterController from '#controllers/register_controller'
import LoginController from '#controllers/login_controller'
import AuthController from '#controllers/auth_controller'

// Página principal
router.on('/').renderInertia('home')

// Rutas de autenticación - Frontend (Inertia)
router.get('/login', [AuthController, 'showLogin'])
router.get('/register', [AuthController, 'showRegister'])

// Rutas de autenticación - Backend (API)
router.post('/login', [LoginController, 'login'])
router.post('/logout', [LoginController, 'logout'])
router.post('/register', [RegisterController, 'register'])


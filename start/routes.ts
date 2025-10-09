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

router.on('/').renderInertia('home')
router.get('/login', async ({ view }) => view.render('auth/login'))
router.post('/login', [LoginController, 'login'])
router.post('/logout', [LoginController, 'logout'])

router.get('/register', async ({ view }) => view.render('auth/register'))
router.post('/register', [RegisterController, 'register'])
router.on('/').renderInertia('home')


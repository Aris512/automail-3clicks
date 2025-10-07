/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

// Rutas públicas
router.get('/', async ({ response }) => {
  return response.redirect('/login')
})

// Rutas de autenticación
router.get('/register', '#controllers/auth_controller.showRegister')
router.post('/register', '#controllers/auth_controller.register')
router.get('/login', '#controllers/auth_controller.showLogin')
router.post('/login', '#controllers/auth_controller.login')
router.post('/logout', '#controllers/auth_controller.logout')

// Rutas protegidas (requieren autenticación)
// Dashboard
router.get('/dashboard', async ({ response }) => {
  try {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const html = readFileSync(join(process.cwd(), 'resources/views/dashboard.html'), 'utf-8')
    return response.type('text/html').send(html)
  } catch (error) {
    return response.status(404).send('Página no encontrada')
  }
})

// Rutas de usuarios
router.get('/users', '#controllers/user_controller.index')
router.get('/users/create', '#controllers/user_controller.create')
router.post('/users', '#controllers/user_controller.store')
router.get('/users/:id', '#controllers/user_controller.show')
router.get('/users/:id/edit', '#controllers/user_controller.edit')
router.put('/users/:id', '#controllers/user_controller.update')
router.delete('/users/:id', '#controllers/user_controller.destroy')

// Rutas de tenants
router.get('/tenants', '#controllers/tenant_controller.index')
router.get('/tenants/create', '#controllers/tenant_controller.create')
router.post('/tenants', '#controllers/tenant_controller.store')
router.get('/tenants/:id', '#controllers/tenant_controller.show')
router.get('/tenants/:id/edit', '#controllers/tenant_controller.edit')
router.put('/tenants/:id', '#controllers/tenant_controller.update')
router.delete('/tenants/:id', '#controllers/tenant_controller.destroy')

// Rutas de relación tenant-user
router.get('/tenants/:tenantId/users', '#controllers/tenant_user_controller.index')
router.post('/tenants/:tenantId/users', '#controllers/tenant_user_controller.store')
router.put('/tenants/:tenantId/users/:userId', '#controllers/tenant_user_controller.update')
router.delete('/tenants/:tenantId/users/:userId', '#controllers/tenant_user_controller.destroy')

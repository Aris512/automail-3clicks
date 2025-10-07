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
router.get('/', async () => 'It works!')

// Rutas de autenticación
router.get('/register', 'AuthController.showRegister')
router.post('/register', 'AuthController.register')
router.get('/login', 'AuthController.showLogin')
router.post('/login', 'AuthController.login')
router.post('/logout', 'AuthController.logout')

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
router.get('/users', 'UserController.index')
router.get('/users/create', 'UserController.create')
router.post('/users', 'UserController.store')
router.get('/users/:id', 'UserController.show')
router.get('/users/:id/edit', 'UserController.edit')
router.put('/users/:id', 'UserController.update')
router.delete('/users/:id', 'UserController.destroy')

// Rutas de tenants
router.get('/tenants', 'TenantController.index')
router.get('/tenants/create', 'TenantController.create')
router.post('/tenants', 'TenantController.store')
router.get('/tenants/:id', 'TenantController.show')
router.get('/tenants/:id/edit', 'TenantController.edit')
router.put('/tenants/:id', 'TenantController.update')
router.delete('/tenants/:id', 'TenantController.destroy')

// Rutas de relación tenant-user
router.get('/tenants/:tenantId/users', 'TenantUserController.index')
router.post('/tenants/:tenantId/users', 'TenantUserController.store')
router.put('/tenants/:tenantId/users/:userId', 'TenantUserController.update')
router.delete('/tenants/:tenantId/users/:userId', 'TenantUserController.destroy')

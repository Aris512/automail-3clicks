import Tenant from '#models/tenant'
import TenantUser from '#models/tenant_user'
import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'
import logger from '@adonisjs/core/services/logger'

export default class RegisterController {
  public async register({ request, response, auth }: HttpContext) {
    const data = request.only(['email', 'password', 'organization_name'])

    // 🔍 DEBUG: Log de datos recibidos
    logger.info(' REGISTER ATTEMPT:', {
      email: data.email,
      organizationName: data.organization_name,
      passwordLength: data.password?.length || 0,
      timestamp: new Date().toISOString(),
      userAgent: request.header('user-agent'),
      ip: request.ip()
    })

    try {
      // 🔍 DEBUG: Creando usuario
      logger.info(' CREATING USER...')
      const user = await User.create({
        email: data.email,
        password: data.password,
      })

      logger.info(' USER CREATED:', {
        userId: user.id,
        email: user.email,
        createdAt: user.createdAt?.toISO(),
        timestamp: new Date().toISOString()
      })

      // 🔍 DEBUG: Creando tenant
      const slug = data.organization_name.toLowerCase().replace(/\s+/g, '-') + '-' + cuid().substring(0, 5)
      logger.info(' CREATING TENANT...', { slug })
      
      const tenant = await Tenant.create({
        name: data.organization_name,
        slug: slug,
      })

      logger.info(' TENANT CREATED:', {
        tenantId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        createdAt: tenant.createdAt?.toISO(),
        timestamp: new Date().toISOString()
      })

      // 🔍 DEBUG: Creando relación tenant-user
      logger.info(' CREATING TENANT-USER RELATION...')
      const tenantUser = await TenantUser.create({
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      })

      logger.info(' TENANT-USER CREATED:', {
        tenantUserId: tenantUser.id,
        tenantId: tenantUser.tenantId,
        userId: tenantUser.userId,
        role: tenantUser.role,
        createdAt: tenantUser.createdAt?.toISO(),
        timestamp: new Date().toISOString()
      })

      // 🔍 DEBUG: Login automático
      logger.info(' AUTO-LOGIN USER...')
      await auth.use('web').login(user)

      logger.info(' REGISTRATION SUCCESS:', {
        userId: user.id,
        tenantId: tenant.id,
        email: user.email,
        organizationName: data.organization_name,
        timestamp: new Date().toISOString()
      })

      return response.redirect('/dashboard')
    } catch (error) {
      // 🔍 DEBUG: Log de error
      logger.error(' REGISTRATION ERROR:', {
        email: data.email,
        organizationName: data.organization_name,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })

      return response.badRequest('Error al crear la cuenta')
    }
  }
}

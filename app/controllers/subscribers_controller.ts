import type { HttpContext } from '@adonisjs/core/http'
import Subscriber from '#models/subscriber'
import TenantUser from '#models/tenant_user'
import { inject } from '@adonisjs/core'

@inject()
export default class SubscribersController {
  /**
   * Display una lista de contactos
   */
  async index({ auth, inertia }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return inertia.render('auth/contactos', {
        user: auth.user,
        subscribers: []
      })
    }

    const subscribers = await Subscriber.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('createdAt', 'desc')
    
    return inertia.render('auth/contactos', {
      user: auth.user,
      subscribers
    })
  }

  /**
   * Display form para crear un nuevo contacto
   */
  async create({ auth, inertia }: HttpContext) {
    return inertia.render('auth/subscribers/create', {
      user: auth.user
    })
  }

  /**
   * Handle form para crear un nuevo contacto
   */
  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const data = request.only(['email', 'name', 'description', 'status'])
    
    await Subscriber.create({
      ...data,
      tenantId: tenantUser.tenantId
    })
    
    return response.redirect().back()
  }

  /**
   * Mostrar un contacto individual
   */
  async show({ params, auth, inertia, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscriber = await Subscriber.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    return inertia.render('auth/subscribers/show', {
      user: auth.user,
      subscriber
    })
  }

  /**
   * Editar un contacto individual
   */
  async edit({ params, auth, inertia, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscriber = await Subscriber.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    return inertia.render('auth/subscribers/edit', {
      user: auth.user,
      subscriber
    })
  }

  /**
   * Handle form para editar un contacto
   */
  async update({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscriber = await Subscriber.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    const data = request.only(['email', 'name', 'description', 'status'])
    
    subscriber.merge(data)
    await subscriber.save()
    
    return response.redirect().back()
  }

  /**
   * Eliminar un contacto
   */
  async destroy({ params, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscriber = await Subscriber.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    await subscriber.delete()
    
    return response.redirect().back()
  }

  /**
   * Importar contactos desde CSV
   */
  async import({ response }: HttpContext) {
    // TODO: Implement CSV import functionality
    return response.json({ message: 'Import functionality will be implemented' })
  }

  /**
   * Exportar contactos a CSV
   */
  async export({ response }: HttpContext) {
    // TODO: Implement CSV export functionality
    return response.json({ message: 'Export functionality will be implemented' })
  }
}
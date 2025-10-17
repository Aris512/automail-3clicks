import type { HttpContext } from '@adonisjs/core/http'
import List from '#models/list'
import TenantUser from '#models/tenant_user'
import { inject } from '@adonisjs/core'

@inject()
export default class ListsController {
  /**
   * Display una lista de listas
   */
  async index({ auth, inertia }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return inertia.render('auth/lists/index', {
        user: auth.user,
        lists: []
      })
    }

    const lists = await List.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('createdAt', 'desc')
    
    return inertia.render('auth/lists/index', {
      user: auth.user,
      lists
    })
  }

  /**
   * Display form para crear una nueva lista
   */
  async create({ auth, inertia }: HttpContext) {
    return inertia.render('auth/lists/create', {
      user: auth.user
    })
  }

  /**
   * Handle form para crear una nueva lista
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

    const data = request.only(['name', 'slug', 'description', 'status'])
    
    await List.create({
      ...data,
      tenantId: tenantUser.tenantId
    })
    
    return response.redirect().back()
  }

  /**
   * Mostrar una lista individual
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

    const list = await List.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    return inertia.render('auth/lists/show', {
      user: auth.user,
      list
    })
  }

  /**
   * Editar una lista individual
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

    const list = await List.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    return inertia.render('auth/lists/edit', {
      user: auth.user,
      list
    })
  }

  /**
   * Handle form para editar una lista
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

    const list = await List.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    const data = request.only(['name', 'slug', 'description', 'status'])
    
    list.merge(data)
    await list.save()
    
    return response.redirect().back()
  }

  /**
   * Eliminar una lista
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

    const list = await List.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    await list.delete()
    
    return response.redirect().back()
  }

  /**
   * Obtener contactos de una lista específica
   */
  async subscribers({ params, auth, inertia, response }: HttpContext) {
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

    const list = await List.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    const subscribers = await list.related('subscribers').query()
    
    return inertia.render('auth/lists/subscribers', {
      user: auth.user,
      list,
      subscribers
    })
  }
}
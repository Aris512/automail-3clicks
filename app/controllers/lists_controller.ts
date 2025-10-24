import type { HttpContext } from '@adonisjs/core/http'
import List from '#models/list'
import TenantUser from '#models/tenant_user'
import { inject } from '@adonisjs/core'

@inject()
export default class ListsController {
  /**
   * Display una lista de listas
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
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

    const lists = await List.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('createdAt', 'desc')
    
    return response.json({
      success: true,
      data: lists
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
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const data = request.only(['name', 'description', 'status', 'is_activated'])
    
    // Validaciones básicas
    if (!data.name || !data.name.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la lista es requerido'
      })
    }

    // Obtener el tenant para generar slug basado en él
    const tenant = await tenantUser.related('tenant').query().first()
    if (!tenant) {
      return response.status(400).json({
        success: false,
        message: 'No se pudo obtener información del tenant'
      })
    }

    // Generar slug automáticamente basado solo en el tenant
    const finalSlug = tenant.slug

    try {
      // Si se está activando esta lista, desactivar todas las demás del tenant
      if (data.is_activated) {
        await List.query()
          .where('tenantId', tenantUser.tenantId)
          .where('isActivated', true)
          .update({ isActivated: false })
      }

      const list = await List.create({
        name: data.name.trim(),
        slug: finalSlug,
        description: data.description?.trim() || '',
        status: data.status || 'active',
        isActivated: data.is_activated || false,
        tenantId: tenantUser.tenantId
      })

      return response.status(201).json({
        success: true,
        message: 'Lista creada exitosamente',
        data: list
      })
    } catch (error) {
      console.error('Error al crear lista:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear la lista'
      })
    }
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
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const list = await List.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    const data = request.only(['name', 'description', 'status', 'is_activated'])
    
    // Validaciones básicas
    if (!data.name || !data.name.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la lista es requerido'
      })
    }

    // Obtener el tenant para generar slug basado en él
    const tenant = await tenantUser.related('tenant').query().first()
    if (!tenant) {
      return response.status(400).json({
        success: false,
        message: 'No se pudo obtener información del tenant'
      })
    }

    // Generar slug automáticamente basado solo en el tenant
    const finalSlug = tenant.slug

    try {
      // Si se está activando esta lista, desactivar todas las demás del tenant
      if (data.is_activated && !list.isActivated) {
        await List.query()
          .where('tenantId', tenantUser.tenantId)
          .where('isActivated', true)
          .where('id', '!=', params.id)
          .update({ isActivated: false })
      }

      list.merge({
        name: data.name.trim(),
        slug: finalSlug,
        description: data.description?.trim() || '',
        status: data.status || 'active',
        isActivated: data.is_activated !== undefined ? data.is_activated : list.isActivated
      })
      await list.save()

      return response.status(200).json({
        success: true,
        message: 'Lista actualizada exitosamente',
        data: list
      })
    } catch (error) {
      console.error('Error al actualizar lista:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar la lista'
      })
    }
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
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    try {
      const list = await List.query()
        .where('id', params.id)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()
      
      await list.delete()
      
      return response.status(200).json({
        success: true,
        message: 'Lista eliminada exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar lista:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar la lista'
      })
    }
  }

  /**
   * Activar/Desactivar una lista (toggle)
   */
  async toggleActivation({ params, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    try {
      const list = await List.query()
        .where('id', params.id)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()

      // Si se está activando esta lista, desactivar todas las demás del tenant
      if (!list.isActivated) {
        await List.query()
          .where('tenantId', tenantUser.tenantId)
          .where('isActivated', true)
          .where('id', '!=', params.id)
          .update({ isActivated: false })
      }

      // Toggle del estado de activación
      list.isActivated = !list.isActivated
      await list.save()

      return response.status(200).json({
        success: true,
        message: list.isActivated ? 'Lista activada como predeterminada' : 'Lista desactivada',
        data: list
      })
    } catch (error) {
      console.error('Error al cambiar estado de activación:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al cambiar el estado de activación'
      })
    }
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
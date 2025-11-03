import type { HttpContext } from '@adonisjs/core/http'
import Campaign from '#models/campaign'
import TenantUser from '#models/tenant_user'
import { inject } from '@adonisjs/core'

@inject()
export default class CampaignsController {
  /**
   * Obtener todas las campañas del tenant del usuario
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

    const campaigns = await Campaign.query()
      .where('tenantId', tenantUser.tenantId)
      .preload('user')
      .preload('campaignStages')
      .orderBy('createdAt', 'desc')
    
    return response.json({
      success: true,
      data: campaigns
    })
  }

  /**
   * Crear una nueva campaña
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

    const data = request.only(['name', 'description', 'status'])
    
    // Validaciones básicas
    if (!data.name || !data.name.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la campaña es requerido'
      })
    }

    // Validar que el status sea válido
    if (data.status && !['active', 'paused', 'completed'].includes(data.status)) {
      return response.status(400).json({
        success: false,
        message: 'El estado debe ser: active, paused o completed'
      })
    }

    try {
      const campaign = await Campaign.create({
        tenantId: tenantUser.tenantId,
        userId: user.id,
        name: data.name.trim(),
        description: data.description?.trim(),
        status: data.status || 'active'
      })

      return response.status(201).json({
        success: true,
        message: 'Campaña creada exitosamente',
        data: campaign
      })
    } catch (error) {
      console.error('Error al crear campaña:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear la campaña',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Obtener una campaña específica
   */
  async show({ params, response, auth }: HttpContext) {
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

    const campaign = await Campaign.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .preload('user')
      .preload('campaignStages')
      .first()

    if (!campaign) {
      return response.status(404).json({
        success: false,
        message: 'Campaña no encontrada'
      })
    }

    return response.json({
      success: true,
      data: campaign
    })
  }

  /**
   * Actualizar una campaña
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

    const campaign = await Campaign.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!campaign) {
      return response.status(404).json({
        success: false,
        message: 'Campaña no encontrada'
      })
    }

    const data = request.only(['name', 'description', 'status'])
    
    // Validaciones básicas
    if (data.name !== undefined && (!data.name || !data.name.trim())) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la campaña no puede estar vacío'
      })
    }

    // Validar que el status sea válido
    if (data.status && !['active', 'paused', 'completed'].includes(data.status)) {
      return response.status(400).json({
        success: false,
        message: 'El estado debe ser: active, paused o completed'
      })
    }

    try {
      campaign.merge({
        name: data.name?.trim(),
        description: data.description?.trim(),
        status: data.status
      })
      await campaign.save()

      return response.json({
        success: true,
        message: 'Campaña actualizada exitosamente',
        data: campaign
      })
    } catch (error) {
      console.error('Error al actualizar campaña:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar la campaña',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Eliminar una campaña
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
      const campaign = await Campaign.query()
        .where('id', params.id)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()
      
      await campaign.delete()
      
      return response.json({
        success: true,
        message: 'Campaña eliminada exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar campaña:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar la campaña',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

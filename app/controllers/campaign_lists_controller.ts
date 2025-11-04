import type { HttpContext } from '@adonisjs/core/http'
import CampaignList from '#models/campaign_list'
import Campaign from '#models/campaign'
import List from '#models/list'
import TenantUser from '#models/tenant_user'
import { inject } from '@adonisjs/core'

@inject()
export default class CampaignListsController {
  /**
   * Obtener todas las relaciones campaña-lista del tenant del usuario
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

    // Obtener todas las campañas del tenant
    const campaigns = await Campaign.query()
      .where('tenantId', tenantUser.tenantId)
      .select('id')

    const campaignIds = campaigns.map(c => c.id)

    const campaignLists = await CampaignList.query()
      .whereIn('campaignId', campaignIds)
      .preload('campaign')
      .preload('list')
      .orderBy('createdAt', 'desc')
    
    return response.json({
      success: true,
      data: campaignLists
    })
  }

  /**
   * Obtener las listas asociadas a una campaña específica
   */
  async getCampaignLists({ params, response, auth }: HttpContext) {
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

    // Verificar que la campaña pertenezca al tenant
    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!campaign) {
      return response.status(404).json({
        success: false,
        message: 'Campaña no encontrada'
      })
    }

    const campaignLists = await CampaignList.query()
      .where('campaignId', params.campaignId)
      .preload('list')
      .orderBy('createdAt', 'desc')
    
    return response.json({
      success: true,
      data: campaignLists
    })
  }

  /**
   * Crear una relación entre una campaña y una lista
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

    const { campaignId, listId } = request.only(['campaignId', 'listId'])
    
    // Validaciones básicas
    if (!campaignId || !listId) {
      return response.status(400).json({
        success: false,
        message: 'campaignId y listId son requeridos'
      })
    }

    // Verificar que la campaña pertenezca al tenant
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!campaign) {
      return response.status(404).json({
        success: false,
        message: 'Campaña no encontrada o no pertenece a tu tenant'
      })
    }

    // Verificar que la lista pertenezca al tenant
    const list = await List.query()
      .where('id', listId)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!list) {
      return response.status(404).json({
        success: false,
        message: 'Lista no encontrada o no pertenece a tu tenant'
      })
    }

    // Verificar si la relación ya existe
    const existingRelation = await CampaignList.query()
      .where('campaignId', campaignId)
      .where('listId', listId)
      .first()

    if (existingRelation) {
      return response.status(400).json({
        success: false,
        message: 'Esta relación ya existe'
      })
    }

    try {
      const campaignList = await CampaignList.create({
        campaignId,
        listId
      })

      await campaignList.load('campaign')
      await campaignList.load('list')

      return response.status(201).json({
        success: true,
        message: 'Relación creada exitosamente',
        data: campaignList
      })
    } catch (error) {
      console.error('Error al crear relación campaña-lista:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear la relación',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Eliminar una relación entre una campaña y una lista
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
      // Verificar que la relación exista y que la campaña pertenezca al tenant
      const campaignList = await CampaignList.query()
        .where('id', params.id)
        .preload('campaign')
        .firstOrFail()

      const campaign = campaignList.campaign
      if (campaign.tenantId !== tenantUser.tenantId) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para eliminar esta relación'
        })
      }

      await campaignList.delete()
      
      return response.json({
        success: true,
        message: 'Relación eliminada exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar relación campaña-lista:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar la relación',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Eliminar una relación específica por campaignId y listId
   */
  async removeRelation({ request, response, auth }: HttpContext) {
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

    const { campaignId, listId } = request.only(['campaignId', 'listId'])
    
    if (!campaignId || !listId) {
      return response.status(400).json({
        success: false,
        message: 'campaignId y listId son requeridos'
      })
    }

    try {
      // Verificar que la relación exista y que la campaña pertenezca al tenant
      const campaignList = await CampaignList.query()
        .where('campaignId', campaignId)
        .where('listId', listId)
        .preload('campaign')
        .firstOrFail()

      const campaign = campaignList.campaign
      if (campaign.tenantId !== tenantUser.tenantId) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para eliminar esta relación'
        })
      }

      await campaignList.delete()
      
      return response.json({
        success: true,
        message: 'Relación eliminada exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar relación campaña-lista:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar la relación',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}


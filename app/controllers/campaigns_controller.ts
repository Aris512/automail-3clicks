import type { HttpContext } from '@adonisjs/core/http'
import Campaign from '#models/campaign'
import CampaignList from '#models/campaign_list'
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
      .preload('lists')
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

    const data = request.only(['name', 'description', 'status', 'emailSetupId', 'listIds', 'variableValues'])
    
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

    // Validar variableValues si se proporciona
    let variableValues = {}
    if (data.variableValues !== undefined) {
      if (typeof data.variableValues !== 'object' || Array.isArray(data.variableValues)) {
        return response.status(400).json({
          success: false,
          message: 'variableValues debe ser un objeto válido'
        })
      }
      variableValues = data.variableValues || {}
    }

    try {
      const campaign = await Campaign.create({
        tenantId: tenantUser.tenantId,
        userId: user.id,
        name: data.name.trim(),
        description: data.description?.trim(),
        status: data.status || 'active',
        emailSetupId: data.emailSetupId || null,
        variableValues: variableValues
      })

      // Asociar listas si se proporcionaron
      if (data.listIds && Array.isArray(data.listIds) && data.listIds.length > 0) {
        const listIds = data.listIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
        
        // Verificar que todas las listas pertenezcan al tenant
        const List = (await import('#models/list')).default
        const lists = await List.query()
          .where('tenantId', tenantUser.tenantId)
          .whereIn('id', listIds)
        
        const validListIds = lists.map(list => list.id)
        
        // Crear relaciones
        for (const listId of validListIds) {
          await CampaignList.create({
            campaignId: campaign.id,
            listId: listId
          })
        }
      }

      // Cargar relaciones para la respuesta
      await campaign.load('lists')

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
      .preload('lists')
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

    const data = request.only(['name', 'description', 'status', 'emailSetupId', 'listIds', 'variableValues'])
    
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

    // Validar variableValues si se proporciona
    if (data.variableValues !== undefined) {
      if (typeof data.variableValues !== 'object' || Array.isArray(data.variableValues)) {
        return response.status(400).json({
          success: false,
          message: 'variableValues debe ser un objeto válido'
        })
      }
    }

    try {
      const updateData: any = {
        name: data.name?.trim(),
        description: data.description?.trim(),
        status: data.status,
        emailSetupId: data.emailSetupId !== undefined ? data.emailSetupId : campaign.emailSetupId
      }

      // Solo actualizar variableValues si se proporciona
      if (data.variableValues !== undefined) {
        updateData.variableValues = data.variableValues || {}
      }

      campaign.merge(updateData)
      await campaign.save()

      // Actualizar relaciones con listas si se proporcionaron
      if (data.listIds !== undefined) {
        const List = (await import('#models/list')).default
        
        // Obtener listas válidas del tenant
        const listIds = Array.isArray(data.listIds) 
          ? data.listIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
          : []
        
        const lists = await List.query()
          .where('tenantId', tenantUser.tenantId)
          .whereIn('id', listIds)
        
        const validListIds = lists.map(list => list.id)
        
        // Obtener relaciones actuales
        const currentRelations = await CampaignList.query()
          .where('campaignId', campaign.id)
        
        const currentListIds = currentRelations.map(rel => rel.listId)
        
        // Eliminar relaciones que ya no están en la nueva lista
        const toRemove = currentListIds.filter(id => !validListIds.includes(id))
        for (const listId of toRemove) {
          await CampaignList.query()
            .where('campaignId', campaign.id)
            .where('listId', listId)
            .delete()
        }
        
        // Agregar nuevas relaciones
        const toAdd = validListIds.filter(id => !currentListIds.includes(id))
        for (const listId of toAdd) {
          await CampaignList.create({
            campaignId: campaign.id,
            listId: listId
          })
        }
      }

      // Cargar relaciones para la respuesta
      await campaign.load('lists')

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

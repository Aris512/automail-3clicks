import type { HttpContext } from '@adonisjs/core/http'
import CampaignStage from '#models/campaign_stage'
import Campaign from '#models/campaign'
import TenantUser from '#models/tenant_user'
import Template from '#models/template'
import CampaignStageTemplate from '#models/campaign_stage_template'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

@inject()
export default class CampaignStagesController {
  /**
   * Obtener todas las etapas de una campaña (o todas las etapas si no se especifica campaña)
   */
  async index({ params, auth, response }: HttpContext) {
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

    // Si hay campaignId en los params, filtrar por campaña
    if (params.campaignId) {
      // Verificar que la campaña pertenece al tenant
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

      const stages = await CampaignStage.query()
        .where('campaignId', params.campaignId)
        .where('tenantId', tenantUser.tenantId)
        .orderBy('stageNumber', 'asc')
        .preload('campaign')
      
      return response.json({
        success: true,
        data: stages
      })
    }

    // Si no hay campaignId, devolver todas las etapas del tenant
    const stages = await CampaignStage.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('createdAt', 'desc')
      .preload('campaign')
    
    return response.json({
      success: true,
      data: stages
    })
  }

  /**
   * Crear una nueva etapa de campaña
   */
  async store({ params, request, response, auth }: HttpContext) {
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

    const data = request.only(['name', 'stageNumber', 'startsAt', 'campaignId', 'variableValues'])
    
    // Validaciones básicas
    if (!data.name || !data.name.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la etapa es requerido'
      })
    }

    // campaignId puede venir de params o del body
    const campaignId = params.campaignId || data.campaignId
    
    if (!campaignId) {
      return response.status(400).json({
        success: false,
        message: 'El ID de la campaña es requerido'
      })
    }

    // Verificar que la campaña pertenece al tenant
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!campaign) {
      return response.status(404).json({
        success: false,
        message: 'Campaña no encontrada'
      })
    }

    if (!data.stageNumber || data.stageNumber < 1) {
      return response.status(400).json({
        success: false,
        message: 'El número de etapa debe ser mayor a 0'
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
      const stage = await CampaignStage.create({
        tenantId: tenantUser.tenantId,
        campaignId: parseInt(campaignId),
        name: data.name.trim(),
        stageNumber: data.stageNumber,
        startsAt: data.startsAt ? DateTime.fromISO(data.startsAt) : undefined,
        variableValues: variableValues
      })

      return response.status(201).json({
        success: true,
        message: 'Etapa de campaña creada exitosamente',
        data: stage
      })
    } catch (error) {
      console.error('Error al crear etapa de campaña:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear la etapa de campaña',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Obtener una etapa específica
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

    const stage = await CampaignStage.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .preload('campaign')
      .first()

    if (!stage) {
      return response.status(404).json({
        success: false,
        message: 'Etapa no encontrada'
      })
    }

    return response.json({
      success: true,
      data: stage
    })
  }

  /**
   * Actualizar una etapa de campaña
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

    const stage = await CampaignStage.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!stage) {
      return response.status(404).json({
        success: false,
        message: 'Etapa no encontrada'
      })
    }

    const data = request.only(['name', 'stageNumber', 'startsAt', 'variableValues'])
    
    // Validaciones básicas
    if (data.name !== undefined && (!data.name || !data.name.trim())) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la etapa no puede estar vacío'
      })
    }

    if (data.stageNumber !== undefined && data.stageNumber < 1) {
      return response.status(400).json({
        success: false,
        message: 'El número de etapa debe ser mayor a 0'
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
        stageNumber: data.stageNumber,
        startsAt: data.startsAt ? DateTime.fromISO(data.startsAt) : undefined
      }

      // Solo actualizar variableValues si se proporciona
      if (data.variableValues !== undefined) {
        updateData.variableValues = data.variableValues || {}
      }

      stage.merge(updateData)
      await stage.save()

      return response.json({
        success: true,
        message: 'Etapa de campaña actualizada exitosamente',
        data: stage
      })
    } catch (error) {
      console.error('Error al actualizar etapa de campaña:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar la etapa de campaña',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Eliminar una etapa de campaña
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
      const stage = await CampaignStage.query()
        .where('id', params.id)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()
      
      await stage.delete()
      
      return response.json({
        success: true,
        message: 'Etapa de campaña eliminada exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar etapa de campaña:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar la etapa de campaña',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Obtener todas las etapas con sus templates asociados
   */
  async indexWithTemplates({ auth, response }: HttpContext) {
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

    const stages = await CampaignStage.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('createdAt', 'desc')
      .preload('campaign')
    
    // Para cada etapa, obtener las templates asociadas directamente
    const stagesWithTemplates = await Promise.all(
      stages.map(async (stage) => {
        await stage.load('templates')
        
        return {
          ...stage.serialize(),
          templates: stage.templates || []
        }
      })
    )
    
    return response.json({
      success: true,
      data: stagesWithTemplates
    })
  }

  /**
   * Obtener templates asociados a una etapa (a través de la campaña)
   */
  async getTemplates({ params, auth, response }: HttpContext) {
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

    const stage = await CampaignStage.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .preload('campaign')
      .first()

    if (!stage) {
      return response.status(404).json({
        success: false,
        message: 'Etapa no encontrada'
      })
    }

    // Obtener templates asociados a la etapa
    await stage.load('templates')

    return response.json({
      success: true,
      data: stage.templates || []
    })
  }

  /**
   * Asociar template a una etapa de campaña (a través de campaign_stage_templates)
   */
  async associateTemplate({ params, request, response, auth }: HttpContext) {
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

    const stage = await CampaignStage.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!stage) {
      return response.status(404).json({
        success: false,
        message: 'Etapa no encontrada'
      })
    }

    const { templateId } = request.only(['templateId'])
    
    if (!templateId) {
      return response.status(400).json({
        success: false,
        message: 'El ID de la plantilla es requerido'
      })
    }

    // Verificar que la plantilla existe y pertenece al tenant
    const template = await Template.query()
      .where('id', templateId)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!template) {
      return response.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      })
    }

    try {
      // Verificar si ya existe la relación
      const existing = await CampaignStageTemplate.query()
        .where('campaignStageId', stage.id)
        .where('templatesId', templateId)
        .first()

      if (existing) {
        return response.status(400).json({
          success: false,
          message: 'La plantilla ya está asociada a esta etapa de campaña'
        })
      }

      // Crear la asociación (usando el ID de la etapa)
      await CampaignStageTemplate.create({
        campaignStageId: stage.id,
        templatesId: templateId
      })

      return response.json({
        success: true,
        message: 'Plantilla asociada exitosamente'
      })
    } catch (error) {
      console.error('Error al asociar plantilla:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al asociar la plantilla',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Desasociar template de una campaña
   */
  async dissociateTemplate({ params, request, response, auth }: HttpContext) {
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

    const stage = await CampaignStage.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!stage) {
      return response.status(404).json({
        success: false,
        message: 'Etapa no encontrada'
      })
    }

    const { templateId } = request.only(['templateId'])
    
    if (!templateId) {
      return response.status(400).json({
        success: false,
        message: 'El ID de la plantilla es requerido'
      })
    }

    try {
      const deleted = await CampaignStageTemplate.query()
        .where('campaignStageId', stage.id)
        .where('templatesId', templateId)
        .delete()

      const deletedCount = Array.isArray(deleted) ? deleted.length : deleted

      if (deletedCount === 0) {
        return response.status(404).json({
          success: false,
          message: 'La plantilla no está asociada a esta etapa de campaña'
        })
      }

      return response.json({
        success: true,
        message: 'Plantilla desasociada exitosamente'
      })
    } catch (error) {
      console.error('Error al desasociar plantilla:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al desasociar la plantilla',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

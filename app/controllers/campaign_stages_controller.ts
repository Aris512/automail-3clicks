import type { HttpContext } from '@adonisjs/core/http'
import CampaignStage from '#models/campaign_stage'
import Campaign from '#models/campaign'
import TenantUser from '#models/tenant_user'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

@inject()
export default class CampaignStagesController {
  /**
   * Obtener todas las etapas de una campaña
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

    const data = request.only(['name', 'stageNumber', 'startsAt'])
    
    // Validaciones básicas
    if (!data.name || !data.name.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la etapa es requerido'
      })
    }

    if (!data.stageNumber || data.stageNumber < 1) {
      return response.status(400).json({
        success: false,
        message: 'El número de etapa debe ser mayor a 0'
      })
    }

    try {
      const stage = await CampaignStage.create({
        tenantId: tenantUser.tenantId,
        campaignId: parseInt(params.campaignId),
        name: data.name.trim(),
        stageNumber: data.stageNumber,
        startsAt: data.startsAt ? DateTime.fromISO(data.startsAt) : undefined
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

    const data = request.only(['name', 'stageNumber', 'startsAt'])
    
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

    try {
      stage.merge({
        name: data.name?.trim(),
        stageNumber: data.stageNumber,
        startsAt: data.startsAt ? DateTime.fromISO(data.startsAt) : undefined
      })
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
}

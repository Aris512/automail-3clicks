import type { HttpContext } from '@adonisjs/core/http'
import CampaignStage from '#models/campaign_stage'
import Campaign from '#models/campaign'
import TenantUser from '#models/tenant_user'
import Template from '#models/template'
import CampaignStageTemplate from '#models/campaign_stage_template'
import CampaignCustomVariable from '#models/campaign_custom_variable'
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

    const data = request.only(['name', 'stageNumber', 'startsAt', 'campaignId', 'customVariableValues'])
    
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

    // Validar customVariableValues si se proporciona
    if (data.customVariableValues !== undefined && !Array.isArray(data.customVariableValues)) {
      return response.status(400).json({
        success: false,
        message: 'customVariableValues debe ser un array'
      })
    }

    try {
      const stage = await CampaignStage.create({
        tenantId: tenantUser.tenantId,
        campaignId: parseInt(campaignId),
        name: data.name.trim(),
        stageNumber: data.stageNumber,
        startsAt: data.startsAt ? DateTime.fromISO(data.startsAt) : undefined
      })

      // Al crear una etapa, actualizar registros existentes agregando campaign_stage_id y valor_stage
      const campaignVars = await CampaignCustomVariable.query()
        .where('campaignId', parseInt(campaignId))
        .whereNull('campaignStageId')
        .preload('customVariable')

      // Actualizar registros existentes (incluso si campaign_stage_id es null) agregando campaign_stage_id = stage.id
      // y valor_stage, o crear si no existe un registro
      for (const campaignVar of campaignVars) {
        // Buscar si existe un registro con campaign_stage_id = null
        const existingVar = await CampaignCustomVariable.query()
          .where('customVarId', campaignVar.customVarId)
          .where('campaignId', parseInt(campaignId))
          .whereNull('campaignStageId')
          .first()

        if (existingVar) {
          // Actualizar el registro existente agregando campaign_stage_id y valor_stage
          existingVar.campaignStageId = stage.id
          existingVar.valorStage = campaignVar.valorStage
          await existingVar.save()
        } else {
          // Si no existe, crear uno nuevo
          await CampaignCustomVariable.create({
            customVarId: campaignVar.customVarId,
            campaignId: parseInt(campaignId),
            campaignStageId: stage.id,
            valor: campaignVar.valor,
            valorStage: campaignVar.valorStage
          })
        }
      }

      // Actualizar valores específicos de etapa si se proporcionaron
      if (data.customVariableValues && Array.isArray(data.customVariableValues) && data.customVariableValues.length > 0) {
        for (const varValue of data.customVariableValues) {
          if (!varValue.customVarId || !varValue.valor) {
            continue
          }

          // Verificar que la variable existe y pertenece a la campaign
          const campaignVar = await CampaignCustomVariable.query()
            .where('campaignId', parseInt(campaignId))
            .where('customVarId', varValue.customVarId)
            .whereNull('campaignStageId')
            .first()

          if (!campaignVar) {
            continue // La variable no existe en la campaign
          }

          // Actualizar el valor específico de la etapa
          await CampaignCustomVariable.updateOrCreate(
            {
              customVarId: varValue.customVarId,
              campaignId: parseInt(campaignId),
              campaignStageId: stage.id
            },
            {
              valor: varValue.valor.trim()
            }
          )
        }
      }

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

    // Obtener variables heredadas de campaign (valores base)
    const campaignVariables = await CampaignCustomVariable.query()
      .where('campaignId', stage.campaignId)
      .whereNull('campaignStageId')
      .preload('customVariable')

    // Obtener valores específicos de la etapa
    const stageVariables = await CampaignCustomVariable.query()
      .where('campaignId', stage.campaignId)
      .where('campaignStageId', stage.id)
      .preload('customVariable')

    // Combinar: valores de etapa sobrescriben valores de campaign
    // Priorizar valor_stage sobre valor
    const variablesWithValues = campaignVariables.map(cv => {
      const stageVar = stageVariables.find(sv => sv.customVarId === cv.customVarId)
      if (stageVar) {
        // Si hay valor en etapa, priorizar valor_stage sobre valor
        return {
          id: cv.customVariable.id,
          name: cv.customVariable.name,
          description: cv.customVariable.description,
          valor: stageVar.valor,
          valorStage: stageVar.valorStage,
          // Valor final a mostrar: priorizar valor_stage sobre valor
          valorFinal: stageVar.valorStage || stageVar.valor || '',
          isOverridden: true
        }
      }
      // Si no hay valor en etapa, usar valores de campaign
      return {
        id: cv.customVariable.id,
        name: cv.customVariable.name,
        description: cv.customVariable.description,
        valor: cv.valor,
        valorStage: cv.valorStage,
        // Valor final a mostrar: priorizar valor_stage sobre valor
        valorFinal: cv.valorStage || cv.valor || '',
        isOverridden: false
      }
    })

    // Agregar variables con valores al objeto stage
    ;(stage as any).customVariablesWithValues = variablesWithValues

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

    const data = request.only(['name', 'stageNumber', 'startsAt', 'customVariableValues'])
    
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

    // Validar customVariableValues si se proporciona
    if (data.customVariableValues !== undefined && !Array.isArray(data.customVariableValues)) {
      return response.status(400).json({
        success: false,
        message: 'customVariableValues debe ser un array'
      })
    }

    try {
      const updateData: any = {
        name: data.name?.trim(),
        stageNumber: data.stageNumber,
        startsAt: data.startsAt ? DateTime.fromISO(data.startsAt) : undefined
      }

      stage.merge(updateData)
      await stage.save()

      // Verificar si existen registros de variables para esta etapa
      // Si no existen, crearlos desde la campaña
      const existingStageVars = await CampaignCustomVariable.query()
        .where('campaignId', stage.campaignId)
        .where('campaignStageId', stage.id)
        .first()

      if (!existingStageVars) {
        // Obtener variables de la campaña
        const campaignVars = await CampaignCustomVariable.query()
          .where('campaignId', stage.campaignId)
          .whereNull('campaignStageId')
          .preload('customVariable')

        // Actualizar registros existentes (incluso si campaign_stage_id es null) agregando campaign_stage_id = stage.id
        // y valor_stage, o crear si no existe un registro
        for (const campaignVar of campaignVars) {
          // Buscar si existe un registro con campaign_stage_id = null
          const existingVar = await CampaignCustomVariable.query()
            .where('customVarId', campaignVar.customVarId)
            .where('campaignId', stage.campaignId)
            .whereNull('campaignStageId')
            .first()

          if (existingVar) {
            // Actualizar el registro existente agregando campaign_stage_id y valor_stage
            existingVar.campaignStageId = stage.id
            existingVar.valorStage = campaignVar.valorStage
            await existingVar.save()
          } else {
            // Si no existe, crear uno nuevo
            await CampaignCustomVariable.create({
              customVarId: campaignVar.customVarId,
              campaignId: stage.campaignId,
              campaignStageId: stage.id,
              valor: campaignVar.valor,
              valorStage: campaignVar.valorStage
            })
          }
        }
      }

      // Actualizar valores específicos de etapa si se proporcionaron
      if (data.customVariableValues !== undefined) {
        // Eliminar todos los valores específicos de esta etapa
        await CampaignCustomVariable.query()
          .where('campaignId', stage.campaignId)
          .where('campaignStageId', stage.id)
          .delete()

        // Crear nuevos valores si se proporcionaron
        if (Array.isArray(data.customVariableValues) && data.customVariableValues.length > 0) {
          for (const varValue of data.customVariableValues) {
            if (!varValue.customVarId || !varValue.valor) {
              continue
            }

            // Verificar que la variable existe y pertenece a la campaign
            const campaignVar = await CampaignCustomVariable.query()
              .where('campaignId', stage.campaignId)
              .where('customVarId', varValue.customVarId)
              .whereNull('campaignStageId')
              .first()

            if (!campaignVar) {
              continue // La variable no existe en la campaign
            }

            // Actualizar o crear el valor específico de la etapa
            await CampaignCustomVariable.updateOrCreate(
              {
                customVarId: varValue.customVarId,
                campaignId: stage.campaignId,
                campaignStageId: stage.id
              },
              {
                valor: varValue.valor.trim()
              }
            )
          }
        }
      }

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

      // Verificar si existen registros de variables para esta etapa
      // Si no existen, crearlos desde la campaña
      const existingStageVars = await CampaignCustomVariable.query()
        .where('campaignId', stage.campaignId)
        .where('campaignStageId', stage.id)
        .first()

      if (!existingStageVars) {
        // Obtener variables de la campaña
        const campaignVars = await CampaignCustomVariable.query()
          .where('campaignId', stage.campaignId)
          .whereNull('campaignStageId')
          .preload('customVariable')

        // Actualizar registros existentes (incluso si campaign_stage_id es null) agregando campaign_stage_id = stage.id
        // y valor_stage, o crear si no existe un registro
        for (const campaignVar of campaignVars) {
          // Buscar si existe un registro con campaign_stage_id = null
          const existingVar = await CampaignCustomVariable.query()
            .where('customVarId', campaignVar.customVarId)
            .where('campaignId', stage.campaignId)
            .whereNull('campaignStageId')
            .first()

          if (existingVar) {
            // Actualizar el registro existente agregando campaign_stage_id y valor_stage
            existingVar.campaignStageId = stage.id
            existingVar.valorStage = campaignVar.valorStage
            await existingVar.save()
          } else {
            // Si no existe, crear uno nuevo
            await CampaignCustomVariable.create({
              customVarId: campaignVar.customVarId,
              campaignId: stage.campaignId,
              campaignStageId: stage.id,
              valor: campaignVar.valor,
              valorStage: campaignVar.valorStage
            })
          }
        }
      }

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

      // Verificar si la etapa aún tiene otros templates asociados
      const remainingTemplates = await CampaignStageTemplate.query()
        .where('campaignStageId', stage.id)
        .first()

      // Si la etapa ya no tiene más templates asociados, actualizar registros eliminando campaign_stage_id
      // y valor_stage (poniéndolos en null) en lugar de eliminar los registros
      if (!remainingTemplates) {
        // Obtener todos los registros de variables con campaign_stage_id = stage.id
        const stageVars = await CampaignCustomVariable.query()
          .where('campaignId', stage.campaignId)
          .where('campaignStageId', stage.id)

        // Actualizar cada registro poniendo campaign_stage_id = null y valor_stage = null
        for (const stageVar of stageVars) {
          stageVar.campaignStageId = null
          stageVar.valorStage = null
          await stageVar.save()
        }
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

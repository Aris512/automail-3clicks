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

      // Al crear una etapa, actualizar registros existentes con campaign_stage_id IS NULL
      // Si no hay registros con campaign_stage_id IS NULL, crear nuevos registros para esta etapa
      const campaignVarsNull = await CampaignCustomVariable.query()
        .where('campaignId', parseInt(campaignId))
        .whereNull('campaignStageId')
        .preload('customVariable')

      // Si hay registros con campaign_stage_id IS NULL, actualizarlos
      if (campaignVarsNull.length > 0) {
        for (const campaignVar of campaignVarsNull) {
          if (campaignVar.campaignStageId === null) {
            campaignVar.campaignStageId = stage.id
            await campaignVar.save()
          }
        }
      } else {
        // Si no hay registros con campaign_stage_id IS NULL, obtener todas las variables únicas de la campaña
        // y crear nuevos registros para esta etapa
        const allCampaignVars = await CampaignCustomVariable.query()
          .where('campaignId', parseInt(campaignId))
          .preload('customVariable')

        // Obtener customVarIds únicos
        const uniqueCustomVarIds = new Set<number>()
        for (const cv of allCampaignVars) {
          uniqueCustomVarIds.add(cv.customVarId)
        }

        // Para cada variable única, verificar si ya existe un registro para esta etapa
        for (const customVarId of uniqueCustomVarIds) {
          const existingStageVar = await CampaignCustomVariable.query()
            .where('customVarId', customVarId)
            .where('campaignId', parseInt(campaignId))
            .where('campaignStageId', stage.id)
            .first()

          // Si no existe un registro para esta etapa, crear uno nuevo
          if (!existingStageVar) {
            // Obtener el primer registro de esta variable para copiar sus valores
            const sourceVar = allCampaignVars.find(cv => cv.customVarId === customVarId)
            if (sourceVar) {
              await CampaignCustomVariable.create({
                customVarId: customVarId,
                campaignId: parseInt(campaignId),
                campaignStageId: stage.id,
                valorStage: sourceVar.valorStage
              })
            }
          }
        }
      }

      // Actualizar valores específicos de etapa si se proporcionaron
      if (data.customVariableValues && Array.isArray(data.customVariableValues) && data.customVariableValues.length > 0) {
        for (const varValue of data.customVariableValues) {
          if (!varValue.customVarId) {
            continue
          }

          // Buscar si ya existe un registro para esta variable en esta etapa
          const existingStageVar = await CampaignCustomVariable.query()
            .where('customVarId', varValue.customVarId)
            .where('campaignId', parseInt(campaignId))
            .where('campaignStageId', stage.id)
            .first()

          if (existingStageVar) {
            // Actualizar el registro existente, guardando el valor en valor_stage
            existingStageVar.valorStage = varValue.valor?.trim() || null
            await existingStageVar.save()
          } else {
            // Crear nuevo registro de nivel etapa
            await CampaignCustomVariable.create({
              customVarId: varValue.customVarId,
              campaignId: parseInt(campaignId),
              campaignStageId: stage.id,
              valorStage: varValue.valor?.trim() || null
            })
          }
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

    // Obtener TODAS las variables de la campaña (tanto de nivel campaña como de nivel etapa)
    const allCampaignVariables = await CampaignCustomVariable.query()
      .where('campaignId', stage.campaignId)
      .preload('customVariable')

    // Separar variables de campaña (campaignStageId IS NULL) y de etapa (campaignStageId = stage.id)
    const campaignVariables = allCampaignVariables.filter(cv => cv.campaignStageId === null)
    const stageVariables = allCampaignVariables.filter(cv => cv.campaignStageId === stage.id)

    // Crear un mapa de todas las variables únicas (por customVarId)
    const variablesMap = new Map<number, any>()

    // Primero, agregar todas las variables de campaña
    campaignVariables.forEach(cv => {
      if (!variablesMap.has(cv.customVarId)) {
        variablesMap.set(cv.customVarId, {
          id: cv.customVariable.id,
          name: cv.customVariable.name,
          description: cv.customVariable.description,
          valor: cv.customVariable.valor,
          valorStage: null, // No hay valor_stage de etapa aún
          isOverridden: false
        })
      }
    })

    // Luego, actualizar con valores de etapa si existen
    stageVariables.forEach(sv => {
      const existing = variablesMap.get(sv.customVarId)
      if (existing) {
        // Actualizar variable existente con valor_stage de la etapa
        existing.valorStage = sv.valorStage
        existing.isOverridden = true
      } else {
        // Variable solo existe en la etapa, agregarla
        variablesMap.set(sv.customVarId, {
          id: sv.customVariable.id,
          name: sv.customVariable.name,
          description: sv.customVariable.description,
          valor: sv.customVariable.valor,
          valorStage: sv.valorStage, // valor_stage de la etapa específica
          isOverridden: true
        })
      }
    })

    // Convertir el mapa a array y calcular valorFinal
    const variablesWithValues = Array.from(variablesMap.values()).map(v => {
      // Asegurarse de que valorStage se incluya correctamente
      const result = {
        id: v.id,
        name: v.name,
        description: v.description,
        valor: v.valor,
        valorStage: v.valorStage !== null && v.valorStage !== undefined ? String(v.valorStage) : null,
        isOverridden: v.isOverridden,
        // Valor final a mostrar: priorizar valor_stage de la etapa sobre valor de custom_variables
        valorFinal: v.valorStage !== null && v.valorStage !== undefined 
          ? String(v.valorStage)
          : (v.valor || '')
      }
      return result
    })

    // Serializar el objeto stage y agregar customVariablesWithValues
    const stageData = stage.serialize()
    ;(stageData as any).customVariablesWithValues = variablesWithValues

    return response.json({
      success: true,
      data: stageData
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

      // Actualizar registros de variables de nivel campaña (campaign_stage_id IS NULL) asignándoles el campaign_stage_id de la etapa
      // Si no hay registros con campaign_stage_id IS NULL, crear nuevos registros para esta etapa
      const campaignVarsNull = await CampaignCustomVariable.query()
        .where('campaignId', stage.campaignId)
        .whereNull('campaignStageId')
        .preload('customVariable')

      // Si hay registros con campaign_stage_id IS NULL, actualizarlos
      if (campaignVarsNull.length > 0) {
        for (const campaignVar of campaignVarsNull) {
          if (campaignVar.campaignStageId === null) {
            campaignVar.campaignStageId = stage.id
            await campaignVar.save()
          }
        }
      } else {
        // Si no hay registros con campaign_stage_id IS NULL, obtener todas las variables únicas de la campaña
        // y crear nuevos registros para esta etapa
        const allCampaignVars = await CampaignCustomVariable.query()
          .where('campaignId', stage.campaignId)
          .preload('customVariable')

        // Obtener customVarIds únicos
        const uniqueCustomVarIds = new Set<number>()
        for (const cv of allCampaignVars) {
          uniqueCustomVarIds.add(cv.customVarId)
        }

        // Para cada variable única, verificar si ya existe un registro para esta etapa
        for (const customVarId of uniqueCustomVarIds) {
          const existingStageVar = await CampaignCustomVariable.query()
            .where('customVarId', customVarId)
            .where('campaignId', stage.campaignId)
            .where('campaignStageId', stage.id)
            .first()

          // Si no existe un registro para esta etapa, crear uno nuevo
          if (!existingStageVar) {
            // Obtener el primer registro de esta variable para copiar sus valores
            const sourceVar = allCampaignVars.find(cv => cv.customVarId === customVarId)
            if (sourceVar) {
              await CampaignCustomVariable.create({
                customVarId: customVarId,
                campaignId: stage.campaignId,
                campaignStageId: stage.id,
                valorStage: sourceVar.valorStage
              })
            }
          }
        }
      }

      // Actualizar valores específicos de etapa si se proporcionaron
      if (data.customVariableValues !== undefined) {
        // Actualizar o crear valores específicos de etapa sin eliminar registros existentes
        if (Array.isArray(data.customVariableValues) && data.customVariableValues.length > 0) {
          for (const varValue of data.customVariableValues) {
            if (!varValue.customVarId) {
              continue
            }

            // Buscar si ya existe un registro para esta variable en esta etapa
            const existingStageVar = await CampaignCustomVariable.query()
              .where('customVarId', varValue.customVarId)
              .where('campaignId', stage.campaignId)
              .where('campaignStageId', stage.id)
              .first()

            if (existingStageVar) {
              // Actualizar el registro existente, guardando el valor en valor_stage
              existingStageVar.valorStage = varValue.valor?.trim() || null
              await existingStageVar.save()
            } else {
              // Crear nuevo registro de nivel etapa
              await CampaignCustomVariable.create({
                customVarId: varValue.customVarId,
                campaignId: stage.campaignId,
                campaignStageId: stage.id,
                valorStage: varValue.valor?.trim() || null
              })
            }
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

      // Actualizar registros de variables de nivel campaña (campaign_stage_id IS NULL) asignándoles el campaign_stage_id de la etapa
      // Si no hay registros con campaign_stage_id IS NULL, crear nuevos registros para esta etapa
      const campaignVarsNull = await CampaignCustomVariable.query()
        .where('campaignId', stage.campaignId)
        .whereNull('campaignStageId')
        .preload('customVariable')

      // Si hay registros con campaign_stage_id IS NULL, actualizarlos
      if (campaignVarsNull.length > 0) {
        for (const campaignVar of campaignVarsNull) {
          if (campaignVar.campaignStageId === null) {
            campaignVar.campaignStageId = stage.id
            await campaignVar.save()
          }
        }
      } else {
        // Si no hay registros con campaign_stage_id IS NULL, obtener todas las variables únicas de la campaña
        // y crear nuevos registros para esta etapa
        const allCampaignVars = await CampaignCustomVariable.query()
          .where('campaignId', stage.campaignId)
          .preload('customVariable')

        // Obtener customVarIds únicos
        const uniqueCustomVarIds = new Set<number>()
        for (const cv of allCampaignVars) {
          uniqueCustomVarIds.add(cv.customVarId)
        }

        // Para cada variable única, verificar si ya existe un registro para esta etapa
        for (const customVarId of uniqueCustomVarIds) {
          const existingStageVar = await CampaignCustomVariable.query()
            .where('customVarId', customVarId)
            .where('campaignId', stage.campaignId)
            .where('campaignStageId', stage.id)
            .first()

          // Si no existe un registro para esta etapa, crear uno nuevo
          if (!existingStageVar) {
            // Obtener el primer registro de esta variable para copiar sus valores
            const sourceVar = allCampaignVars.find(cv => cv.customVarId === customVarId)
            if (sourceVar) {
              await CampaignCustomVariable.create({
                customVarId: customVarId,
                campaignId: stage.campaignId,
                campaignStageId: stage.id,
                valorStage: sourceVar.valorStage
              })
            }
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

      // No modificar los valores de las variables personalizadas (valor_stage) al desasociar una plantilla
      // La desasociación solo elimina la relación en campaign_stage_templates
      // Los valores de las variables (valor_stage) deben permanecer intactos

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

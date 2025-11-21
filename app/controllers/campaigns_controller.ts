import type { HttpContext } from '@adonisjs/core/http'
import Campaign from '#models/campaign'
import CampaignList from '#models/campaign_list'
import CampaignStage from '#models/campaign_stage'
import TenantUser from '#models/tenant_user'
import CustomVariable from '#models/custom_variable'
import CampaignCustomVariable from '#models/campaign_custom_variable'
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
    
    // Cargar variables personalizadas para cada campaña
    const campaignsWithVariables = await Promise.all(
      campaigns.map(async (campaign) => {
        const campaignData = campaign.serialize()
        
        // Obtener TODAS las variables de la campaña (independientemente de campaign_stage_id)
        const allCampaignVariables = await CampaignCustomVariable.query()
          .where('campaignId', campaign.id)
          .preload('customVariable')
        
        // Agrupar por customVarId y priorizar las que tienen campaignStageId IS NULL
        const variablesMap = new Map<number, CampaignCustomVariable>()
        
        for (const cv of allCampaignVariables) {
          const customVarId = cv.customVarId
          const existing = variablesMap.get(customVarId)
          
          // Si no existe en el mapa, agregarlo
          // Si existe, priorizar la que tiene campaignStageId IS NULL
          if (!existing || (cv.campaignStageId === null && existing.campaignStageId !== null)) {
            variablesMap.set(customVarId, cv)
          }
        }
        
        // Crear el array de variables con valores (solo una instancia por variable)
        const customVariablesWithValues = Array.from(variablesMap.values()).map(cv => ({
          id: cv.customVariable.id,
          name: cv.customVariable.name,
          description: cv.customVariable.description,
          valor: cv.customVariable.valor,
          valorStage: cv.valorStage,
          // Valor final a mostrar: priorizar valor_stage sobre valor
          valorFinal: cv.valorStage || cv.customVariable.valor || ''
        }))
        
        ;(campaignData as any).customVariablesWithValues = customVariablesWithValues
        return campaignData
      })
    )
    
    return response.json({
      success: true,
      data: campaignsWithVariables
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

    const data = request.only(['name', 'description', 'status', 'emailSetupId', 'listIds', 'customVariables'])
    
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

    // Validar customVariables si se proporciona
    if (data.customVariables !== undefined && !Array.isArray(data.customVariables)) {
      return response.status(400).json({
        success: false,
        message: 'customVariables debe ser un array'
      })
    }

    try {
      const campaign = await Campaign.create({
        tenantId: tenantUser.tenantId,
        userId: user.id,
        name: data.name.trim(),
        description: data.description?.trim(),
        status: data.status || 'active',
        emailSetupId: data.emailSetupId || null
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

      // Crear variables personalizadas si se proporcionaron
      if (data.customVariables && Array.isArray(data.customVariables) && data.customVariables.length > 0) {
        console.log(`[CAMPAIGN CREATE] Procesando ${data.customVariables.length} variables personalizadas para campaña ${campaign.id}`)
        
        for (const customVar of data.customVariables) {
          if (!customVar.name || !customVar.name.trim()) {
            console.log('[CAMPAIGN CREATE] Saltando variable sin nombre:', customVar)
            continue // Saltar variables sin nombre
          }

          const varName = customVar.name.trim()
          const varDescription = customVar.description?.trim() || null
          const varValor = customVar.valor?.trim() || null

          console.log(`[CAMPAIGN CREATE] Procesando variable: nombre="${varName}", descripción="${varDescription}", valor="${varValor}"`)

          // Crear o encontrar la variable personalizada
          let customVariable = await CustomVariable.query()
            .where('name', varName)
            .first()

          if (!customVariable) {
            console.log(`[CAMPAIGN CREATE] Creando nueva variable personalizada: ${varName}`)
            customVariable = await CustomVariable.create({
              name: varName,
              description: varDescription,
              valor: varValor
            })
            console.log(`[CAMPAIGN CREATE] Variable personalizada creada con ID: ${customVariable.id}`)
          } else {
            // Actualizar el valor si se proporcionó uno nuevo
            if (varValor !== null) {
              customVariable.valor = varValor
              await customVariable.save()
              console.log(`[CAMPAIGN CREATE] Valor actualizado para variable personalizada ID: ${customVariable.id}`)
            } else {
              console.log(`[CAMPAIGN CREATE] Variable personalizada ya existe con ID: ${customVariable.id}`)
            }
          }

          // Crear la relación en campaign_custom_variables (sin valor, ya que ahora está en custom_variables)
          console.log(`[CAMPAIGN CREATE] Creando relación campaign_custom_variables: campaignId=${campaign.id}, customVarId=${customVariable.id}`)
          const campaignCustomVar = await CampaignCustomVariable.create({
            customVarId: customVariable.id,
            campaignId: campaign.id,
            campaignStageId: null // null = valor a nivel campaign
          })
          console.log(`[CAMPAIGN CREATE] Relación creada con ID: ${campaignCustomVar.id}`)
        }
        
        console.log(`[CAMPAIGN CREATE] Finalizado procesamiento de variables personalizadas para campaña ${campaign.id}`)
      } else {
        console.log(`[CAMPAIGN CREATE] No se proporcionaron variables personalizadas para campaña ${campaign.id}`)
      }

      // Cargar relaciones para la respuesta
      await campaign.load('lists')
      await campaign.load('customVariables')

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
      .preload('customVariables')
      .first()

    if (!campaign) {
      return response.status(404).json({
        success: false,
        message: 'Campaña no encontrada'
      })
    }

    // Obtener TODAS las variables de la campaña (independientemente de campaign_stage_id)
    const allCampaignVariables = await CampaignCustomVariable.query()
      .where('campaignId', campaign.id)
      .preload('customVariable')
    
    // Agrupar por customVarId y priorizar las que tienen campaignStageId IS NULL
    const variablesMap = new Map<number, CampaignCustomVariable>()
    
    for (const cv of allCampaignVariables) {
      const customVarId = cv.customVarId
      const existing = variablesMap.get(customVarId)
      
      // Si no existe en el mapa, agregarlo
      // Si existe, priorizar la que tiene campaignStageId IS NULL
      if (!existing || (cv.campaignStageId === null && existing.campaignStageId !== null)) {
        variablesMap.set(customVarId, cv)
      }
    }
    
    // Crear el array de variables con valores (solo una instancia por variable)
    // Priorizar valor_stage sobre valor
    const customVariablesWithValues = Array.from(variablesMap.values()).map(cv => ({
      id: cv.customVariable.id,
      name: cv.customVariable.name,
      description: cv.customVariable.description,
      valor: cv.customVariable.valor,
      valorStage: cv.valorStage,
      // Valor final a mostrar: priorizar valor_stage sobre valor
      valorFinal: cv.valorStage || cv.customVariable.valor || ''
    }))

    // Serializar la campaña y agregar customVariablesWithValues
    const campaignData = campaign.serialize()
    ;(campaignData as any).customVariablesWithValues = customVariablesWithValues

    return response.json({
      success: true,
      data: campaignData
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

    const data = request.only(['name', 'description', 'status', 'emailSetupId', 'listIds', 'customVariables'])
    
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

    // Validar customVariables si se proporciona
    if (data.customVariables !== undefined && !Array.isArray(data.customVariables)) {
      return response.status(400).json({
        success: false,
        message: 'customVariables debe ser un array'
      })
    }

    try {
      const updateData: any = {
        name: data.name?.trim(),
        description: data.description?.trim(),
        status: data.status,
        emailSetupId: data.emailSetupId !== undefined ? data.emailSetupId : campaign.emailSetupId
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

      // Actualizar variables personalizadas si se proporcionaron
      if (data.customVariables !== undefined) {
        // Obtener todas las variables actuales de la campaña (independientemente de campaign_stage_id)
        const allCurrentCampaignVars = await CampaignCustomVariable.query()
          .where('campaignId', campaign.id)

        // Crear un mapa de las variables actuales por customVarId para búsqueda rápida
        const currentVarsMap = new Map<number, CampaignCustomVariable>()
        for (const cv of allCurrentCampaignVars) {
          // Priorizar registros de nivel campaña (campaignStageId IS NULL)
          const existing = currentVarsMap.get(cv.customVarId)
          if (!existing || (cv.campaignStageId === null && existing.campaignStageId !== null)) {
            currentVarsMap.set(cv.customVarId, cv)
          }
        }

        // Procesar las variables proporcionadas
        if (Array.isArray(data.customVariables) && data.customVariables.length > 0) {
          const processedVarIds = new Set<number>()

          for (const customVar of data.customVariables) {
            if (!customVar.name || !customVar.name.trim()) {
              continue
            }

            const varName = customVar.name.trim()
            const varDescription = customVar.description?.trim() || null
            const varValor = customVar.valor?.trim() || null

            // Crear o encontrar la variable personalizada
            let customVariable = await CustomVariable.query()
              .where('name', varName)
              .first()

            if (!customVariable) {
              customVariable = await CustomVariable.create({
                name: varName,
                description: varDescription,
                valor: varValor
              })
            } else {
              // Actualizar el valor en CustomVariable si se proporcionó uno nuevo
              if (varValor !== null) {
                customVariable.valor = varValor
                await customVariable.save()
              }
            }

            // Buscar si ya existe una relación para esta variable en esta campaña
            // Priorizar buscar registros de nivel campaña (campaignStageId IS NULL)
            let existingRelation = await CampaignCustomVariable.query()
              .where('campaignId', campaign.id)
              .where('customVarId', customVariable.id)
              .whereNull('campaignStageId')
              .first()

            // Si no existe de nivel campaña, buscar cualquier registro con este customVarId y campaignId
            if (!existingRelation) {
              existingRelation = await CampaignCustomVariable.query()
                .where('campaignId', campaign.id)
                .where('customVarId', customVariable.id)
                .first()
            }

            if (existingRelation) {
              // Si es un registro de nivel etapa, crear uno nuevo de nivel campaña
              // (no modificar el de nivel etapa)
              if (existingRelation.campaignStageId !== null) {
                await CampaignCustomVariable.create({
                  customVarId: customVariable.id,
                  campaignId: campaign.id,
                  campaignStageId: null
                })
              }
              // Si ya existe de nivel campaña, no necesitamos hacer nada más
            } else {
              // Crear nueva relación de nivel campaña
              await CampaignCustomVariable.create({
                customVarId: customVariable.id,
                campaignId: campaign.id,
                campaignStageId: null
              })
            }

            processedVarIds.add(customVariable.id)
          }

          // Eliminar variables de nivel campaña que ya no están en la lista
          const varsToRemove = Array.from(currentVarsMap.values())
            .filter(cv => cv.campaignStageId === null && !processedVarIds.has(cv.customVarId))
          
          for (const cv of varsToRemove) {
            await cv.delete()
          }
        } else {
          // Si no se proporcionaron variables, eliminar todas las variables de nivel campaña
          const campaignLevelVars = allCurrentCampaignVars.filter(cv => cv.campaignStageId === null)
          for (const cv of campaignLevelVars) {
            await cv.delete()
          }
        }
      }

      // Cargar relaciones para la respuesta
      await campaign.load('lists')
      await campaign.load('customVariables')

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
      
      // Obtener todas las variables personalizadas asociadas a esta campaña ANTES de eliminarla
      const campaignVariables = await CampaignCustomVariable.query()
        .where('campaignId', campaign.id)
        .preload('customVariable')
      
      // Guardar los IDs de las variables personalizadas para verificar después
      const customVariableIds = campaignVariables.map(cv => cv.customVarId)
      
      // Eliminar la campaña (esto eliminará automáticamente las relaciones en campaign_custom_variables por cascade)
      await campaign.delete()
      
      // Eliminar las variables personalizadas que solo pertenecen a esta campaña
      // (que no están asociadas a ninguna otra campaña)
      for (const customVarId of customVariableIds) {
        // Verificar si esta variable está asociada a otras campañas
        const otherCampaignVars = await CampaignCustomVariable.query()
          .where('customVarId', customVarId)
          .first()
        
        // Si no está asociada a ninguna otra campaña, eliminar la variable
        if (!otherCampaignVars) {
          const customVariable = await CustomVariable.find(customVarId)
          if (customVariable) {
            await customVariable.delete()
          }
        }
      }
      
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

  /**
   * Obtener todas las variables personalizadas del tenant
   */
  async getCustomVariables({ auth, response }: HttpContext) {
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
      // Obtener todas las variables personalizadas
      // Nota: Las variables personalizadas son globales, no están asociadas a un tenant específico
      // Si en el futuro necesitas filtrar por tenant, necesitarías agregar tenantId a custom_variables
      const customVariables = await CustomVariable.query()
        .orderBy('name', 'asc')
      
      return response.json({
        success: true,
        data: customVariables
      })
    } catch (error) {
      console.error('Error al obtener variables personalizadas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener variables personalizadas',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Crear una nueva variable personalizada
   */
  async createCustomVariable({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
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

    const data = request.only(['name', 'description', 'campaignId', 'stageId', 'valor'])

    // Validar que el nombre esté presente
    if (!data.name || !data.name.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la variable es obligatorio'
      })
    }

    const varName = data.name.trim()
    const varDescription = data.description?.trim() || null

    // Validar formato del nombre: solo letras, números y guiones bajos, debe empezar con letra o guión bajo
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la variable solo puede contener letras, números y guiones bajos, y debe empezar con letra o guión bajo'
      })
    }

    try {
      // Crear la variable personalizada con el valor si se proporcionó
      // Permitir crear variables con el mismo nombre
      const valor = data.valor?.trim() || null
      const customVariable = await CustomVariable.create({
        name: varName,
        description: varDescription,
        valor: valor
      })

      // Si se proporcionó campaignId, crear la relación en campaign_custom_variables
      if (data.campaignId) {
        const campaignId = parseInt(data.campaignId)

        // Verificar que la campaña existe y pertenece al tenant
        const campaign = await Campaign.query()
          .where('id', campaignId)
          .where('tenantId', tenantUser.tenantId)
          .first()

        if (campaign) {
          // Si se proporcionó stageId, crear solo registro de nivel etapa
          if (data.stageId) {
            const stageId = parseInt(data.stageId)
            
            // Verificar que la etapa existe y pertenece a la campaña
            const stage = await CampaignStage.query()
              .where('id', stageId)
              .where('campaignId', campaignId)
              .where('tenantId', tenantUser.tenantId)
              .first()

            if (stage) {
              // Verificar si ya existe un registro de nivel etapa antes de crear uno nuevo
              const existingStageRelation = await CampaignCustomVariable.query()
                .where('customVarId', customVariable.id)
                .where('campaignId', campaignId)
                .where('campaignStageId', stageId)
                .first()

              // Solo crear si no existe
              if (!existingStageRelation) {
                await CampaignCustomVariable.create({
                  customVarId: customVariable.id,
                  campaignId: campaignId,
                  campaignStageId: stageId
                })
              }
            }
          } else {
            // Si no hay stageId, crear solo registro de nivel campaña
            // Verificar si ya existe un registro antes de crear uno nuevo
            const existingCampaignRelation = await CampaignCustomVariable.query()
              .where('customVarId', customVariable.id)
              .where('campaignId', campaignId)
              .whereNull('campaignStageId')
              .first()

            // Solo crear si no existe
            if (!existingCampaignRelation) {
              await CampaignCustomVariable.create({
                customVarId: customVariable.id,
                campaignId: campaignId,
                campaignStageId: null // null para valores a nivel de campaña
              })
            }
          }
        }
      }

      return response.status(201).json({
        success: true,
        message: 'Variable personalizada creada exitosamente',
        data: customVariable
      })
    } catch (error) {
      console.error('Error al crear variable personalizada:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear la variable personalizada',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Actualizar una variable personalizada
   */
  async updateCustomVariable({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    
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

    const customVariable = await CustomVariable.find(params.id)

    if (!customVariable) {
      return response.status(404).json({
        success: false,
        message: 'Variable personalizada no encontrada'
      })
    }

    const { name, description, campaignId, valor } = request.only(['name', 'description', 'campaignId', 'valor'])

    if (!name || !name.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la variable es requerido'
      })
    }

    try {
      // Verificar que no exista otra variable con el mismo nombre
      const existingVar = await CustomVariable.query()
        .where('name', name.trim())
        .where('id', '!=', params.id)
        .first()

      if (existingVar) {
        return response.status(400).json({
          success: false,
          message: 'Ya existe una variable con ese nombre'
        })
      }

      customVariable.name = name.trim()
      if (description !== undefined) {
        customVariable.description = description?.trim() || null
      }
      
      // Actualizar el valor en custom_variables si se proporcionó
      if (valor !== undefined) {
        const valorStr = valor === null || valor === '' ? null : (typeof valor === 'string' ? valor.trim() : String(valor))
        customVariable.valor = valorStr || null
      }
      
      await customVariable.save()

      // Si se proporcionó campaignId, asegurarse de que exista la relación en campaign_custom_variables
      // (solo la relación, sin guardar valor porque ahora se guarda en custom_variables)
      if (campaignId) {
        const campaignIdInt = typeof campaignId === 'string' ? parseInt(campaignId) : campaignId

        // Verificar que la campaña existe y pertenece al tenant
        const campaign = await Campaign.query()
          .where('id', campaignIdInt)
          .where('tenantId', tenantUser.tenantId)
          .first()

        if (campaign) {
          // Verificar si existe CUALQUIER relación (nivel campaña o etapa) antes de crear una nueva
          const existingRelation = await CampaignCustomVariable.query()
            .where('customVarId', customVariable.id)
            .where('campaignId', campaignIdInt)
            .first()

          // Solo crear registro de nivel campaña si no existe NINGUNA relación
          // Esto evita crear registros duplicados cuando ya existe uno de nivel etapa
          if (!existingRelation) {
            await CampaignCustomVariable.create({
              customVarId: customVariable.id,
              campaignId: campaignIdInt,
              campaignStageId: null
            })
          }
        }
      }

      // Recargar la variable para obtener los datos actualizados después de todas las operaciones
      await customVariable.refresh()

      return response.status(200).json({
        success: true,
        message: 'Variable personalizada actualizada exitosamente',
        data: customVariable
      })
    } catch (error) {
      console.error('Error al actualizar variable personalizada:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error('Error stack:', errorStack)
      
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar la variable personalizada',
        error: errorMessage
      })
    }
  }

  /**
   * Eliminar una variable personalizada
   */
  async deleteCustomVariable({ params, response, auth }: HttpContext) {
    const user = auth.user!
    
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

    const customVariable = await CustomVariable.find(params.id)

    if (!customVariable) {
      return response.status(404).json({
        success: false,
        message: 'Variable personalizada no encontrada'
      })
    }

    try {
      // Las relaciones en campaign_custom_variables
      // se eliminarán automáticamente por el cascade delete
      await customVariable.delete()

      return response.json({
        success: true,
        message: 'Variable personalizada eliminada exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar variable personalizada:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar la variable personalizada',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}


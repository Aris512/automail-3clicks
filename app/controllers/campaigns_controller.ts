import type { HttpContext } from '@adonisjs/core/http'
import Campaign from '#models/campaign'
import CampaignList from '#models/campaign_list'
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
              description: varDescription
            })
            console.log(`[CAMPAIGN CREATE] Variable personalizada creada con ID: ${customVariable.id}`)
          } else {
            console.log(`[CAMPAIGN CREATE] Variable personalizada ya existe con ID: ${customVariable.id}`)
          }

          // Crear la relación en campaign_custom_variables con el valor
          console.log(`[CAMPAIGN CREATE] Creando relación campaign_custom_variables: campaignId=${campaign.id}, customVarId=${customVariable.id}, valor="${varValor}"`)
          const campaignCustomVar = await CampaignCustomVariable.create({
            customVarId: customVariable.id,
            campaignId: campaign.id,
            campaignStageId: null, // null = valor a nivel campaign
            valor: varValor
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

    // Obtener variables con valores a nivel campaign
    const campaignVariables = await CampaignCustomVariable.query()
      .where('campaignId', campaign.id)
      .whereNull('campaignStageId')
      .preload('customVariable')
    
    // Crear el array de variables con valores
    const customVariablesWithValues = campaignVariables.map(cv => ({
      id: cv.customVariable.id,
      name: cv.customVariable.name,
      description: cv.customVariable.description,
      valor: cv.valor
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
        // Obtener variables actuales a nivel campaign
        const currentCampaignVars = await CampaignCustomVariable.query()
          .where('campaignId', campaign.id)
          .whereNull('campaignStageId')

        // Eliminar todas las variables actuales a nivel campaign
        for (const cv of currentCampaignVars) {
          await cv.delete()
        }

        // Crear nuevas variables si se proporcionaron
        if (Array.isArray(data.customVariables) && data.customVariables.length > 0) {
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
                description: varDescription
              })
            }

            // Verificar si ya existe una relación para esta variable en esta campaña
            const existingRelation = await CampaignCustomVariable.query()
              .where('campaignId', campaign.id)
              .where('customVarId', customVariable.id)
              .whereNull('campaignStageId')
              .first()

            if (existingRelation) {
              existingRelation.valor = varValor
              await existingRelation.save()
            } else {
              // Crear la relación en campaign_custom_variables con el valor
              await CampaignCustomVariable.create({
                customVarId: customVariable.id,
                campaignId: campaign.id,
                campaignStageId: null,
                valor: varValor
              })
            }
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

    const data = request.only(['name', 'description', 'campaignId', 'valor'])

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
      // Verificar si la variable ya existe
      const existingVariable = await CustomVariable.query()
        .where('name', varName)
        .first()

      if (existingVariable) {
        return response.status(400).json({
          success: false,
          message: 'Ya existe una variable personalizada con este nombre'
        })
      }

      // Crear la variable personalizada
      const customVariable = await CustomVariable.create({
        name: varName,
        description: varDescription
      })

      // Si se proporcionó campaignId y valor, crear la relación en campaign_custom_variables
      if (data.campaignId && data.valor !== undefined) {
        const campaignId = parseInt(data.campaignId)
        const valor = data.valor?.trim() || null

        // Verificar que la campaña existe y pertenece al tenant
        const campaign = await Campaign.query()
          .where('id', campaignId)
          .where('tenantId', tenantUser.tenantId)
          .first()

        if (campaign) {
          await CampaignCustomVariable.create({
            customVarId: customVariable.id,
            campaignId: campaignId,
            campaignStageId: null, // null para valores a nivel de campaña
            valor: valor
          })
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
      customVariable.description = description?.trim() || null
      await customVariable.save()

      // Si se proporcionó campaignId, actualizar o crear la relación en campaign_custom_variables
      if (campaignId) {
        const campaignIdInt = typeof campaignId === 'string' ? parseInt(campaignId) : campaignId
        // Manejar el valor: si es undefined, mantener null; si es string, hacer trim; si es null, mantener null
        const valorStr = valor === undefined ? null : (typeof valor === 'string' ? (valor.trim() || null) : valor)

        // Verificar que la campaña existe y pertenece al tenant
        const campaign = await Campaign.query()
          .where('id', campaignIdInt)
          .where('tenantId', tenantUser.tenantId)
          .first()

        if (campaign) {
          // Buscar relación existente
          const existingRelation = await CampaignCustomVariable.query()
            .where('customVarId', customVariable.id)
            .where('campaignId', campaignIdInt)
            .whereNull('campaignStageId')
            .first()

          if (existingRelation) {
            // Actualizar valor existente
            existingRelation.valor = valorStr
            await existingRelation.save()
          } else {
            // Crear nueva relación
            await CampaignCustomVariable.create({
              customVarId: customVariable.id,
              campaignId: campaignIdInt,
              campaignStageId: null,
              valor: valorStr
            })
          }
        }
      }

      return response.json({
        success: true,
        message: 'Variable personalizada actualizada exitosamente',
        data: customVariable
      })
    } catch (error) {
      console.error('Error al actualizar variable personalizada:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar la variable personalizada',
        error: error instanceof Error ? error.message : 'Unknown error'
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
      // Las relaciones en campaign_custom_variables y template_custom_variables
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


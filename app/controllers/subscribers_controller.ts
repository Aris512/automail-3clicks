import type { HttpContext } from '@adonisjs/core/http'
import Subscriber from '#models/subscriber'
import TenantUser from '#models/tenant_user'
import List from '#models/list'
import SubscriberList from '#models/subscriber_list'
import { inject } from '@adonisjs/core'
import XLSX from 'xlsx'
import csv from 'csv-parser'
import { createReadStream } from 'fs'
import { DateTime } from 'luxon'

@inject()
export default class SubscribersController {
  /**
   * Crear lista automáticamente si no existe
   */
  private async createListIfNotExists(tenantId: number, tenantSlug: string, listName: string): Promise<number> {
    // Buscar si la lista ya existe
    const existingList = await List.query()
      .where('tenantId', tenantId)
      .where('name', listName)
      .first()
    
    if (existingList) {
      console.log(`📋 [CREATE_LIST] Lista existente encontrada: ${listName} (ID: ${existingList.id})`)
      return existingList.id
    }
    
    // Crear nueva lista usando el slug del tenant
    const newList = await List.create({
      tenantId: tenantId,
      name: listName,
      slug: tenantSlug,
      description: 'Lista creada automaticamente',
      status: 'active'
    })
    
    console.log(`✅ [CREATE_LIST] Nueva lista creada: ${listName} (ID: ${newList.id}) con slug del tenant: ${tenantSlug}`)
    return newList.id
  }
  /**
   * Display una lista de contactos
   */
  async index({ auth, inertia, session }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return inertia.render('auth/contactos', {
        user: auth.user,
        subscribers: [],
        lists: []
      })
    }

    const subscribers = await Subscriber.query()
      .where('tenantId', tenantUser.tenantId)
      .preload('lists')
      .orderBy('createdAt', 'desc')

    const lists = await List.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('createdAt', 'desc')
    
    return inertia.render('auth/contactos', {
      user: auth.user,
      subscribers,
      lists,
      flash: {
        success: session.get('success'),
        error: session.get('error')
      }
    })
  }


  /**
   * Crear uno o múltiples contactos
   */
  async store({ request, response, auth }: HttpContext) {
    console.log('🚀 [STORE] Iniciando creación de contacto(s)')
    
    const user = auth.user!
    console.log(`👤 [STORE] Usuario autenticado: ${user.email} (ID: ${user.id})`)
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      console.log('❌ [STORE] Usuario no tiene acceso a ningún tenant activo')
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    console.log(`🏢 [STORE] Tenant encontrado: ID ${tenantUser.tenantId}`)

    try {
      // Detectar si es un solo contacto o múltiples contactos
      const requestData = request.all()
      console.log('📋 [STORE] Datos recibidos:', Object.keys(requestData))
      
      let contacts: Array<{name: string, email: string, description?: string, status?: string, listIds?: number[]}> = []
      
      // Si viene un array de contactos (múltiples)
      if (requestData.contacts && Array.isArray(requestData.contacts)) {
        console.log(`📋 [STORE] Modo múltiple: ${requestData.contacts.length} contactos`)
        contacts = requestData.contacts
      } 
      // Si viene un solo contacto (modo individual)
      else if (requestData.name && requestData.email) {
        console.log('📋 [STORE] Modo individual: 1 contacto')
        contacts = [{
          name: requestData.name,
          email: requestData.email,
          description: requestData.description,
          status: requestData.status,
          listIds: requestData.listIds || []
        }]
      }
      else {
        console.log('❌ [STORE] No se proporcionaron datos válidos')
        return response.status(400).json({
          success: false,
          message: 'No se proporcionaron datos válidos'
        })
      }

      console.log(`📋 [STORE] Contactos a procesar: ${contacts.length}`)

      // Validar que todos los contactos tengan email y nombre
      const validContacts = contacts.filter(contact => 
        contact.email && contact.email.trim() && 
        contact.name && contact.name.trim()
      )

      if (validContacts.length === 0) {
        console.log('❌ [STORE] No hay contactos válidos')
        return response.status(400).json({
          success: false,
          message: 'Todos los contactos deben tener nombre y email'
        })
      }

      console.log(`✅ [STORE] Contactos válidos: ${validContacts.length}`)

      // Validar formato de emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = validContacts.filter(contact => !emailRegex.test(contact.email))
      
      if (invalidEmails.length > 0) {
        console.log(`❌ [STORE] Emails con formato inválido: ${invalidEmails.length}`)
        return response.status(400).json({
          success: false,
          message: `Se encontraron ${invalidEmails.length} emails con formato inválido`,
          invalidEmails: invalidEmails.map(contact => contact.email)
        })
      }

      console.log('✅ [STORE] Todos los emails tienen formato válido')

      // Verificar emails duplicados en la solicitud
      const emailSet = new Set()
      const duplicateEmails = []
      for (const contact of validContacts) {
        if (emailSet.has(contact.email)) {
          duplicateEmails.push(contact.email)
        } else {
          emailSet.add(contact.email)
        }
      }

      if (duplicateEmails.length > 0) {
        console.log(`❌ [STORE] Emails duplicados en solicitud: ${duplicateEmails.join(', ')}`)
        return response.status(400).json({
          success: false,
          message: 'hay correos duplicados'
        })
      }

      console.log('✅ [STORE] No hay duplicados en la solicitud')

      // Verificar emails que ya existen en la base de datos
      console.log('🔍 [STORE] Verificando emails existentes en la base de datos...')
      const existingEmails = await Subscriber.query()
        .where('tenantId', tenantUser.tenantId)
        .whereIn('email', validContacts.map(contact => contact.email))
        .select('email')

      const existingEmailList = existingEmails.map(sub => sub.email)
      console.log(`📋 [STORE] Emails existentes encontrados: ${existingEmailList.length}`)
      
      if (existingEmailList.length > 0) {
        console.log(`⚠️ [STORE] Emails ya existentes en BD: ${existingEmailList.join(', ')}`)
      }

      // Filtrar solo los emails nuevos
      const newContacts = validContacts.filter(contact => !existingEmailList.includes(contact.email))
      const duplicateContacts = validContacts.filter(contact => existingEmailList.includes(contact.email))
      
      console.log(`🆕 [STORE] Contactos nuevos para insertar: ${newContacts.length}`)
      console.log(`⚠️ [STORE] Contactos duplicados encontrados: ${duplicateContacts.length}`)
      
      // Si hay emails duplicados, devolver error específico
      if (duplicateContacts.length > 0) {
        const duplicateEmails = duplicateContacts.map(contact => contact.email)
        console.log(`❌ [STORE] Emails duplicados: ${duplicateEmails.join(', ')}`)
        
        return response.status(409).json({
          success: false,
          message: 'hay correos duplicados'
        })
      }
      
      if (newContacts.length === 0) {
        console.log('ℹ️ [STORE] Todos los emails ya existen en la base de datos')
        return response.status(200).json({
          success: true,
          message: `Todos los emails ya existen en la base de datos. No se agregaron nuevos contactos.`,
          imported: 0,
          skipped: validContacts.length,
          skippedEmails: existingEmailList
        })
      }

      // Insertar los nuevos contactos
      console.log('💾 [STORE] Preparando datos para inserción...')
      const contactsToInsert = newContacts.map(contact => ({
        email: contact.email.trim(),
        name: contact.name.trim(),
        description: contact.description?.trim() || '',
        tenantId: tenantUser.tenantId,
        status: (contact.status as 'active' | 'inactive' | 'archived') || 'active'
      }))

      console.log(`💾 [STORE] Insertando ${contactsToInsert.length} contactos en la base de datos...`)
      const createdSubscribers = await Subscriber.createMany(contactsToInsert)

      console.log(`✅ [STORE] Inserción completada exitosamente: ${newContacts.length} contactos nuevos`)

      // Asociar contactos con listas individuales
      console.log(`🔗 [STORE] Procesando asociaciones de listas para ${createdSubscribers.length} contactos...`)
      
      // Verificar que las listas pertenezcan al tenant (obtener todas las listas válidas de una vez)
      const allListIds = new Set<number>()
      for (const contact of newContacts) {
        if (contact.listIds && contact.listIds.length > 0) {
          contact.listIds.forEach(id => allListIds.add(id))
        }
      }
      
      // Si hay listas específicas, validarlas
      let validListIds: number[] = []
      
      if (allListIds.size > 0) {
        const validLists = await List.query()
          .where('tenantId', tenantUser.tenantId)
          .whereIn('id', Array.from(allListIds))
          .select('id')
        
        validListIds = validLists.map(list => list.id)
        console.log(`🔗 [STORE] Listas válidas encontradas: ${validListIds.join(', ')}`)
      }
      
      if (validListIds.length > 0) {
        // Crear las asociaciones en subscriber_lists para cada contacto individualmente
        const subscriberListAssociations = []
        
        for (let i = 0; i < createdSubscribers.length; i++) {
          const subscriber = createdSubscribers[i]
          const contact = newContacts[i]
          
          let contactListIds: number[] = []
          
          if (contact.listIds && contact.listIds.length > 0) {
            // Solo agregar listas que sean válidas para el tenant
            contactListIds = contact.listIds.filter(id => validListIds.includes(id))
          }
          
          for (const listId of contactListIds) {
            subscriberListAssociations.push({
              subscriber_id: subscriber.id,
              list_id: listId,
              source: 'manual' as const,
              status: 'active' as const,
              subscribed_at: DateTime.now()
            })
          }
        }
        
        if (subscriberListAssociations.length > 0) {
          await SubscriberList.createMany(subscriberListAssociations)
          console.log(`✅ [STORE] Asociaciones con listas creadas: ${subscriberListAssociations.length}`)
        }
      }

      // Preparar respuesta
      const responseMessage = existingEmailList.length > 0 
        ? `Se agregaron ${newContacts.length} contactos nuevos. Se omitieron ${existingEmailList.length} emails que ya existían.`
        : `Se agregaron exitosamente ${newContacts.length} contactos nuevos.`

      // Si es un solo contacto, devolver el formato original para compatibilidad
      if (contacts.length === 1 && newContacts.length === 1) {
        return response.status(201).json({
          success: true,
          message: responseMessage,
          data: createdSubscribers[0],
          imported: newContacts.length,
          skipped: existingEmailList.length,
          skippedEmails: existingEmailList
        })
      }

      return response.status(201).json({
        success: true,
        message: responseMessage,
        imported: newContacts.length,
        skipped: existingEmailList.length,
        skippedEmails: existingEmailList,
        importedEmails: newContacts.map(contact => contact.email),
        data: createdSubscribers
      })

    } catch (error) {
      console.error('💥 [STORE] Error durante la creación:', error)
      console.error('💥 [STORE] Stack trace:', error.stack)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar los contactos'
      })
    }
  }

  /**
   * Handle form para editar un contacto
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

    const subscriber = await Subscriber.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    const data = request.only(['name', 'email', 'description', 'status', 'listIds'])
    
    // Validaciones básicas
    if (!data.name || !data.email) {
      return response.status(400).json({
        success: false,
        message: 'El nombre y email son requeridos'
      })
    }

    // Validar que el status sea uno de los valores permitidos
    const allowedStatuses = ['active', 'inactive', 'archived']
    if (data.status && !allowedStatuses.includes(data.status)) {
      return response.status(400).json({
        success: false,
        message: 'El estado debe ser: activo, inactivo o archivado'
      })
    }

    // Verificar si el email ya existe en otro contacto del mismo tenant
    const existingSubscriber = await Subscriber.query()
      .where('email', data.email)
      .where('tenantId', tenantUser.tenantId)
      .where('id', '!=', params.id)
      .first()

    if (existingSubscriber) {
      return response.status(409).json({
        success: false,
        message: 'Ya existe otro contacto con este email'
      })
    }

    try {
      // Separar los datos del suscriptor de los datos de las listas
      const { listIds, ...subscriberData } = data
      
      subscriber.merge(subscriberData)
      await subscriber.save()
      
      // Actualizar las listas asignadas si se proporcionaron listIds
      if (listIds && Array.isArray(listIds)) {
        // Verificar que las listas pertenezcan al tenant
        const validLists = await List.query()
          .where('tenantId', tenantUser.tenantId)
          .whereIn('id', listIds)
          .select('id')
        
        const validListIds = validLists.map(list => list.id)
        
        // Eliminar todas las asociaciones existentes
        await SubscriberList.query()
          .where('subscriber_id', subscriber.id)
          .delete()
        
        // Crear las nuevas asociaciones
        if (validListIds.length > 0) {
          const subscriberListAssociations = validListIds.map(listId => ({
            subscriber_id: subscriber.id,
            list_id: listId,
            source: 'manual' as const,
            status: 'active' as const,
            subscribed_at: DateTime.now()
          }))
          
          await SubscriberList.createMany(subscriberListAssociations)
        }
      }
      
      return response.status(200).json({
        success: true,
        message: 'Contacto actualizado exitosamente',
        data: subscriber
      })
    } catch (error) {
      console.error('Error al actualizar contacto:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar el contacto'
      })
    }
  }

  /**
   * Eliminar un contacto
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
      const subscriber = await Subscriber.query()
        .where('id', params.id)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()
      
      await subscriber.delete()
      
      return response.status(200).json({
        success: true,
        message: 'Contacto eliminado exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar contacto:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar el contacto'
      })
    }
  }



  /**
   * Handle public subscription from external forms
   */
  async publicSubscribe({ request, response }: HttpContext) {
    try {
      // Configurar headers CORS para formularios HTML
      response.header('Access-Control-Allow-Origin', '*')
      response.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
      response.header('Access-Control-Allow-Headers', 'Content-Type')
      
      // Manejar preflight OPTIONS request
      if (request.method() === 'OPTIONS') {
        return response.status(200).send('OK')
      }

      // Obtener datos del formulario
      const { email, name, description, listIds } = request.only([
        'email', 'name', 'description', 'listIds'
      ])

      // Validaciones básicas
      if (!email) {
        return response.status(400).json({
          success: false,
          message: 'El email es requerido'
        })
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return response.status(400).json({
          success: false,
          message: 'El formato del email no es válido'
        })
      }

      // Buscar el tenant por defecto (puedes ajustar esta lógica según tu necesidad)
      // Por ahora usaremos el primer tenant activo
      const tenantUser = await TenantUser.query()
        .where('active', true)
        .first()

      if (!tenantUser) {
        return response.status(500).json({
          success: false,
          message: 'Error del servidor: No hay tenant disponible'
        })
      }

      // Verificar si el email ya existe en este tenant
      const existingSubscriber = await Subscriber.query()
        .where('email', email)
        .where('tenantId', tenantUser.tenantId)
        .first()

      if (existingSubscriber) {
        return response.status(409).json({
          success: false,
          message: 'Este email ya está registrado'
        })
      }

      // Crear el nuevo suscriptor
      const subscriber = await Subscriber.create({
        email,
        name: name || '',
        description: description || '',
        tenantId: tenantUser.tenantId,
        status: 'active'
      })

      // Asociar con listas si se proporcionaron listIds
      if (listIds && Array.isArray(listIds) && listIds.length > 0) {
        // Verificar que las listas pertenezcan al tenant
        const validLists = await List.query()
          .where('tenantId', tenantUser.tenantId)
          .whereIn('id', listIds)
          .select('id')
        
        const validListIds = validLists.map(list => list.id)
        
        if (validListIds.length > 0) {
          // Crear las asociaciones en subscriber_lists
          const subscriberListAssociations = validListIds.map(listId => ({
            subscriberId: subscriber.id,
            listId: listId
          }))
          
          await SubscriberList.createMany(subscriberListAssociations)
        }
      }

      // Detectar si es una petición desde formulario HTML o API
      const acceptHeader = request.header('accept') || ''
      const isHtmlRequest = acceptHeader.includes('text/html') || 
                           request.header('content-type')?.includes('application/x-www-form-urlencoded')

      if (isHtmlRequest) {
        // Respuesta HTML para formularios
        return response.status(201).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Suscripción Exitosa</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
              .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; }
              .success { color: #059669; font-size: 48px; margin-bottom: 20px; }
              h1 { color: #111827; margin-bottom: 10px; }
              p { color: #6b7280; margin-bottom: 20px; }
              .back-btn { background: #f97316; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
              .back-btn:hover { background: #ea580c; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success">✓</div>
              <h1>¡Suscripción Exitosa!</h1>
              <p>Gracias por suscribirte. Hemos recibido tu información correctamente.</p>
              <button class="back-btn" onclick="history.back()">Volver</button>
            </div>
          </body>
          </html>
        `)
      } else {
        // Respuesta JSON para APIs
        return response.status(201).json({
          success: true,
          message: 'Suscripción exitosa',
          data: {
            id: subscriber.id,
            email: subscriber.email,
            name: subscriber.name
          }
        })
      }

    } catch (error) {
      console.error('Error en publicSubscribe:', error)
      
      // Detectar si es una petición desde formulario HTML
      const acceptHeader = request.header('accept') || ''
      const isHtmlRequest = acceptHeader.includes('text/html') || 
                           request.header('content-type')?.includes('application/x-www-form-urlencoded')
      
      if (isHtmlRequest) {
        // Respuesta HTML para errores en formularios
        return response.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Error en Suscripción</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
              .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; }
              .error { color: #dc2626; font-size: 48px; margin-bottom: 20px; }
              h1 { color: #111827; margin-bottom: 10px; }
              p { color: #6b7280; margin-bottom: 20px; }
              .back-btn { background: #f97316; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
              .back-btn:hover { background: #ea580c; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">✗</div>
              <h1>Error en Suscripción</h1>
              <p>Hubo un problema al procesar tu suscripción. Por favor, inténtalo de nuevo.</p>
              <button class="back-btn" onclick="history.back()">Volver</button>
            </div>
          </body>
          </html>
        `)
      } else {
        // Respuesta JSON para errores en APIs
        return response.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        })
      }
    }
  }

  /**
   * Handle public subscription from external forms
   */
  async publicIndex({ request, response, auth }: HttpContext) {
    try {
      // Configurar headers CORS
      response.header('Access-Control-Allow-Origin', '*')
      response.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
      response.header('Access-Control-Allow-Headers', 'Content-Type')
      
      console.log('🔄 [PUBLIC_INDEX] Iniciando consulta de contactos')
      
      // Si el usuario está autenticado, filtrar por su tenant
      if (auth.user) {
        console.log(`👤 [PUBLIC_INDEX] Usuario autenticado: ${auth.user.email} (ID: ${auth.user.id})`)
        
        // Obtener el tenant del usuario autenticado
        const tenantUser = await TenantUser.query()
          .where('userId', auth.user.id)
          .where('active', true)
          .first()

        if (!tenantUser) {
          console.log('❌ [PUBLIC_INDEX] Usuario no tiene acceso a ningún tenant activo')
          return response.status(400).json({
            success: false,
            message: 'Usuario no tiene acceso a ningún tenant activo'
          })
        }

        console.log(`🏢 [PUBLIC_INDEX] Tenant encontrado: ID ${tenantUser.tenantId}`)

        // Obtener solo los subscribers del tenant del usuario autenticado
        const subscribers = await Subscriber.query()
          .where('tenantId', tenantUser.tenantId)
          .preload('lists')
          .orderBy('createdAt', 'desc')

        console.log(`📋 [PUBLIC_INDEX] Contactos encontrados para tenant ${tenantUser.tenantId}: ${subscribers.length}`)

        return response.json({
          success: true,
          data: subscribers
        })
      }
      
      // Si no está autenticado, usar el comportamiento original
      console.log('👤 [PUBLIC_INDEX] Usuario no autenticado, usando comportamiento público')
      
      // Obtener tenantId opcional de query params
      const tenantId = request.qs().tenantId
      
      let query = Subscriber.query()
      
      // Si se especifica tenantId, filtrar por ese tenant
      if (tenantId) {
        console.log(`🏢 [PUBLIC_INDEX] Filtrando por tenantId: ${tenantId}`)
        query = query.where('tenantId', tenantId)
      }
      
      // Devolver todos los subscribers independientemente del estado
      const subscribers = await query
        .preload('lists')
        .orderBy('createdAt', 'desc')
      
      console.log(`📋 [PUBLIC_INDEX] Contactos encontrados (público): ${subscribers.length}`)
      
      return response.json({
        success: true,
        data: subscribers
      })
    } catch (error) {
      console.error('💥 [PUBLIC_INDEX] Error al obtener contactos:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener la lista de contactos'
      })
    }
  }

  /**
   * Importar contactos desde archivos CSV, XLSX o XLS
   */
  async import({ request, response, auth }: HttpContext) {
    console.log('🚀 [IMPORT] Iniciando proceso de importación de contactos')
    
    const user = auth.user!
    console.log(`👤 [IMPORT] Usuario autenticado: ${user.email} (ID: ${user.id})`)
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .preload('tenant')
      .first()

    if (!tenantUser) {
      console.log('❌ [IMPORT] Usuario no tiene acceso a ningún tenant activo')
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    console.log(`🏢 [IMPORT] Tenant encontrado: ID ${tenantUser.tenantId}, Slug: ${tenantUser.tenant.slug}`)

    try {
      console.log('📁 [IMPORT] Procesando archivo subido...')
      
      // Obtener el archivo subido y las listas seleccionadas
      const file = request.file('file', {
        size: '15mb',
        extnames: ['csv', 'xls', 'xlsx']
      })

      // Obtener las listas seleccionadas del frontend
      const selectedListIds = request.input('listIds', '[]')
      let importListIds: number[] = []
      
      try {
        importListIds = JSON.parse(selectedListIds)
        console.log(`📋 [IMPORT] Listas seleccionadas para importación: ${importListIds.join(', ')}`)
      } catch (error) {
        console.log('⚠️ [IMPORT] Error al parsear listIds, usando array vacío')
        importListIds = []
      }

      if (!file) {
        console.log('❌ [IMPORT] No se proporcionó archivo válido')
        return response.status(400).json({
          success: false,
          message: 'No se ha proporcionado un archivo válido'
        })
      }

      console.log(`📄 [IMPORT] Archivo recibido: ${file.clientName}`)
      console.log(`📊 [IMPORT] Tamaño del archivo: ${file.size} bytes`)
      console.log(`🔖 [IMPORT] Extensión del archivo: ${file.extname}`)
      console.log(`📍 [IMPORT] Ruta temporal: ${file.tmpPath}`)

      // Validar tamaño del archivo (15MB máximo)
      const maxSize = 15 * 1024 * 1024 // 15MB en bytes
      if (file.size! > maxSize) {
        console.log(`❌ [IMPORT] Archivo excede tamaño máximo: ${file.size} bytes > ${maxSize} bytes`)
        return response.status(400).json({
          success: false,
          message: 'El archivo excede el tamaño máximo permitido de 15MB'
        })
      }

      // Validar extensión del archivo
      const allowedExtensions = ['csv', 'xls', 'xlsx']
      const fileExtension = file.extname?.toLowerCase()
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        console.log(`❌ [IMPORT] Extensión no válida: ${fileExtension}`)
        return response.status(400).json({
          success: false,
          message: 'Formato de archivo no válido. Solo se permiten archivos CSV, XLS y XLSX'
        })
      }

      console.log(`✅ [IMPORT] Validaciones de archivo pasadas correctamente`)

      let subscribers: Array<{ email: string; name?: string; description?: string; list?: string }> = []

      // Procesar según el tipo de archivo
      if (fileExtension === 'csv') {
        console.log('📝 [IMPORT] Procesando archivo CSV...')
        subscribers = await this.parseCSVFile(file.tmpPath!)
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        console.log('📊 [IMPORT] Procesando archivo Excel...')
        subscribers = await this.parseExcelFile(file.tmpPath!)
      }

      console.log(`📋 [IMPORT] Contactos extraídos del archivo: ${subscribers.length}`)

      if (subscribers.length === 0) {
        console.log('❌ [IMPORT] No se encontraron datos válidos en el archivo')
        return response.status(400).json({
          success: false,
          message: 'No se encontraron datos válidos en el archivo'
        })
      }

      // Mostrar algunos ejemplos de los datos extraídos
      console.log('📝 [IMPORT] Primeros 3 contactos extraídos:')
      subscribers.slice(0, 3).forEach((sub, index) => {
        console.log(`   ${index + 1}. Email: ${sub.email}, Nombre: ${sub.name || 'N/A'}, Descripción: ${sub.description || 'N/A'}, Lista: ${sub.list || 'N/A'}`)
      })

      // Validar que todos los emails sean válidos
      console.log('🔍 [IMPORT] Validando formato de emails...')
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = subscribers.filter(sub => !emailRegex.test(sub.email))
      
      if (invalidEmails.length > 0) {
        console.log(`❌ [IMPORT] Emails con formato inválido encontrados: ${invalidEmails.length}`)
        invalidEmails.forEach(email => console.log(`   - ${email.email}`))
        return response.status(400).json({
          success: false,
          message: `Se encontraron ${invalidEmails.length} emails con formato inválido`,
          invalidEmails: invalidEmails.map(sub => sub.email)
        })
      }

      console.log('✅ [IMPORT] Todos los emails tienen formato válido')

      // Verificar emails duplicados en el archivo
      console.log('🔍 [IMPORT] Verificando duplicados en el archivo...')
      const emailSet = new Set()
      const duplicateEmails = []
      for (const sub of subscribers) {
        if (emailSet.has(sub.email)) {
          duplicateEmails.push(sub.email)
        } else {
          emailSet.add(sub.email)
        }
      }

      if (duplicateEmails.length > 0) {
        console.log(`❌ [IMPORT] Emails duplicados en archivo: ${duplicateEmails.join(', ')}`)
        return response.status(400).json({
          success: false,
          message: 'hay correos duplicados'
        })
      }

      console.log('✅ [IMPORT] No hay duplicados en el archivo')

      // Verificar emails que ya existen en la base de datos
      console.log('🔍 [IMPORT] Verificando emails existentes en la base de datos...')
      const existingEmails = await Subscriber.query()
        .where('tenantId', tenantUser.tenantId)
        .whereIn('email', subscribers.map(sub => sub.email))
        .select('email')

      const existingEmailList = existingEmails.map(sub => sub.email)
      console.log(`📋 [IMPORT] Emails existentes encontrados: ${existingEmailList.length}`)
      
      if (existingEmailList.length > 0) {
        console.log(`⚠️ [IMPORT] Emails ya existentes en BD: ${existingEmailList.join(', ')}`)
      }

      // Filtrar solo los emails nuevos (que no existen en la base de datos)
      const newSubscribers = subscribers.filter(sub => !existingEmailList.includes(sub.email))
      console.log(`🆕 [IMPORT] Emails nuevos para importar: ${newSubscribers.length}`)
      
      if (newSubscribers.length === 0) {
        console.log('ℹ️ [IMPORT] Todos los emails ya existen en la base de datos')
        return response.status(200).json({
          success: true,
          message: `Todos los emails del archivo ya existen en la base de datos. No se importaron nuevos contactos.`,
          imported: 0,
          skipped: subscribers.length,
          skippedEmails: existingEmailList
        })
      }

      // Insertar solo los nuevos subscribers
      console.log('💾 [IMPORT] Preparando datos para inserción de emails nuevos...')
      const subscribersToInsert = newSubscribers.map(sub => ({
        email: sub.email,
        name: sub.name || '',
        description: sub.description || '',
        tenantId: tenantUser.tenantId,
        status: 'active' as const
      }))

      console.log(`💾 [IMPORT] Insertando ${subscribersToInsert.length} contactos nuevos en la base de datos...`)
      const createdSubscribers = await Subscriber.createMany(subscribersToInsert)

      console.log(`✅ [IMPORT] Importación completada exitosamente: ${newSubscribers.length} contactos nuevos`)

      // Asociar contactos importados con listas específicas
      console.log(`🔗 [IMPORT] Asociando contactos importados con listas...`)
      
      // Validar que las listas seleccionadas pertenezcan al tenant
      let validImportListIds: number[] = []
      
      if (importListIds.length > 0) {
        const validLists = await List.query()
          .where('tenantId', tenantUser.tenantId)
          .whereIn('id', importListIds)
          .select('id')
        
        validImportListIds = validLists.map(list => list.id)
        console.log(`🔗 [IMPORT] Listas válidas para importación: ${validImportListIds.join(', ')}`)
      }
      
      // Procesar listas específicas del archivo (si las hay)
      const listNamesFromFile = [...new Set(newSubscribers.map(sub => sub.list).filter(list => list && list.trim()))]
      console.log(`🔗 [IMPORT] Listas encontradas en el archivo: ${listNamesFromFile.join(', ') || 'Ninguna'}`)
      
      // Crear o obtener IDs de listas del archivo
      const listIdMap = new Map<string, number>()
      
      for (const listName of listNamesFromFile) {
        if (listName && listName.trim()) {
          const listId = await this.createListIfNotExists(tenantUser.tenantId, tenantUser.tenant.slug, listName.trim())
          listIdMap.set(listName.trim(), listId)
        }
      }
      
      // Crear las asociaciones en subscriber_lists
      const subscriberListAssociations = []
      
      for (let i = 0; i < createdSubscribers.length; i++) {
        const subscriber = createdSubscribers[i]
        const originalSubscriber = newSubscribers[i]
        
        const listIdsToAssign: number[] = []
        
        // Agregar listas seleccionadas por el usuario
        listIdsToAssign.push(...validImportListIds)
        
        // Agregar lista específica del archivo (si existe)
        if (originalSubscriber.list && originalSubscriber.list.trim()) {
          const fileListId = listIdMap.get(originalSubscriber.list.trim())
          if (fileListId && !listIdsToAssign.includes(fileListId)) {
            listIdsToAssign.push(fileListId)
          }
        }
        
        // Crear asociaciones para todas las listas
        for (const listId of listIdsToAssign) {
          subscriberListAssociations.push({
            subscriber_id: subscriber.id,
            list_id: listId,
            source: 'import' as const,
            status: 'active' as const,
            subscribed_at: DateTime.now()
          })
        }
      }
      
      if (subscriberListAssociations.length > 0) {
        await SubscriberList.createMany(subscriberListAssociations)
        console.log(`✅ [IMPORT] Asociaciones con listas creadas: ${subscriberListAssociations.length}`)
      } else {
        console.log(`⚠️ [IMPORT] No se encontraron listas válidas, los contactos se importaron sin lista asignada`)
      }

      // Preparar respuesta con información detallada
      const responseMessage = existingEmailList.length > 0 
        ? `Se importaron ${newSubscribers.length} contactos nuevos. Se omitieron ${existingEmailList.length} emails que ya existían.`
        : `Se importaron exitosamente ${newSubscribers.length} contactos nuevos.`

      return response.status(201).json({
        success: true,
        message: responseMessage,
        imported: newSubscribers.length,
        skipped: existingEmailList.length,
        skippedEmails: existingEmailList,
        importedEmails: newSubscribers.map(sub => sub.email)
      })

    } catch (error) {
      console.error('💥 [IMPORT] Error durante la importación:', error)
      console.error('💥 [IMPORT] Stack trace:', error.stack)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar el archivo'
      })
    }
  }

  /**
   * Parsear archivo CSV
   */
  private async parseCSVFile(filePath: string): Promise<Array<{ email: string; name?: string; description?: string; list?: string }>> {
    console.log(`📝 [CSV] Iniciando parsing de archivo CSV: ${filePath}`)
    
    return new Promise((resolve, reject) => {
      const results: Array<{ email: string; name?: string; description?: string; list?: string }> = []
      let rowCount = 0
      
      const stream = createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({
          separator: ','
        }))

      stream.on('data', (row) => {
        rowCount++
        console.log(`📝 [CSV] Procesando fila ${rowCount}:`, Object.keys(row))
        
        // Normalizar nombres de columnas (case insensitive)
        const normalizedRow: any = {}
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key]
        })

        console.log(`📝 [CSV] Columnas normalizadas:`, Object.keys(normalizedRow))

        // Verificar que existe la columna email
        if (normalizedRow.email && normalizedRow.email.trim()) {
          const subscriber = {
            email: normalizedRow.email.trim(),
            name: normalizedRow.name?.trim() || '',
            description: normalizedRow.description?.trim() || '',
            list: normalizedRow.list?.trim() || normalizedRow.lista?.trim() || ''
          }
          results.push(subscriber)
          console.log(`📝 [CSV] Contacto agregado: ${subscriber.email} - Lista: ${subscriber.list || 'N/A'}`)
        } else {
          console.log(`⚠️ [CSV] Fila ${rowCount} omitida - sin email válido`)
        }
      })

      stream.on('end', () => {
        console.log(`✅ [CSV] Parsing completado: ${results.length} contactos de ${rowCount} filas`)
        resolve(results)
      })

      stream.on('error', (error) => {
        console.error(`💥 [CSV] Error durante parsing:`, error)
        reject(error)
      })
    })
  }

  /**
   * Parsear archivo Excel (XLSX/XLS)
   */
  private async parseExcelFile(filePath: string): Promise<Array<{ email: string; name?: string; description?: string; list?: string }>> {
    console.log(`📊 [EXCEL] Iniciando parsing de archivo Excel: ${filePath}`)
    
    try {
      const workbook = XLSX.readFile(filePath)
      console.log(`📊 [EXCEL] Hojas disponibles: ${workbook.SheetNames.join(', ')}`)
      
      const sheetName = workbook.SheetNames[0]
      
      if (!sheetName) {
        console.log('❌ [EXCEL] No se encontraron hojas de cálculo en el archivo')
        throw new Error('No se encontraron hojas de cálculo en el archivo')
      }

      console.log(`📊 [EXCEL] Procesando hoja: ${sheetName}`)
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      console.log(`📊 [EXCEL] Total de filas encontradas: ${jsonData.length}`)

      if (jsonData.length < 2) {
        console.log('❌ [EXCEL] El archivo debe contener al menos una fila de encabezados y una fila de datos')
        throw new Error('El archivo debe contener al menos una fila de encabezados y una fila de datos')
      }

      // Obtener encabezados (primera fila)
      const headers = jsonData[0] as string[]
      console.log(`📊 [EXCEL] Encabezados encontrados: ${headers.join(', ')}`)
      
      const normalizedHeaders = headers.map(header => header.toLowerCase().trim())
      console.log(`📊 [EXCEL] Encabezados normalizados: ${normalizedHeaders.join(', ')}`)

      // Buscar índices de las columnas requeridas
      const emailIndex = normalizedHeaders.findIndex(header => header === 'email')
      
      if (emailIndex === -1) {
        console.log('❌ [EXCEL] No se encontró columna "email"')
        throw new Error('El archivo debe contener una columna "email"')
      }

      const nameIndex = normalizedHeaders.findIndex(header => header === 'name')
      const descriptionIndex = normalizedHeaders.findIndex(header => header === 'description')
      const listIndex = normalizedHeaders.findIndex(header => header === 'list' || header === 'lista')

      console.log(`📊 [EXCEL] Índices encontrados - Email: ${emailIndex}, Nombre: ${nameIndex}, Descripción: ${descriptionIndex}, Lista: ${listIndex}`)

      // Procesar filas de datos
      const results: Array<{ email: string; name?: string; description?: string; list?: string }> = []
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[]
        console.log(`📊 [EXCEL] Procesando fila ${i}:`, row)
        
        if (row[emailIndex] && row[emailIndex].toString().trim()) {
          const subscriber = {
            email: row[emailIndex].toString().trim(),
            name: nameIndex !== -1 && row[nameIndex] ? row[nameIndex].toString().trim() : '',
            description: descriptionIndex !== -1 && row[descriptionIndex] ? row[descriptionIndex].toString().trim() : '',
            list: listIndex !== -1 && row[listIndex] ? row[listIndex].toString().trim() : ''
          }
          results.push(subscriber)
          console.log(`📊 [EXCEL] Contacto agregado: ${subscriber.email} - Lista: ${subscriber.list || 'N/A'}`)
        } else {
          console.log(`⚠️ [EXCEL] Fila ${i} omitida - sin email válido`)
        }
      }

      console.log(`✅ [EXCEL] Parsing completado: ${results.length} contactos de ${jsonData.length - 1} filas de datos`)
      return results
    } catch (error) {
      console.error(`💥 [EXCEL] Error durante parsing:`, error)
      throw new Error(`Error al procesar archivo Excel: ${error.message}`)
    }
  }

  
}
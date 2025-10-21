import type { HttpContext } from '@adonisjs/core/http'
import Subscriber from '#models/subscriber'
import TenantUser from '#models/tenant_user'
import { inject } from '@adonisjs/core'

@inject()
export default class SubscribersController {
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
        subscribers: []
      })
    }

    const subscribers = await Subscriber.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('createdAt', 'desc')
    
    return inertia.render('auth/contactos', {
      user: auth.user,
      subscribers,
      flash: {
        success: session.get('success'),
        error: session.get('error')
      }
    })
  }


  /**
   * Crear un nuevo contacto
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

    // Validar datos
    const data = request.only(['name', 'email', 'description', 'status'])
    
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

    // Verificar si el email ya existe en este tenant
    const existingSubscriber = await Subscriber.query()
      .where('email', data.email)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (existingSubscriber) {
      return response.status(409).json({
        success: false,
        message: 'Ya existe un contacto con este email'
      })
    }

    try {
      const subscriber = await Subscriber.create({
        name: data.name,
        email: data.email,
        description: data.description || null,
        status: data.status || 'active',
        tenantId: tenantUser.tenantId
      })

      return response.status(201).json({
        success: true,
        message: 'Contacto agregado exitosamente',
        data: subscriber
      })
    } catch (error) {
      console.error('Error al crear contacto:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear el contacto'
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
    
    const data = request.only(['name', 'email', 'description', 'status'])
    
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
      subscriber.merge(data)
      await subscriber.save()
      
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
   * Importar contactos desde CSV
   */
  async import({ response }: HttpContext) {
    // TODO: Implement CSV import functionality
    return response.json({ message: 'Import functionality will be implemented' })
  }

  /**
   * Exportar contactos a CSV
   */
  async export({ response }: HttpContext) {
    // TODO: Implement CSV export functionality
    return response.json({ message: 'Export functionality will be implemented' })
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
      const { email, name, description, company, listId } = request.only([
        'email', 'name', 'description', 'company', 'listId'
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
        company: company || '',
        tenantId: tenantUser.tenantId,
        status: 'active'
      })

      // Si se proporcionó listId, agregar a la lista
      if (listId) {
        // Aquí podrías agregar lógica para asociar el suscriptor a una lista específica
        // Por ahora solo creamos el suscriptor
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
  async publicIndex({ request, response }: HttpContext) {
    try {
      // Configurar headers CORS
      response.header('Access-Control-Allow-Origin', '*')
      response.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
      response.header('Access-Control-Allow-Headers', 'Content-Type')
      
      // Obtener tenantId opcional de query params
      const tenantId = request.qs().tenantId
      
      let query = Subscriber.query()
      
      // Si se especifica tenantId, filtrar por ese tenant
      if (tenantId) {
        query = query.where('tenantId', tenantId)
      }
      
      // Devolver todos los subscribers independientemente del estado
      const subscribers = await query
        .orderBy('createdAt', 'desc')
        .select(['id', 'name', 'email', 'description', 'status', 'createdAt'])
      
      return response.json({
        success: true,
        data: subscribers
      })
    } catch (error) {
      console.error('Error en publicIndex:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener la lista de contactos'
      })
    }
  }
}
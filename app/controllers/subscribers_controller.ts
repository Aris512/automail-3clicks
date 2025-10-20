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
   * Display form para crear un nuevo contacto
   */
  async create({ auth, inertia }: HttpContext) {
    return inertia.render('auth/subscribers/create', {
      user: auth.user
    })
  }

  /**
   * Handle form para crear un nuevo contacto
   */
  async store({ request, response, auth, session }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      session.flash('error', 'Usuario no tiene acceso a ningún tenant activo')
      return response.redirect().back()
    }

    // Validar datos
    const data = request.only(['name', 'email', 'description', 'status'])
    
    // Validaciones básicas
    if (!data.name || !data.email) {
      session.flash('error', 'El nombre y email son requeridos')
      return response.redirect().back()
    }

    // Validar que el status sea uno de los valores permitidos
    const allowedStatuses = ['active', 'inactive', 'archived']
    if (data.status && !allowedStatuses.includes(data.status)) {
      session.flash('error', 'El estado debe ser: activo, inactivo o archivado')
      return response.redirect().back()
    }

    // Verificar si el email ya existe en este tenant
    const existingSubscriber = await Subscriber.query()
      .where('email', data.email)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (existingSubscriber) {
      session.flash('error', 'Ya existe un contacto con este email')
      return response.redirect().back()
    }

    try {
      await Subscriber.create({
        name: data.name,
        email: data.email,
        description: data.description || null,
        status: data.status || 'active',
        tenantId: tenantUser.tenantId
      })

      // Para Inertia, necesitamos redirigir de vuelta a la página de contactos
      // con un mensaje de éxito en la sesión
      session.flash('success', 'Contacto agregado exitosamente')
      return response.redirect().back()
    } catch (error) {
      console.error('Error al crear contacto:', error)
      session.flash('error', 'Error al crear el contacto')
      return response.redirect().back()
    }
  }

  /**
   * Mostrar un contacto individual
   */
  async show({ params, auth, inertia, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscriber = await Subscriber.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    return inertia.render('auth/subscribers/show', {
      user: auth.user,
      subscriber
    })
  }

  /**
   * Editar un contacto individual
   */
  async edit({ params, auth, inertia, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscriber = await Subscriber.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    return inertia.render('auth/subscribers/edit', {
      user: auth.user,
      subscriber
    })
  }

  /**
   * Handle form para editar un contacto
   */
  async update({ params, request, response, auth, session }: HttpContext) {
    console.log('Iniciando actualización de contacto:', params.id)
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      console.log('Usuario no tiene tenant activo')
      session.flash('error', 'Usuario no tiene acceso a ningún tenant activo')
      return response.redirect().back()
    }

    console.log('Tenant encontrado:', tenantUser.tenantId)

    const subscriber = await Subscriber.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    const data = request.only(['name', 'email', 'description', 'status'])
    console.log('Datos recibidos:', data)
    
    // Validaciones básicas
    if (!data.name || !data.email) {
      console.log('Validación fallida: campos requeridos')
      session.flash('error', 'El nombre y email son requeridos')
      return response.redirect().back()
    }

    // Validar que el status sea uno de los valores permitidos
    const allowedStatuses = ['active', 'inactive', 'archived']
    if (data.status && !allowedStatuses.includes(data.status)) {
      console.log('Validación fallida: status inválido')
      session.flash('error', 'El estado debe ser: activo, inactivo o archivado')
      return response.redirect().back()
    }

    // Verificar si el email ya existe en otro contacto del mismo tenant
    const existingSubscriber = await Subscriber.query()
      .where('email', data.email)
      .where('tenantId', tenantUser.tenantId)
      .where('id', '!=', params.id)
      .first()

    if (existingSubscriber) {
      console.log('Email duplicado encontrado')
      session.flash('error', 'Ya existe otro contacto con este email')
      return response.redirect().back()
    }

    try {
      console.log('Actualizando contacto...')
      subscriber.merge(data)
      await subscriber.save()
      
      console.log('Contacto actualizado exitosamente')
      session.flash('success', 'Contacto actualizado exitosamente')
      return response.redirect().back()
    } catch (error) {
      console.error('Error al actualizar contacto:', error)
      session.flash('error', 'Error al actualizar el contacto')
      return response.redirect().back()
    }
  }

  /**
   * Eliminar un contacto
   */
  async destroy({ params, response, auth, session }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      session.flash('error', 'Usuario no tiene acceso a ningún tenant activo')
      return response.redirect().back()
    }

    try {
      const subscriber = await Subscriber.query()
        .where('id', params.id)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()
      
      await subscriber.delete()
      
      session.flash('success', 'Contacto eliminado exitosamente')
      return response.redirect().back()
    } catch (error) {
      console.error('Error al eliminar contacto:', error)
      session.flash('error', 'Error al eliminar el contacto')
      return response.redirect().back()
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
}
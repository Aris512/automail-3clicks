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
}
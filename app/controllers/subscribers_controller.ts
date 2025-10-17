import type { HttpContext } from '@adonisjs/core/http'
import Subscriber from '#models/subscriber'
import TenantUser from '#models/tenant_user'
import { inject } from '@adonisjs/core'

@inject()
export default class SubscribersController {
  /**
   * Función de validación de email simplificada
   */
  private validateEmail(email: string): { isValid: boolean; message?: string } {
    if (!email || email.trim() === '') {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar longitud mínima y máxima
    if (email.length < 5) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    if (email.length > 254) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar que no tenga espacios al inicio o final
    if (email !== email.trim()) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Regex más robusta para validación de email
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar que no tenga caracteres consecutivos problemáticos
    if (email.includes('..') || email.includes('@@')) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar que el dominio tenga al menos un punto
    const domain = email.split('@')[1]
    if (!domain || !domain.includes('.')) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar que el dominio no termine en punto
    if (domain.endsWith('.')) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar que el dominio no sea demasiado corto
    if (domain.length < 4) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar que no contenga caracteres especiales problemáticos en el dominio
    if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    return { isValid: true }
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
    console.log('Iniciando creación de contacto')
    const user = auth.user!
    console.log('Usuario autenticado:', user.id)
    
    // Diagnóstico: Verificar todos los tenant_users del usuario
    const allTenantUsers = await TenantUser.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')
    
    console.log('Todos los TenantUsers del usuario:', allTenantUsers.map(tu => ({
      id: tu.id,
      tenantId: tu.tenantId,
      userId: tu.userId,
      role: tu.role,
      active: tu.active,
      createdAt: tu.createdAt
    })))
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    console.log('TenantUser activo encontrado:', tenantUser)

    if (!tenantUser) {
      console.log('Usuario no tiene tenant activo')
      session.flash('error', 'Usuario no tiene acceso a ningún tenant activo. Contacta al administrador.')
      return response.redirect().back()
    }

    // Validar datos
    const data = request.only(['name', 'email', 'description', 'status'])
    
    // Validaciones básicas
    if (!data.name || !data.email) {
      session.flash('error', 'El nombre y email son requeridos')
      return response.redirect().back()
    }

    // Validar formato de email usando la función mejorada
    const emailValidation = this.validateEmail(data.email)
    if (!emailValidation.isValid) {
      session.flash('error', emailValidation.message!)
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
      console.log('Creando suscriptor con datos:', {
        name: data.name,
        email: data.email,
        description: data.description || null,
        status: data.status || 'active',
        tenantId: tenantUser.tenantId
      })
      
      const newSubscriber = await Subscriber.create({
        name: data.name,
        email: data.email,
        description: data.description || null,
        status: data.status || 'active',
        tenantId: tenantUser.tenantId
      })

      console.log('Suscriptor creado exitosamente:', newSubscriber.id)

      // Para Inertia, necesitamos redirigir de vuelta a la página de contactos
      // con un mensaje de éxito en la sesión
      session.flash('success', 'Contacto agregado exitosamente')
      return response.redirect().back()
    } catch (error) {
      console.error('Error al crear contacto:', error)
      
      // Manejar errores específicos de base de datos
      if (error.code === '23505') { // Violación de restricción única
        session.flash('error', 'Ya existe un contacto con este email')
      } else if (error.code === '23514') { // Violación de restricción de verificación
        session.flash('error', 'Los datos proporcionados no son válidos')
      } else if (error.code === '23503') { // Violación de clave foránea
        session.flash('error', 'Error de configuración del sistema. Contacta al administrador.')
      } else {
        session.flash('error', 'Error al crear el contacto. Verifica los datos e intenta nuevamente.')
      }
      
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
  async update({ params, request, response, auth, session, inertia }: HttpContext) {
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

    // Validar formato de email usando la función mejorada
    const emailValidation = this.validateEmail(data.email)
    if (!emailValidation.isValid) {
      console.log('Validación fallida: email inválido')
      session.flash('error', emailValidation.message!)
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
      
      // Obtener todos los suscriptores actualizados para devolver
      const subscribers = await Subscriber.query()
        .where('tenantId', tenantUser.tenantId)
        .orderBy('createdAt', 'desc')
      
      return inertia.render('auth/contactos', {
        user: auth.user,
        subscribers,
        flash: {
          success: 'Contacto actualizado exitosamente'
        }
      })
    } catch (error) {
      console.error('Error al actualizar contacto:', error)
      
      // Obtener todos los suscriptores para devolver en caso de error
      const subscribers = await Subscriber.query()
        .where('tenantId', tenantUser.tenantId)
        .orderBy('createdAt', 'desc')
      
      return inertia.render('auth/contactos', {
        user: auth.user,
        subscribers,
        flash: {
          error: 'Error al actualizar el contacto'
        }
      })
    }
  }

  /**
   * Eliminar un contacto
   */
  async destroy({ params, response, auth, session, inertia }: HttpContext) {
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
      
      // Obtener todos los suscriptores actualizados para devolver
      const subscribers = await Subscriber.query()
        .where('tenantId', tenantUser.tenantId)
        .orderBy('createdAt', 'desc')
      
      return inertia.render('auth/contactos', {
        user: auth.user,
        subscribers,
        flash: {
          success: 'Contacto eliminado exitosamente'
        }
      })
    } catch (error) {
      console.error('Error al eliminar contacto:', error)
      
      // Obtener todos los suscriptores para devolver en caso de error
      const subscribers = await Subscriber.query()
        .where('tenantId', tenantUser.tenantId)
        .orderBy('createdAt', 'desc')
      
      return inertia.render('auth/contactos', {
        user: auth.user,
        subscribers,
        flash: {
          error: 'Error al eliminar el contacto'
        }
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
}
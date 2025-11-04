import type { HttpContext } from '@adonisjs/core/http'
import Sending from '#models/sending'
import TenantUser from '#models/tenant_user'
import Subscriber from '#models/subscriber'
import Template from '#models/template'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

@inject()
export default class SendingsController {
  /**
   * Display una lista de envíos
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

    const sendings = await Sending.query()
      .where('tenantId', tenantUser.tenantId)
      .preload('contact')
      .preload('template')
      .orderBy('createdAt', 'desc')
    
    return response.json({
      success: true,
      data: sendings
    })
  }

  /**
   * Handle form para crear un nuevo envío
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

    const data = request.only([
      'contactId',
      'templateId',
      'sentAt',
      'sentSubject',
      'sentBody',
      'deliveryStatus',
      'messageId'
    ])
    
    // Validaciones básicas
    if (!data.contactId) {
      return response.status(400).json({
        success: false,
        message: 'El contacto es requerido'
      })
    }

    // Verificar que el contacto pertenezca al tenant
    const contact = await Subscriber.query()
      .where('id', data.contactId)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!contact) {
      return response.status(404).json({
        success: false,
        message: 'Contacto no encontrado o no pertenece a tu tenant'
      })
    }

    // Verificar que el template pertenezca al tenant (si se proporciona)
    if (data.templateId) {
      const template = await Template.query()
        .where('id', data.templateId)
        .where('tenantId', tenantUser.tenantId)
        .first()

      if (!template) {
        return response.status(404).json({
          success: false,
          message: 'Plantilla no encontrada o no pertenece a tu tenant'
        })
      }
    }

    try {
      const sending = await Sending.create({
        tenantId: tenantUser.tenantId,
        contactId: data.contactId,
        templateId: data.templateId || null,
        sentAt: data.sentAt ? DateTime.fromISO(data.sentAt) : null,
        sentSubject: data.sentSubject || null,
        sentBody: data.sentBody || null,
        deliveryStatus: data.deliveryStatus || 'pending',
        messageId: data.messageId || null
      })

      await sending.load('contact')
      await sending.load('template')

      return response.status(201).json({
        success: true,
        message: 'Envío creado exitosamente',
        data: sending
      })
    } catch (error) {
      console.error('Error al crear envío:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear el envío'
      })
    }
  }

  /**
   * Mostrar un envío individual
   */
  async show({ params, auth, response }: HttpContext) {
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
      const sending = await Sending.query()
        .where('id', params.id)
        .where('tenantId', tenantUser.tenantId)
        .preload('contact')
        .preload('template')
        .firstOrFail()
      
      return response.json({
        success: true,
        data: sending
      })
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: 'Envío no encontrado'
      })
    }
  }

  /**
   * Handle form para editar un envío
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

    try {
      const sending = await Sending.query()
        .where('id', params.id)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()
      
      const data = request.only([
        'contactId',
        'templateId',
        'sentAt',
        'sentSubject',
        'sentBody',
        'deliveryStatus',
        'messageId'
      ])

      // Verificar que el contacto pertenezca al tenant (si se proporciona)
      if (data.contactId) {
        const contact = await Subscriber.query()
          .where('id', data.contactId)
          .where('tenantId', tenantUser.tenantId)
          .first()

        if (!contact) {
          return response.status(404).json({
            success: false,
            message: 'Contacto no encontrado o no pertenece a tu tenant'
          })
        }
      }

      // Verificar que el template pertenezca al tenant (si se proporciona)
      if (data.templateId) {
        const template = await Template.query()
          .where('id', data.templateId)
          .where('tenantId', tenantUser.tenantId)
          .first()

        if (!template) {
          return response.status(404).json({
            success: false,
            message: 'Plantilla no encontrada o no pertenece a tu tenant'
          })
        }
      }

      sending.merge({
        contactId: data.contactId || sending.contactId,
        templateId: data.templateId !== undefined ? (data.templateId || null) : sending.templateId,
        sentAt: data.sentAt ? DateTime.fromISO(data.sentAt) : sending.sentAt,
        sentSubject: data.sentSubject !== undefined ? data.sentSubject : sending.sentSubject,
        sentBody: data.sentBody !== undefined ? data.sentBody : sending.sentBody,
        deliveryStatus: data.deliveryStatus || sending.deliveryStatus,
        messageId: data.messageId !== undefined ? data.messageId : sending.messageId
      })
      
      await sending.save()
      await sending.load('contact')
      await sending.load('template')

      return response.status(200).json({
        success: true,
        message: 'Envío actualizado exitosamente',
        data: sending
      })
    } catch (error) {
      console.error('Error al actualizar envío:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar el envío'
      })
    }
  }

  /**
   * Eliminar un envío
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
      const sending = await Sending.query()
        .where('id', params.id)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()
      
      await sending.delete()
      
      return response.status(200).json({
        success: true,
        message: 'Envío eliminado exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar envío:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar el envío'
      })
    }
  }
}


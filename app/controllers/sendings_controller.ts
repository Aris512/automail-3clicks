import type { HttpContext } from '@adonisjs/core/http'
import Sending from '#models/sending'
import TenantUser from '#models/tenant_user'
import Subscriber from '#models/subscriber'
import Template from '#models/template'
import Campaign from '#models/campaign'
import CampaignStage from '#models/campaign_stage'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

@inject()
export default class SendingsController {
  /**
   * Display una lista de envíos
   */
  async index({ auth, inertia, response, request }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      if (request.accepts(['json'])) {
        return response.json({
          success: false,
          message: 'Usuario no tiene acceso a ningún tenant activo',
          data: []
        })
      }
      return response.redirect('/dashboard')
    }

    const sendings = await Sending.query()
      .where('tenantId', tenantUser.tenantId)
      .preload('contact')
      .preload('template')
      .preload('campaign')
      .preload('campaignStage')
      .orderBy('createdAt', 'desc')
    
    const sendingsData = sendings.map(sending => ({
      id: sending.id,
      contactId: sending.contactId,
      templateId: sending.templateId,
      campaignId: sending.campaignId,
      campaignStageId: sending.campaignStageId,
      sentAt: sending.sentAt ? sending.sentAt.toISO() : null,
      sentSubject: sending.sentSubject,
      sentBody: sending.sentBody,
      deliveryStatus: sending.deliveryStatus,
      messageId: sending.messageId,
      createdAt: sending.createdAt.toISO(),
      contact: sending.contact ? {
        id: sending.contact.id,
        email: sending.contact.email,
        name: sending.contact.name
      } : null,
      template: sending.template ? {
        id: sending.template.id,
        name: sending.template.name,
        subject: sending.template.subject
      } : null,
      campaign: sending.campaign ? {
        id: sending.campaign.id,
        name: sending.campaign.name
      } : null,
      campaignStage: sending.campaignStage ? {
        id: sending.campaignStage.id,
        name: sending.campaignStage.name,
        stageNumber: sending.campaignStage.stageNumber
      } : null
    }))

    // Si la petición acepta JSON, devolver JSON (API)
    if (request.accepts(['json'])) {
      return response.json({
        success: true,
        data: sendingsData
      })
    }

    // Si no, devolver Inertia (página web)
    return inertia.render('auth/envios', {
      user,
      sendings: sendingsData
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
      'campaignId',
      'campaignStageId',
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

    // Verificar que la campaña pertenezca al tenant (si se proporciona)
    if (data.campaignId) {
      const campaign = await Campaign.query()
        .where('id', data.campaignId)
        .where('tenantId', tenantUser.tenantId)
        .first()

      if (!campaign) {
        return response.status(404).json({
          success: false,
          message: 'Campaña no encontrada o no pertenece a tu tenant'
        })
      }
    }

    // Verificar que la etapa pertenezca al tenant y a la campaña (si se proporciona)
    if (data.campaignStageId) {
      const campaignStage = await CampaignStage.query()
        .where('id', data.campaignStageId)
        .where('tenantId', tenantUser.tenantId)
        .first()

      if (!campaignStage) {
        return response.status(404).json({
          success: false,
          message: 'Etapa de campaña no encontrada o no pertenece a tu tenant'
        })
      }

      // Si también se proporciona campaignId, verificar que la etapa pertenezca a esa campaña
      if (data.campaignId && campaignStage.campaignId !== data.campaignId) {
        return response.status(400).json({
          success: false,
          message: 'La etapa de campaña no pertenece a la campaña especificada'
        })
      }
    }

    try {
      const sending = await Sending.create({
        tenantId: tenantUser.tenantId,
        contactId: data.contactId,
        templateId: data.templateId || null,
        campaignId: data.campaignId || null,
        campaignStageId: data.campaignStageId || null,
        sentAt: data.sentAt ? DateTime.fromISO(data.sentAt) : null,
        sentSubject: data.sentSubject || null,
        sentBody: data.sentBody || null,
        deliveryStatus: data.deliveryStatus || 'pending',
        messageId: data.messageId || null
      })

      await sending.load('contact')
      await sending.load('template')
      await sending.load('campaign')
      await sending.load('campaignStage')

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
        .preload('campaign')
        .preload('campaignStage')
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
        'campaignId',
        'campaignStageId',
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

      // Verificar que la campaña pertenezca al tenant (si se proporciona)
      if (data.campaignId) {
        const campaign = await Campaign.query()
          .where('id', data.campaignId)
          .where('tenantId', tenantUser.tenantId)
          .first()

        if (!campaign) {
          return response.status(404).json({
            success: false,
            message: 'Campaña no encontrada o no pertenece a tu tenant'
          })
        }
      }

      // Verificar que la etapa pertenezca al tenant y a la campaña (si se proporciona)
      if (data.campaignStageId) {
        const campaignStage = await CampaignStage.query()
          .where('id', data.campaignStageId)
          .where('tenantId', tenantUser.tenantId)
          .first()

        if (!campaignStage) {
          return response.status(404).json({
            success: false,
            message: 'Etapa de campaña no encontrada o no pertenece a tu tenant'
          })
        }

        // Si también se proporciona campaignId, verificar que la etapa pertenezca a esa campaña
        const finalCampaignId = data.campaignId || sending.campaignId
        if (finalCampaignId && campaignStage.campaignId !== finalCampaignId) {
          return response.status(400).json({
            success: false,
            message: 'La etapa de campaña no pertenece a la campaña especificada'
          })
        }
      }

      sending.merge({
        contactId: data.contactId || sending.contactId,
        templateId: data.templateId !== undefined ? (data.templateId || null) : sending.templateId,
        campaignId: data.campaignId !== undefined ? (data.campaignId || null) : sending.campaignId,
        campaignStageId: data.campaignStageId !== undefined ? (data.campaignStageId || null) : sending.campaignStageId,
        sentAt: data.sentAt ? DateTime.fromISO(data.sentAt) : sending.sentAt,
        sentSubject: data.sentSubject !== undefined ? data.sentSubject : sending.sentSubject,
        sentBody: data.sentBody !== undefined ? data.sentBody : sending.sentBody,
        deliveryStatus: data.deliveryStatus || sending.deliveryStatus,
        messageId: data.messageId !== undefined ? data.messageId : sending.messageId
      })
      
      await sending.save()
      await sending.load('contact')
      await sending.load('template')
      await sending.load('campaign')
      await sending.load('campaignStage')

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


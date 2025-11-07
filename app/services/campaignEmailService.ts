import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { DateTime } from 'luxon'
import Campaign from '#models/campaign'
import CampaignStage from '#models/campaign_stage'
import CampaignStageTemplate from '#models/campaign_stage_template'
import SmtpConfig from '#models/smtp_config'
import Subscriber from '#models/subscriber'
import SubscriberList from '#models/subscriber_list'
import Sending from '#models/sending'
import TemplateRenderService from './templatesRenderService.js'

export default class CampaignEmailService {
  private renderService: TemplateRenderService

  constructor() {
    this.renderService = new TemplateRenderService()
  }

  /**
   * Crea un transporter de nodemailer basado en la configuración SMTP
   */
  private createTransporter(smtpConfig: SmtpConfig): Transporter {
    const port = Number(smtpConfig.port)

    // Configuración según el protocolo
    let config: { secure: boolean; tls?: any } = {
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
    }

    switch (smtpConfig.protocole) {
      case 'ssl':
        config.secure = true
        break
      case 'tls':
        config.secure = false
        config.tls = {
          rejectUnauthorized: false,
        }
        break
      case 'insecure':
        config.secure = false
        break
    }

    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: port,
      secure: config.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
      tls: config.tls,
    })
  }

  /**
   * Envía emails de una campaña a todos los suscriptores de las listas asociadas
   * @param campaignId - ID de la campaña
   * @param stageId - ID de la etapa de la campaña (opcional, si no se proporciona envía todas las etapas)
   */
  async sendCampaignEmails(
    campaignId: number,
    stageId?: number
  ): Promise<{
    success: boolean
    sent: number
    failed: number
    errors: string[]
  }> {
    const errors: string[] = []
    let sentCount = 0
    let failedCount = 0

    try {
      // Cargar la campaña con sus relaciones
      const campaign = await Campaign.query()
        .where('id', campaignId)
        .preload('emailSetup', (query) => {
          query.preload('smtpConfig')
        })
        .preload('lists', (query) => {
          query.preload('subscribers')
        })
        .firstOrFail()

      // Validar que la campaña tenga un emailSetup configurado
      if (!campaign.emailSetupId || !campaign.emailSetup) {
        throw new Error('La campaña no tiene un email setup configurado')
      }

      const emailSetup = campaign.emailSetup

      // Validar que el emailSetup tenga una configuración SMTP activa
      if (!emailSetup.smtpConfig || !emailSetup.smtpConfig.isActive) {
        throw new Error('El email setup no tiene una configuración SMTP activa')
      }

      // Crear el transporter
      const transporter = this.createTransporter(emailSetup.smtpConfig)

      // Obtener las etapas de la campaña
      let stagesQuery = CampaignStage.query().where('campaignId', campaignId)

      if (stageId) {
        stagesQuery = stagesQuery.where('id', stageId)
      }

      const stages = await stagesQuery.preload('templates')

      if (stages.length === 0) {
        throw new Error('No se encontraron etapas de campaña')
      }

      // Obtener todos los suscriptores únicos de las listas asociadas a la campaña
      const listIds = campaign.lists.map((list) => list.id)

      if (listIds.length === 0) {
        throw new Error('La campaña no tiene listas asociadas')
      }

      // Obtener suscriptores activos de las listas usando la tabla pivot
      // Primero obtenemos los IDs de suscriptores que están en las listas de la campaña
      const subscriberListRecords = await SubscriberList.query()
        .whereIn('listId', listIds)
        .where('status', 'active')
        .select('subscriberId')

      const subscriberIds = [...new Set(subscriberListRecords.map((sl) => sl.subscriberId))]

      if (subscriberIds.length === 0) {
        throw new Error('No se encontraron suscriptores activos en las listas de la campaña')
      }

      // Obtener los suscriptores con sus listas
      const subscribers = await Subscriber.query()
        .where('tenantId', campaign.tenantId)
        .where('status', 'active')
        .whereIn('id', subscriberIds)
        .preload('lists')

      if (subscribers.length === 0) {
        throw new Error('No se encontraron suscriptores activos en las listas de la campaña')
      }

      // Procesar cada etapa
      for (const stage of stages) {
        // Validar que la etapa tenga startsAt configurado y que ya haya llegado la hora
        if (stage.startsAt) {
          const now = DateTime.now()
          const startTime = stage.startsAt

          if (startTime > now) {
            console.log(
              `La etapa ${stage.id} (${stage.name}) esta programada para ${startTime.toISO()}, aun no es momento de enviar`
            )
            continue
          }
        }

        // NUEVA VERIFICACIÓN: Verificar si la etapa ya fue completamente procesada
        // Obtener las plantillas activas de esta etapa
        const stageTemplatesCheck = await CampaignStageTemplate.query()
          .where('campaignStageId', stage.id)
          .preload('template')

        const activeTemplates = stageTemplatesCheck.filter(
          (st) => st.template && st.template.active
        )

        if (activeTemplates.length === 0) {
          console.warn(`La etapa ${stage.id} no tiene plantillas activas asociadas`)
          continue
        }

        // Calcular cuántos envíos deberían haberse hecho
        // (número de suscriptores × número de templates activos)
        const expectedSendings = subscribers.filter((sub) => {
          const subscriberListIds = sub.lists.map((list) => list.id)
          return listIds.some((listId) => subscriberListIds.includes(listId))
        }).length * activeTemplates.length

        // Verificar cuántos envíos exitosos ya existen para esta etapa
        const existingSendingsCount = await Sending.query()
          .where('tenantId', campaign.tenantId)
          .where('campaignId', campaignId)
          .where('campaignStageId', stage.id)
          .where('deliveryStatus', 'sent')
          .count('* as total')
          .first()

        const existingSentCount = Number(existingSendingsCount?.$extras.total || 0)

        // Si todos los envíos esperados ya fueron enviados
        if (existingSentCount >= expectedSendings && expectedSendings > 0) {
          // Verificar si la etapa fue actualizada después del último envío
          const lastSending = await Sending.query()
            .where('tenantId', campaign.tenantId)
            .where('campaignId', campaignId)
            .where('campaignStageId', stage.id)
            .where('deliveryStatus', 'sent')
            .orderBy('sentAt', 'desc')
            .first()

          if (lastSending && lastSending.sentAt) {
            // Si la etapa fue actualizada después del último envío, procesarla de nuevo
            const stageUpdatedAt = stage.updatedAt || stage.createdAt
            const lastSentAt = lastSending.sentAt

            if (stageUpdatedAt <= lastSentAt) {
              // La etapa no fue actualizada después del último envío, omitir
              console.log(
                `La etapa ${stage.id} (${stage.name}) ya fue completamente procesada (${existingSentCount}/${expectedSendings} envíos) y no ha sido actualizada, omitiendo`
              )
              continue
            } else {
              // La etapa fue actualizada, procesarla de nuevo
              console.log(
                `La etapa ${stage.id} (${stage.name}) fue actualizada después del último envío (${stageUpdatedAt.toISO()} > ${lastSentAt.toISO()}), reprocesando...`
              )
            }
          } else {
            // No hay envíos previos, pero el conteo dice que están todos enviados (caso raro)
            console.log(
              `La etapa ${stage.id} (${stage.name}) parece estar procesada pero sin registro de último envío, omitiendo`
            )
            continue
          }
        } else if (existingSentCount > 0) {
          // Hay algunos envíos pero no todos, continuar procesando
          console.log(
            `La etapa ${stage.id} (${stage.name}) tiene ${existingSentCount}/${expectedSendings} envíos completados, continuando procesamiento...`
          )
        }

        // Obtener las plantillas de esta etapa desde campaign_stage_templates
        // (ya las tenemos arriba, pero las reobtenemos para mantener el código existente)
        const stageTemplates = await CampaignStageTemplate.query()
          .where('campaignStageId', stage.id)
          .preload('template')

        if (stageTemplates.length === 0) {
          console.warn(`La etapa ${stage.id} no tiene plantillas asociadas`)
          continue
        }

        // Procesar cada plantilla
        for (const stageTemplate of stageTemplates) {
          const template = stageTemplate.template

          if (!template || !template.active) {
            console.warn(`La plantilla ${stageTemplate.templatesId} no esta activa`)
            continue
          }

          // Enviar a cada suscriptor
          for (const subscriber of subscribers) {
            try {
              // Verificar que el suscriptor pertenezca a una de las listas de la campaña
              const subscriberListIds = subscriber.lists.map((list) => list.id)
              const belongsToList = listIds.some((listId) => subscriberListIds.includes(listId))

              if (!belongsToList) {
                continue
              }

              // Verificar si ya se envió este template a este suscriptor en esta etapa específica
              const existingSending = await Sending.query()
                .where('tenantId', campaign.tenantId)
                .where('contactId', subscriber.id)
                .where('templateId', template.id)
                .where('campaignId', campaignId)
                .where('campaignStageId', stage.id)
                .where('deliveryStatus', 'sent')
                .first()

              if (existingSending) {
                console.log(
                  `El template ${template.id} ya fue enviado al suscriptor ${subscriber.id} en la etapa ${stage.id} de la campaña ${campaignId}, omitiendo`
                )
                continue
              }

              // Renderizar la plantilla con los datos del suscriptor
              const rendered = await this.renderService.render(template, subscriber)

              // Preparar el remitente
              const fromAddress = emailSetup.from || emailSetup.email
              const fromName = emailSetup.name || 'Sistema'

              // Enviar el correo
              const info = await transporter.sendMail({
                from: `"${fromName}" <${fromAddress}>`,
                to: subscriber.email,
                subject: rendered.subject,
                html: rendered.body,
              })

              // Registrar el envío en la base de datos
              await Sending.create({
                tenantId: campaign.tenantId,
                contactId: subscriber.id,
                templateId: template.id,
                campaignId: campaignId,
                campaignStageId: stage.id,
                sentAt: DateTime.now(),
                sentSubject: rendered.subject,
                sentBody: rendered.body,
                deliveryStatus: 'sent',
                messageId: info.messageId || null,
              })

              // Actualizar lastSentAt del suscriptor
              subscriber.lastSentAt = DateTime.now()
              await subscriber.save()

              sentCount++
            } catch (error: any) {
              failedCount++
              const errorMessage = `Error al enviar a ${subscriber.email}: ${error.message}`
              errors.push(errorMessage)
              console.error(errorMessage, error)

              // Registrar el envío fallido
              try {
                await Sending.create({
                  tenantId: campaign.tenantId,
                  contactId: subscriber.id,
                  templateId: template.id,
                  campaignId: campaignId,
                  campaignStageId: stage.id,
                  sentAt: null,
                  sentSubject: null,
                  sentBody: null,
                  deliveryStatus: 'failed',
                  messageId: null,
                })
              } catch (dbError) {
                console.error('Error al registrar envio fallido:', dbError)
              }
            }
          }
        }
      }

      return {
        success: true,
        sent: sentCount,
        failed: failedCount,
        errors,
      }
    } catch (error: any) {
      return {
        success: false,
        sent: sentCount,
        failed: failedCount,
        errors: [...errors, error.message],
      }
    }
  }

  /**
   * Envía emails de una campaña para una etapa específica
   * @param campaignId - ID de la campaña
   * @param stageId - ID de la etapa
   */
  async sendStageEmails(campaignId: number, stageId: number) {
    return this.sendCampaignEmails(campaignId, stageId)
  }
}


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
import HtmlEmailProcessor from './htmlEmailProcessor.js'

export default class CampaignEmailService {
  private renderService: TemplateRenderService

  constructor() {
    this.renderService = new TemplateRenderService()
  }

  /**
   * Obtiene el Content-Type basado en la extensión del archivo
   * Incluye charset cuando es necesario según RFC 2045/2046
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop() || ''
    const contentTypes: Record<string, string> = {
      // Documentos
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'odt': 'application/vnd.oasis.opendocument.text',
      'ods': 'application/vnd.oasis.opendocument.spreadsheet',
      'odp': 'application/vnd.oasis.opendocument.presentation',
      // Archivos de texto (con charset)
      'txt': 'text/plain; charset=utf-8',
      'csv': 'text/csv; charset=utf-8',
      'html': 'text/html; charset=utf-8',
      'htm': 'text/html; charset=utf-8',
      'css': 'text/css; charset=utf-8',
      'js': 'text/javascript; charset=utf-8',
      'json': 'application/json; charset=utf-8',
      'xml': 'application/xml; charset=utf-8',
      // Archivos comprimidos
      'rar': 'application/x-rar-compressed',
      'zip': 'application/zip',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      // Imágenes
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      // Video
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'webm': 'video/webm',
    }
    return contentTypes[ext] || 'application/octet-stream'
  }

  /**
   * Codifica un archivo en base64 de forma explícita
   * Valida el tamaño del archivo antes de codificar
   * @param filePath - Ruta del archivo a codificar
   * @param maxSizeMB - Tamaño máximo permitido en MB (default: 25MB, límite común de SMTP)
   * @returns Buffer con el contenido del archivo codificado en base64
   */
  private async encodeFileToBase64(filePath: string, maxSizeMB: number = 25): Promise<Buffer> {
    const fs = await import('fs/promises')
    
    try {
      // Verificar que el archivo existe
      const stats = await fs.stat(filePath)
      
      if (!stats.isFile()) {
        throw new Error(`La ruta no es un archivo: ${filePath}`)
      }

      // Validar tamaño del archivo (considerando que base64 aumenta ~33%)
      const fileSizeMB = stats.size / (1024 * 1024)
      const estimatedBase64SizeMB = fileSizeMB * 1.33

      if (estimatedBase64SizeMB > maxSizeMB) {
        throw new Error(
          `El archivo es demasiado grande: ${fileSizeMB.toFixed(2)} MB (estimado base64: ${estimatedBase64SizeMB.toFixed(2)} MB). Límite: ${maxSizeMB} MB`
        )
      }

      // Leer y codificar el archivo
      const fileContent = await fs.readFile(filePath)
      
      // Validar que la lectura fue exitosa
      if (!fileContent || fileContent.length === 0) {
        throw new Error(`El archivo está vacío: ${filePath}`)
      }

      return fileContent
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Archivo no encontrado: ${filePath}`)
      }
      throw error
    }
  }

  /**
   * Codifica el nombre de archivo según RFC 2047 para caracteres especiales
   * @param filename - Nombre del archivo a codificar
   * @returns Nombre codificado si tiene caracteres especiales, original si no
   */
  private encodeFilename(filename: string): string {
    // Verificar si el nombre contiene caracteres no ASCII o caracteres especiales problemáticos
    const hasSpecialChars = /[^\x20-\x7E]/.test(filename) || /[<>:"/\\|?*]/.test(filename)
    
    if (!hasSpecialChars) {
      return filename
    }

    // Codificar usando RFC 2047 (encoded-word)
    // Formato: =?charset?encoding?encoded-text?=
    try {
      // Usar encodeURIComponent para codificar caracteres especiales
      // y luego reemplazar % con = para formato base64
      const encoded = Buffer.from(filename, 'utf-8').toString('base64')
      return `=?UTF-8?B?${encoded}?=`
    } catch (error) {
      // Si falla la codificación, retornar el nombre original
      console.warn(`⚠️ [CampaignEmailService] Error al codificar nombre de archivo: ${filename}`, error)
      return filename
    }
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
        .preload('tenant')
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
        // Validar que la etapa tenga startsAt configurado
        if (!stage.startsAt) {
          console.log(
            `La etapa ${stage.id} (${stage.name}) no tiene hora de inicio (startsAt) configurada, omitiendo`
          )
          continue
        }

        // Validar que ya haya llegado la hora de inicio
        const now = DateTime.now()
        const startTime = stage.startsAt

        if (startTime > now) {
          console.log(
            `La etapa ${stage.id} (${stage.name}) esta programada para ${startTime.toISO()}, aun no es momento de enviar (ahora: ${now.toISO()})`
          )
          continue
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
              // COMENTADO: Permite múltiples envíos al mismo suscriptor con la misma etapa
              // const existingSending = await Sending.query()
              //   .where('tenantId', campaign.tenantId)
              //   .where('contactId', subscriber.id)
              //   .where('templateId', template.id)
              //   .where('campaignId', campaignId)
              //   .where('campaignStageId', stage.id)
              //   .where('deliveryStatus', 'sent')
              //   .first()

              // if (existingSending) {
              //   console.log(
              //     `El template ${template.id} ya fue enviado al suscriptor ${subscriber.id} en la etapa ${stage.id} de la campaña ${campaignId}, omitiendo`
              //   )
              //   continue
              // }

              // Renderizar la plantilla con los datos del suscriptor
              const rendered = await this.renderService.render(template, subscriber)

              // El asunto ya viene procesado con el nombre del suscriptor desde TemplateRenderService
              const finalSubject = rendered.subject

              // Procesar el HTML para convertir rutas relativas de imágenes a URLs absolutas
              const { html: processedHtml, attachments } = await HtmlEmailProcessor.processHtmlForEmail(rendered.body)

              // Preparar el remitente
              const fromAddress = emailSetup.from || emailSetup.email
              const fromName = campaign.tenant?.name || emailSetup.name || 'Sistema'

              // Preparar adjuntos para nodemailer con codificación base64 explícita
              // Siguiendo estándares MIME multipart como lo hace Google
              const emailAttachments = await Promise.all(
                attachments.map(async (att) => {
                  try {
                    // Validar y leer el archivo con codificación base64 explícita
                    const fileContent = await this.encodeFileToBase64(att.path, 25)
                    
                    // Codificar el nombre de archivo si tiene caracteres especiales (RFC 2047)
                    const encodedFilename = this.encodeFilename(att.filename)
                    
                    // Obtener el Content-Type con charset cuando sea necesario
                    const contentType = this.getContentType(att.filename)
                    
                    // Construir el adjunto con codificación base64 explícita
                    // Nodemailer manejará automáticamente el MIME multipart, boundary y Content-Disposition
                    // Cuando se pasa content como Buffer, nodemailer automáticamente usa base64
                    return {
                      filename: encodedFilename,
                      content: fileContent, // Buffer - nodemailer lo codificará en base64 automáticamente
                      contentType: contentType,
                      encoding: 'base64', // Especificar explícitamente base64 para garantizar compatibilidad
                    }
                  } catch (fileError: any) {
                    console.error(`❌ [CampaignEmailService] Error al procesar adjunto ${att.filename}:`, fileError.message)
                    throw fileError
                  }
                })
              )

              console.log(`📎 [CampaignEmailService] Adjuntos preparados con codificación base64: ${emailAttachments.length}`)
              if (emailAttachments.length > 0) {
                emailAttachments.forEach((att, index) => {
                  const fileSize = (att.content as Buffer).length
                  const fileSizeKB = (fileSize / 1024).toFixed(2)
                  const estimatedBase64Size = (fileSize * 1.33 / 1024).toFixed(2)
                  console.log(`  ${index + 1}. ${att.filename}`)
                  console.log(`     - Tamaño: ${fileSizeKB} KB (estimado base64: ${estimatedBase64Size} KB)`)
                  console.log(`     - Content-Type: ${att.contentType}`)
                  console.log(`     - Encoding: ${att.encoding || 'base64 (automático)'}`)
                })
              }

              // Enviar el correo
              const mailOptions: any = {
                from: `"${fromName}" <${fromAddress}>`,
                to: subscriber.email,
                subject: finalSubject, // Usar el asunto con el prefijo personalizado
                html: processedHtml,
              }

              // Solo agregar attachments si hay adjuntos
              // Nodemailer construirá automáticamente el mensaje MIME multipart con boundary
              if (emailAttachments.length > 0) {
                mailOptions.attachments = emailAttachments
                console.log(`📎 [CampaignEmailService] Enviando correo con ${emailAttachments.length} adjunto(s) usando MIME multipart/base64`)
                
                // Todos los archivos ya están validados y codificados en memoria
                // No necesitamos verificación adicional ya que encodeFileToBase64 ya lo hizo
                emailAttachments.forEach((att) => {
                  const fileSize = (att.content as Buffer).length
                  console.log(`✅ [CampaignEmailService] Adjunto listo: ${att.filename} (${(fileSize / 1024).toFixed(2)} KB, base64)`)
                })
              }

              console.log(`📧 [CampaignEmailService] Enviando correo a: ${subscriber.email}`)
              console.log(`📝 [CampaignEmailService] Asunto: ${finalSubject}`)
              const info = await transporter.sendMail(mailOptions)
              console.log(`✅ [CampaignEmailService] Correo enviado exitosamente. MessageId: ${info.messageId}`)
              console.log(`📊 [CampaignEmailService] Respuesta del servidor:`, {
                messageId: info.messageId,
                response: info.response,
                accepted: info.accepted,
                rejected: info.rejected
              })

              // Registrar el envío en la base de datos
              await Sending.create({
                tenantId: campaign.tenantId,
                contactId: subscriber.id,
                templateId: template.id,
                campaignId: campaignId,
                campaignStageId: stage.id,
                sentAt: DateTime.now(),
                sentSubject: finalSubject, // Guardar el asunto con el prefijo
                sentBody: processedHtml,
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
              console.error(`❌ [CampaignEmailService] Error al enviar correo:`, {
                email: subscriber.email,
                error: error.message,
                stack: error.stack,
                code: error.code,
                response: error.response,
                responseCode: error.responseCode
              })

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
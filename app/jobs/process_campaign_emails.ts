import { Job } from 'adonisjs-jobs'
import { DateTime } from 'luxon'
import Campaign from '#models/campaign'

import CampaignEmailService from '#services/campaignEmailService'

type ProcessCampaignEmailsPayload = {
  log?: string // Mensaje formateado como log con pipes para mostrar en QueueDash DATA
  [key: string]: any // Permitir propiedades adicionales
}

export default class ProcessCampaignEmails extends Job {
  async handle(payload: ProcessCampaignEmailsPayload) {
    const executionStart = DateTime.now()
    this.logger.info('[Job] Iniciando procesamiento de campanas programadas')
    
    // El payload viene con un campo 'log' formateado como log con pipes
    // Extraer información del log si está disponible
    const contextInfo = {
      jobType: 'ProcessCampaignEmails',
      description: 'Procesa campañas activas y envía emails según las etapas programadas',
      purpose: 'Verificar y procesar campañas de email marketing programadas',
      scheduledBy: 'scheduler',
      frequency: 'everyMinute',
      environment: 'console',
      scheduledAt: undefined as string | undefined,
    }
    
    // Si hay un log, intentar extraer información
    if (payload?.log) {
      this.logger.info(`[Job] Payload log recibido: ${payload.log}`)
      // Extraer timestamp del log
      const timestampMatch = payload.log.match(/\[([^\]]+)\]/)
      if (timestampMatch) {
        contextInfo.scheduledAt = timestampMatch[1]
      }
    }

    try {
      // Buscar campañas activas con emailSetup y smtpConfig pre-cargados
      const activeCampaigns = await Campaign.query()
        .where('status', 'active')
        .whereNotNull('emailSetupId')
        .preload('emailSetup', (query) => {
          query.preload('smtpConfig')
        })
        .preload('campaignStages')

      if (activeCampaigns.length === 0) {
        this.logger.debug('[Job] No se encontraron campanas activas para procesar')
        const executionDuration = DateTime.now().diff(executionStart).as('seconds')
        const completedAtISO = DateTime.now().toISO()
        const logMessage = `[${contextInfo.scheduledAt || completedAtISO}] Job: ProcessCampaignEmails | Propósito: Verificar y procesar campañas de email marketing programadas | Programado por: scheduler | Frecuencia: everyMinute | Ambiente: ${contextInfo.environment || 'console'} | Campañas encontradas: 0 | Campañas válidas: 0 | Campañas procesadas: 0 | Total etapas: 0 | Total emails: 0 enviados, 0 fallidos`
        
        return {
          success: true,
          message: 'No se encontraron campañas activas para procesar',
          executionTime: executionDuration,
          // Log completo para mostrar en QueueDash DATA
          log: logMessage,
          // Estadísticas de ejecución
          statistics: {
            campaignsFound: 0,
            validCampaigns: 0,
            campaignsProcessed: 0,
            stagesProcessed: 0,
            emailsSent: 0,
            emailsFailed: 0,
          },
          // Detalles de etapas procesadas (vacío en este caso)
          stagesDetails: [],
          // Información contextual para QueueDash
          jobInfo: {
            jobType: contextInfo.jobType || 'ProcessCampaignEmails',
            description: contextInfo.description || 'Procesa campañas activas y envía emails según las etapas programadas',
            purpose: contextInfo.purpose || 'Verificar y procesar campañas de email marketing programadas',
            scheduledBy: contextInfo.scheduledBy || 'scheduler',
            frequency: contextInfo.frequency || 'everyMinute',
            environment: contextInfo.environment,
            scheduledAt: contextInfo.scheduledAt,
            startedAt: executionStart.toISO(),
            completedAt: completedAtISO,
            executionTimeSeconds: executionDuration,
          },
        }
      }

      this.logger.info(
        `[Job] Se encontraron ${activeCampaigns.length} campana(s) activa(s) - IDs: ${activeCampaigns.map((c) => c.id).join(', ')}`
      )

      // Filtrar campañas que tienen emailSetup y smtpConfig activo
      const validCampaigns = activeCampaigns.filter((campaign) => {
        if (!campaign.emailSetup) {
          this.logger.warn(
            `[Job] Campana ID ${campaign.id} "${campaign.name}": No tiene email setup configurado, omitiendo`
          )
          return false
        }

        if (!campaign.emailSetup.smtpConfig || !campaign.emailSetup.smtpConfig.isActive) {
          this.logger.warn(
            `[Job] Campana ID ${campaign.id} "${campaign.name}": No tiene configuracion SMTP activa, omitiendo`
          )
          return false
        }

        return true
      })

      if (validCampaigns.length === 0) {
        this.logger.warn('[Job] No se encontraron campanas validas con email setup y SMTP activo')
        const executionDuration = DateTime.now().diff(executionStart).as('seconds')
        const completedAtISO = DateTime.now().toISO()
        const logMessage = `[${contextInfo.scheduledAt || completedAtISO}] Job: ProcessCampaignEmails | Propósito: Verificar y procesar campañas de email marketing programadas | Programado por: scheduler | Frecuencia: everyMinute | Ambiente: ${contextInfo.environment || 'console'} | Campañas encontradas: 0 | Campañas válidas: 0 | Campañas procesadas: 0 | Total etapas: 0 | Total emails: 0 enviados, 0 fallidos`
        
        return {
          success: true,
          message: 'No se encontraron campañas válidas con email setup y SMTP activo',
          executionTime: executionDuration,
          // Log completo para mostrar en QueueDash DATA
          log: logMessage,
          // Estadísticas de ejecución
          statistics: {
            campaignsFound: activeCampaigns.length,
            validCampaigns: 0,
            campaignsProcessed: 0,
            stagesProcessed: 0,
            emailsSent: 0,
            emailsFailed: 0,
          },
          // Detalles de etapas procesadas (vacío en este caso)
          stagesDetails: [],
          // Información contextual para QueueDash
          jobInfo: {
            jobType: contextInfo.jobType || 'ProcessCampaignEmails',
            description: contextInfo.description || 'Procesa campañas activas y envía emails según las etapas programadas',
            purpose: contextInfo.purpose || 'Verificar y procesar campañas de email marketing programadas',
            scheduledBy: contextInfo.scheduledBy || 'scheduler',
            frequency: contextInfo.frequency || 'everyMinute',
            environment: contextInfo.environment,
            scheduledAt: contextInfo.scheduledAt,
            startedAt: executionStart.toISO(),
            completedAt: completedAtISO,
            executionTimeSeconds: executionDuration,
          },
        }
      }

      this.logger.info(
        `[Job] ${validCampaigns.length} de ${activeCampaigns.length} campana(s) tienen configuracion SMTP activa y estan listas para procesar`
      )

      const emailService = new CampaignEmailService()
      const now = DateTime.now()
      let totalProcessed = 0
      let totalSent = 0
      let totalFailed = 0

      // Agregar un array para almacenar detalles de etapas procesadas
      let stagesDetails: Array<{
        campaignId: number
        campaignName: string
        stageId: number
        stageName: string
        sent: number
        failed: number
        success: boolean
        duration: number
        errors?: string[]
      }> = []

      // Procesar cada campaña válida
      for (const campaign of validCampaigns) {
        // Buscar etapas que ya deben enviarse
        // Solo incluir etapas que están exactamente en el minuto programado
        const readyStages = campaign.campaignStages.filter((stage) => {
          if (!stage.startsAt) {
            return false
          }

          const startTime = stage.startsAt
          // Comparar solo hasta el minuto (año, mes, día, hora y minuto)
          // Esto asegura que solo se procese en el minuto exacto programado
          const startTimeMinute = startTime.startOf('minute')
          const nowMinute = now.startOf('minute')
          
          // Comparar usando timestamps en milisegundos para mayor precisión
          const startTimeMs = startTimeMinute.toMillis()
          const nowMs = nowMinute.toMillis()
          const isMatch = startTimeMs === nowMs
          
          // Log de depuración para ver qué se está comparando
          if (!isMatch) {
            this.logger.debug(
              `[Job] Etapa ${stage.id} "${stage.name}": No coincide con minuto actual. Programada: ${startTimeMinute.toISO()} (${startTimeMs}), Actual: ${nowMinute.toISO()} (${nowMs})`
            )
          } else {
            this.logger.info(
              `[Job] Etapa ${stage.id} "${stage.name}": Coincide con minuto actual. Programada: ${startTimeMinute.toISO()}, Actual: ${nowMinute.toISO()}`
            )
          }
          
          // Solo incluir si estamos exactamente en el mismo minuto
          return isMatch
        })

        if (readyStages.length === 0) {
          this.logger.debug(
            `[Job] Campana ID ${campaign.id} "${campaign.name}": No tiene etapas listas para enviar en este momento`
          )
          continue
        }

        this.logger.info(
          `[Job] Campana ID ${campaign.id} "${campaign.name}": ${readyStages.length} etapa(s) lista(s) para enviar`
        )

        // Procesar cada etapa lista
        for (const stage of readyStages) {
          this.logger.info(
            `[Job] Procesando etapa ID ${stage.id} "${stage.name}" de la campana ID ${campaign.id} "${campaign.name}"`
          )

          const stageStart = DateTime.now()
          try {
            const result = await emailService.sendStageEmails(campaign.id, stage.id)
            const stageDuration = DateTime.now().diff(stageStart).as('seconds')

            totalProcessed++
            totalSent += result.sent
            totalFailed += result.failed

            if (result.success) {
              this.logger.info(
                `[Job] Etapa ID ${stage.id} completada en ${stageDuration.toFixed(2)}s: ${result.sent} email(s) enviado(s), ${result.failed} fallido(s)`
              )
              
              // Agregar detalles de la etapa procesada
              stagesDetails.push({
                campaignId: campaign.id,
                campaignName: campaign.name,
                stageId: stage.id,
                stageName: stage.name,
                sent: result.sent,
                failed: result.failed,
                success: true,
                duration: stageDuration,
              })
            } else {
              this.logger.error(
                `[Job] Etapa ID ${stage.id} falló después de ${stageDuration.toFixed(2)}s: ${result.errors.join('; ')}`
              )
              stagesDetails.push({
                campaignId: campaign.id,
                campaignName: campaign.name,
                stageId: stage.id,
                stageName: stage.name,
                sent: result.sent,
                failed: result.failed,
                success: false,
                duration: stageDuration,
                errors: result.errors,
              })
            }

            if (result.errors.length > 0) {
              result.errors.forEach((error, index) => {
                this.logger.error(`[Job]   Error ${index + 1} en etapa ${stage.id}: ${error}`)
              })
            }
          } catch (error: any) {
            this.logger.error(
              `[Job] Error critico al procesar etapa ID ${stage.id} de campana ID ${campaign.id}: ${error.message}`
            )
            if (error.stack) {
              this.logger.error(`[Job] Stack trace: ${error.stack}`)
            }
            totalFailed++
            
            // Agregar detalles de la etapa con error crítico
            stagesDetails.push({
              campaignId: campaign.id,
              campaignName: campaign.name,
              stageId: stage.id,
              stageName: stage.name,
              sent: 0,
              failed: 0,
              success: false,
              duration: DateTime.now().diff(stageStart).as('seconds'),
              errors: [error.message],
            })
          }
        }
      }

      const executionDuration = DateTime.now().diff(executionStart).as('seconds')
      const campaignsProcessedCount = validCampaigns.filter(c => {
        const readyStages = c.campaignStages.filter((stage) => {
          if (!stage.startsAt) return false
          return stage.startsAt <= now
        })
        return readyStages.length > 0
      }).length
      
      // Crear resumen de etapas procesadas en formato de log con pipes
      let stagesLogSummary = ''
      if (stagesDetails.length > 0) {
        const stagesInfo = stagesDetails.map((stage) => {
          const status = stage.success ? '✓' : '✗'
          return `${status} Etapa ID ${stage.stageId} "${stage.stageName}" (Campaña ID ${stage.campaignId} "${stage.campaignName}"): ${stage.sent} enviados, ${stage.failed} fallidos en ${stage.duration.toFixed(2)}s`
        }).join(' | ')
        stagesLogSummary = ` | Total etapas: ${stagesDetails.length} | Total emails: ${totalSent} enviados, ${totalFailed} fallidos | Detalles: ${stagesInfo}`
      } else {
        stagesLogSummary = ` | Total etapas: 0 | Total emails: 0 enviados, 0 fallidos`
      }
      
      // Crear log completo con información de etapas procesadas
      const completedAtISO = DateTime.now().toISO()
      const fullLogMessage = `[${contextInfo.scheduledAt || completedAtISO}] Job: ProcessCampaignEmails | Propósito: Verificar y procesar campañas de email marketing programadas | Programado por: scheduler | Frecuencia: everyMinute | Ambiente: ${contextInfo.environment || 'console'} | Campañas encontradas: ${activeCampaigns.length} | Campañas válidas: ${validCampaigns.length} | Campañas procesadas: ${campaignsProcessedCount}${stagesLogSummary}`
      
      const result = {
        success: true,
        message: totalProcessed > 0 
          ? `Ejecución completada: ${totalProcessed} etapa(s) procesada(s), ${totalSent} email(s) enviado(s), ${totalFailed} fallido(s)`
          : 'Ejecución completada: No se procesaron etapas en este ciclo',
        executionTime: executionDuration,
        // Log completo con información de etapas para mostrar en QueueDash DATA
        log: fullLogMessage,
        // Estadísticas de ejecución
        statistics: {
          campaignsFound: activeCampaigns.length,
          validCampaigns: validCampaigns.length,
          campaignsProcessed: campaignsProcessedCount,
          stagesProcessed: totalProcessed,
          emailsSent: totalSent,
          emailsFailed: totalFailed,
        },
        // Agregar detalles de etapas procesadas
        stagesDetails: stagesDetails,
        // Información contextual para QueueDash
        jobInfo: {
          jobType: contextInfo.jobType || 'ProcessCampaignEmails',
          description: contextInfo.description || 'Procesa campañas activas y envía emails según las etapas programadas',
          purpose: contextInfo.purpose || 'Verificar y procesar campañas de email marketing programadas',
          scheduledBy: contextInfo.scheduledBy || 'scheduler',
          frequency: contextInfo.frequency || 'everyMinute',
          environment: contextInfo.environment,
          scheduledAt: contextInfo.scheduledAt,
          startedAt: executionStart.toISO(),
          completedAt: completedAtISO,
          executionTimeSeconds: executionDuration,
        },
      }

      if (totalProcessed > 0) {
        this.logger.info(
          `[Job] Ejecucion completada en ${executionDuration.toFixed(2)}s: ${totalProcessed} etapa(s) procesada(s), ${totalSent} email(s) enviado(s), ${totalFailed} fallido(s)`
        )
      } else {
        this.logger.debug(
          `[Job] Ejecucion completada en ${executionDuration.toFixed(2)}s: No se procesaron etapas en este ciclo`
        )
      }

      return result
    } catch (error: any) {
      const executionDuration = DateTime.now().diff(executionStart).as('seconds')
      const errorMessage = `Error fatal en el procesamiento después de ${executionDuration.toFixed(2)}s: ${error.message}`
      
      this.logger.error(`[Job] ${errorMessage}`)
      if (error.stack) {
        this.logger.error(`[Job] Stack trace: ${error.stack}`)
      }
      
      // Lanzar error con contexto adicional para QueueDash
      const enhancedError = new Error(errorMessage)
      ;(enhancedError as any).context = {
        jobType: contextInfo.jobType || 'ProcessCampaignEmails',
        description: contextInfo.description || 'Procesa campañas activas y envía emails según las etapas programadas',
        scheduledBy: contextInfo.scheduledBy || 'scheduler',
        frequency: contextInfo.frequency || 'everyMinute',
        environment: contextInfo.environment,
        scheduledAt: contextInfo.scheduledAt,
        startedAt: executionStart.toISO(),
        failedAt: DateTime.now().toISO(),
        executionTimeSeconds: executionDuration,
      }
      throw enhancedError
    }
  }
}
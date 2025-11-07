import cron from 'node-cron'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'

/**
 * Inicia el scheduler para ejecutar tareas programadas
 * Este archivo se carga al iniciar la aplicación
 */
export async function startScheduler() {
  // Solo iniciar si no estamos en modo test y la app está lista
  if (app.getEnvironment() === 'test') {
    return
  }

  // Ejecutar cada minuto para verificar campañas programadas
  //cambio de tiempo de ejecucion
  //ejemplo de cron.schedule('0 9 * * *', async () => { -> cada día a las 9:00 A.M
  cron.schedule('0 9 * * *', async () => {
    // Importar dinámicamente el servicio para evitar problemas de carga circular
    const { DateTime } = await import('luxon')
    const executionStart = DateTime.now()
    
    try {
      const { default: CampaignEmailService } = await import('#services/campaignEmailService')
      const Campaign = (await import('#models/campaign')).default

      logger.info('[Scheduler] Iniciando verificacion de campanas programadas...')

      // Buscar campanas activas con emailSetup y smtpConfig pre-cargados
      const activeCampaigns = await Campaign.query()
        .where('status', 'active')
        .whereNotNull('emailSetupId')
        .preload('emailSetup', (query) => {
          query.preload('smtpConfig')
        })
        .preload('campaignStages')

      if (activeCampaigns.length === 0) {
        logger.debug('[Scheduler] No se encontraron campanas activas para procesar')
        return
      }

      logger.info(`[Scheduler] Se encontraron ${activeCampaigns.length} campana(s) activa(s) - IDs: ${activeCampaigns.map(c => c.id).join(', ')}`)

      // Filtrar campanas que tienen emailSetup y smtpConfig activo
      const validCampaigns = activeCampaigns.filter((campaign) => {
        if (!campaign.emailSetup) {
          logger.warn(
            `[Scheduler] Campana ID ${campaign.id} "${campaign.name}": No tiene email setup configurado, omitiendo`
          )
          return false
        }

        if (!campaign.emailSetup.smtpConfig || !campaign.emailSetup.smtpConfig.isActive) {
          logger.warn(
            `[Scheduler] Campana ID ${campaign.id} "${campaign.name}": No tiene configuración SMTP activa, omitiendo`
          )
          return false
        }

        return true
      })

      if (validCampaigns.length === 0) {
        logger.warn('[Scheduler] No se encontraron campanas validas con email setup y SMTP activo')
        return
      }

      logger.info(
        `[Scheduler] ${validCampaigns.length} de ${activeCampaigns.length} campana(s) tienen configuracion SMTP activa y están listas para procesar`
      )

      const emailService = new CampaignEmailService()
      const now = DateTime.now()
      let totalProcessed = 0
      let totalSent = 0
      let totalFailed = 0

      // Procesar cada campana válida
      for (const campaign of validCampaigns) {
        // Buscar etapas que ya deben enviarse
        const readyStages = campaign.campaignStages.filter((stage) => {
          if (!stage.startsAt) {
            return false
          }

          const startTime = stage.startsAt
          // Verificar que startsAt ya haya pasado
          return startTime <= now
        })

        if (readyStages.length === 0) {
          logger.debug(`[Scheduler] Campana ID ${campaign.id} "${campaign.name}": No tiene etapas listas para enviar en este momento`)
          continue
        }

        logger.info(
          `[Scheduler] Campana ID ${campaign.id} "${campaign.name}": ${readyStages.length} etapa(s) lista(s) para enviar`
        )

        // Procesar cada etapa lista
        for (const stage of readyStages) {
          logger.info(`[Scheduler] Procesando etapa ID ${stage.id} "${stage.name}" de la campana ID ${campaign.id} "${campaign.name}"`)

          try {
            const stageStart = DateTime.now()
            const result = await emailService.sendStageEmails(campaign.id, stage.id)
            const stageDuration = DateTime.now().diff(stageStart).as('seconds')

            totalProcessed++
            totalSent += result.sent
            totalFailed += result.failed

            if (result.success) {
              logger.info(
                `[Scheduler] Etapa ID ${stage.id} completada en ${stageDuration.toFixed(2)}s: ${result.sent} email(s) enviado(s), ${result.failed} fallido(s)`
              )
            } else {
              logger.error(`[Scheduler] Etapa ID ${stage.id} falló despues de ${stageDuration.toFixed(2)}s: ${result.errors.join('; ')}`)
            }

            if (result.errors.length > 0) {
              result.errors.forEach((error, index) => {
                logger.error(`[Scheduler]   Error ${index + 1} en etapa ${stage.id}: ${error}`)
              })
            }
          } catch (error: any) {
            logger.error(`[Scheduler] Error critico al procesar etapa ID ${stage.id} de campana ID ${campaign.id}: ${error.message}`)
            if (error.stack) {
              logger.error(`[Scheduler] Stack trace: ${error.stack}`)
            }
            totalFailed++
          }
        }
      }

      const executionDuration = DateTime.now().diff(executionStart).as('seconds')
      if (totalProcessed > 0) {
        logger.info(
          `[Scheduler] Ejecución completada en ${executionDuration.toFixed(2)}s: ${totalProcessed} etapa(s) procesada(s), ${totalSent} email(s) enviado(s), ${totalFailed} fallido(s)`
        )
      } else {
        logger.debug(`[Scheduler] Ejecucion completada en ${executionDuration.toFixed(2)}s: No se procesaron etapas en este ciclo`)
      }
    } catch (error: any) {
      const executionDuration = DateTime.now().diff(executionStart).as('seconds')
      logger.error(`[Scheduler] Error fatal en el scheduler despues de ${executionDuration.toFixed(2)}s: ${error.message}`)
      if (error.stack) {
        logger.error(`[Scheduler] Stack trace: ${error.stack}`)
      }
    }
  })

  logger.info('[Scheduler] Scheduler iniciado correctamente: verificando campanas programadas cada minuto')
}


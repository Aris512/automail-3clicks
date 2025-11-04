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
    try {
      logger.info('Ejecutando scheduler de campañas programadas...')

      // Importar dinámicamente el servicio para evitar problemas de carga circular
      const { default: CampaignEmailService } = await import('#services/campaignEmailService')
      const { DateTime } = await import('luxon')
      const Campaign = (await import('#models/campaign')).default

      // Buscar campañas activas con emailSetup y smtpConfig pre-cargados
      const activeCampaigns = await Campaign.query()
        .where('status', 'active')
        .whereNotNull('emailSetupId')
        .preload('emailSetup', (query) => {
          query.preload('smtpConfig')
        })
        .preload('campaignStages')

      if (activeCampaigns.length === 0) {
        logger.debug('No se encontraron campañas activas')
        return
      }

      logger.info(`Se encontraron ${activeCampaigns.length} campaña(s) activa(s)`)

      // Filtrar campañas que tienen emailSetup y smtpConfig activo
      const validCampaigns = activeCampaigns.filter((campaign) => {
        if (!campaign.emailSetup) {
          logger.debug(
            `Campaña ${campaign.id} (${campaign.name}): No tiene email setup configurado, omitiendo`
          )
          return false
        }

        if (!campaign.emailSetup.smtpConfig || !campaign.emailSetup.smtpConfig.isActive) {
          logger.debug(
            `Campaña ${campaign.id} (${campaign.name}): No tiene configuración SMTP activa, omitiendo`
          )
          return false
        }

        return true
      })

      if (validCampaigns.length === 0) {
        logger.debug('No se encontraron campañas válidas con email setup activo')
        return
      }

      logger.debug(
        `${validCampaigns.length} de ${activeCampaigns.length} campaña(s) tienen configuración SMTP activa`
      )

      const emailService = new CampaignEmailService()
      const now = DateTime.now()
      let totalProcessed = 0
      let totalSent = 0
      let totalFailed = 0

      // Procesar cada campaña válida
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
          continue
        }

        logger.info(
          `Campaña ${campaign.id} (${campaign.name}): ${readyStages.length} etapa(s) lista(s) para enviar`
        )

        // Procesar cada etapa lista
        for (const stage of readyStages) {
          logger.info(`Procesando etapa ${stage.id} (${stage.name}) de la campaña ${campaign.id}`)

          try {
            const result = await emailService.sendStageEmails(campaign.id, stage.id)

            totalProcessed++
            totalSent += result.sent
            totalFailed += result.failed

            if (result.success) {
              logger.info(
                `Etapa ${stage.id}: ${result.sent} enviados, ${result.failed} fallidos`
              )
            } else {
              logger.error(`Etapa ${stage.id} falló: ${result.errors.join(', ')}`)
            }

            if (result.errors.length > 0) {
              result.errors.forEach((error) => {
                logger.error(`  - ${error}`)
              })
            }
          } catch (error: any) {
            logger.error(`Error al procesar etapa ${stage.id}: ${error.message}`)
            totalFailed++
          }
        }
      }

      if (totalProcessed > 0) {
        logger.info(
          `Scheduler completado: ${totalProcessed} etapa(s) procesada(s), ${totalSent} email(s) enviado(s), ${totalFailed} fallido(s)`
        )
      }
    } catch (error: any) {
      logger.error(`Error en el scheduler: ${error.message}`)
      if (error.stack) {
        logger.error(error.stack)
      }
    }
  })

  logger.info('Scheduler iniciado: verificando campañas programadas cada minuto')
}


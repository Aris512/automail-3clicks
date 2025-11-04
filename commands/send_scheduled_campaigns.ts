import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import Campaign from '#models/campaign'
import CampaignEmailService from '#services/campaignEmailService'

export default class SendScheduledCampaigns extends BaseCommand {
  static commandName = 'send:scheduled-campaigns'
  static description = 'Envía emails de campañas programadas que están listas para enviarse'

  static options: CommandOptions = {
    startApp: true,
  }

  /**
   * El comando puede ejecutarse manualmente o programado con cron
   */
  async run() {
    this.logger.info('Iniciando búsqueda de campañas programadas...')

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
        this.logger.info('No se encontraron campañas activas')
        return
      }

      this.logger.info(`Se encontraron ${activeCampaigns.length} campaña(s) activa(s)`)

      // Filtrar campañas que tienen emailSetup y smtpConfig activo
      const validCampaigns = activeCampaigns.filter((campaign) => {
        if (!campaign.emailSetup) {
          this.logger.info(
            `Campaña ${campaign.id} (${campaign.name}): No tiene email setup configurado, omitiendo`
          )
          return false
        }

        if (!campaign.emailSetup.smtpConfig || !campaign.emailSetup.smtpConfig.isActive) {
          this.logger.info(
            `Campaña ${campaign.id} (${campaign.name}): No tiene configuración SMTP activa, omitiendo`
          )
          return false
        }

        return true
      })

      if (validCampaigns.length === 0) {
        this.logger.info('No se encontraron campañas válidas con email setup activo')
        return
      }

      this.logger.info(
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
            // Si no tiene startsAt, no se envía automáticamente
            return false
          }

          const startTime = stage.startsAt
          // Verificar que startsAt ya haya pasado (con margen de 1 minuto para evitar problemas de timing)
          return startTime <= now
        })

        if (readyStages.length === 0) {
          this.logger.info(
            `Campaña ${campaign.id} (${campaign.name}): No hay etapas listas para enviar`
          )
          continue
        }

        this.logger.info(
          `Campaña ${campaign.id} (${campaign.name}): ${readyStages.length} etapa(s) lista(s) para enviar`
        )

        // Procesar cada etapa lista
        for (const stage of readyStages) {
          this.logger.info(`Procesando etapa ${stage.id} (${stage.name}) de la campaña ${campaign.id}`)

          try {
            const result = await emailService.sendStageEmails(campaign.id, stage.id)

            totalProcessed++
            totalSent += result.sent
            totalFailed += result.failed

            if (result.success) {
              this.logger.success(
                `Etapa ${stage.id}: ${result.sent} enviados, ${result.failed} fallidos`
              )
            } else {
              this.logger.error(`Etapa ${stage.id} falló: ${result.errors.join(', ')}`)
            }

            if (result.errors.length > 0) {
              result.errors.forEach((error) => {
                this.logger.error(`  - ${error}`)
              })
            }
          } catch (error: any) {
            this.logger.error(`Error al procesar etapa ${stage.id}: ${error.message}`)
            totalFailed++
          }
        }
      }

      this.logger.success(
        `Proceso completado: ${totalProcessed} etapa(s) procesada(s), ${totalSent} email(s) enviado(s), ${totalFailed} fallido(s)`
      )
    } catch (error: any) {
      this.logger.error(`Error fatal en el scheduler: ${error.message}`)
      throw error
    }
  }
}


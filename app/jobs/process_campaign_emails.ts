import { Job } from 'adonisjs-jobs'
import { DateTime } from 'luxon'
import Campaign from '#models/campaign'

import CampaignEmailService from '#services/campaignEmailService'

type ProcessCampaignEmailsPayload = {}

export default class ProcessCampaignEmails extends Job {
  async handle(_payload: ProcessCampaignEmailsPayload) {
    const executionStart = DateTime.now()
    this.logger.info('[Job] Iniciando procesamiento de campañas programadas...')

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
        this.logger.debug('[Job] No se encontraron campañas activas para procesar')
        return
      }

      this.logger.info(
        `[Job] Se encontraron ${activeCampaigns.length} campaña(s) activa(s) - IDs: ${activeCampaigns.map((c) => c.id).join(', ')}`
      )

      // Filtrar campañas que tienen emailSetup y smtpConfig activo
      const validCampaigns = activeCampaigns.filter((campaign) => {
        if (!campaign.emailSetup) {
          this.logger.warn(
            `[Job] Campaña ID ${campaign.id} "${campaign.name}": No tiene email setup configurado, omitiendo`
          )
          return false
        }

        if (!campaign.emailSetup.smtpConfig || !campaign.emailSetup.smtpConfig.isActive) {
          this.logger.warn(
            `[Job] Campaña ID ${campaign.id} "${campaign.name}": No tiene configuración SMTP activa, omitiendo`
          )
          return false
        }

        return true
      })

      if (validCampaigns.length === 0) {
        this.logger.warn('[Job] No se encontraron campañas válidas con email setup y SMTP activo')
        return
      }

      this.logger.info(
        `[Job] ${validCampaigns.length} de ${activeCampaigns.length} campaña(s) tienen configuración SMTP activa y están listas para procesar`
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
          this.logger.debug(
            `[Job] Campaña ID ${campaign.id} "${campaign.name}": No tiene etapas listas para enviar en este momento`
          )
          continue
        }

        this.logger.info(
          `[Job] Campaña ID ${campaign.id} "${campaign.name}": ${readyStages.length} etapa(s) lista(s) para enviar`
        )

        // Procesar cada etapa lista
        for (const stage of readyStages) {
          this.logger.info(
            `[Job] Procesando etapa ID ${stage.id} "${stage.name}" de la campaña ID ${campaign.id} "${campaign.name}"`
          )

          try {
            const stageStart = DateTime.now()
            const result = await emailService.sendStageEmails(campaign.id, stage.id)
            const stageDuration = DateTime.now().diff(stageStart).as('seconds')

            totalProcessed++
            totalSent += result.sent
            totalFailed += result.failed

            if (result.success) {
              this.logger.info(
                `[Job] Etapa ID ${stage.id} completada en ${stageDuration.toFixed(2)}s: ${result.sent} email(s) enviado(s), ${result.failed} fallido(s)`
              )
            } else {
              this.logger.error(
                `[Job] Etapa ID ${stage.id} falló después de ${stageDuration.toFixed(2)}s: ${result.errors.join('; ')}`
              )
            }

            if (result.errors.length > 0) {
              result.errors.forEach((error, index) => {
                this.logger.error(`[Job]   Error ${index + 1} en etapa ${stage.id}: ${error}`)
              })
            }
          } catch (error: any) {
            this.logger.error(
              `[Job] Error crítico al procesar etapa ID ${stage.id} de campaña ID ${campaign.id}: ${error.message}`
            )
            if (error.stack) {
              this.logger.error(`[Job] Stack trace: ${error.stack}`)
            }
            totalFailed++
          }
        }
      }

      const executionDuration = DateTime.now().diff(executionStart).as('seconds')
      if (totalProcessed > 0) {
        this.logger.info(
          `[Job] Ejecución completada en ${executionDuration.toFixed(2)}s: ${totalProcessed} etapa(s) procesada(s), ${totalSent} email(s) enviado(s), ${totalFailed} fallido(s)`
        )
      } else {
        this.logger.debug(
          `[Job] Ejecución completada en ${executionDuration.toFixed(2)}s: No se procesaron etapas en este ciclo`
        )
      }
    } catch (error: any) {
      const executionDuration = DateTime.now().diff(executionStart).as('seconds')
      this.logger.error(
        `[Job] Error fatal en el procesamiento después de ${executionDuration.toFixed(2)}s: ${error.message}`
      )
      if (error.stack) {
        this.logger.error(`[Job] Stack trace: ${error.stack}`)
      }
      throw error
    }
  }
}
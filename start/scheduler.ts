import scheduler from 'adonisjs-scheduler/services/main'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

/**
 * Define las tareas programadas usando adonisjs-scheduler
 * Este archivo se carga al iniciar la aplicación
 * 
 * El scheduler usa adonisjs-scheduler para programar tareas y adonisjs-jobs
 * para procesar los trabajos en segundo plano de manera asíncrona
 */

// Solo programar tareas si no estamos en modo test
if (app.getEnvironment() !== 'test') {
  // Ejecutar cada minuto para verificar campañas programadas
  // Cambio de tiempo de ejecución:
  // ejemplo: .dailyAt('09:00') -> cada día a las 9:00 A.M
  // ejemplo: .hourly() -> cada hora
  scheduler.call(async () => {
    try {
      // Importar dinámicamente el job para evitar problemas de carga circular
      const ProcessCampaignEmails = (await import('#jobs/process_campaign_emails')).default

      logger.info('[Scheduler] Despachando job para procesar campanas programadas')

      // Despachar el job para procesar las campañas
      // El job se ejecutará de manera asíncrona en segundo plano
      // Incluir información contextual en el payload para que aparezca en QueueDash
      // IMPORTANTE: Pasar solo valores primitivos únicos (strings, numbers) en un objeto plano
      // para evitar que devalue.stringify() use referencias al serializar
      // devalue crea referencias cuando detecta valores duplicados, así que cada valor debe ser único
      const now = DateTime.now()
      const scheduledAtISO = now.toISO() || new Date().toISOString()
      
      // Crear mensaje formateado como log con pipes para mostrar en QueueDash DATA
      const logMessage = `[${scheduledAtISO}] Job: ProcessCampaignEmails | Propósito: Verificar y procesar campañas de email marketing programadas | Programado por: scheduler | Frecuencia: everyMinute | Ambiente: ${app.getEnvironment()}`
      
      // Crear payload con el mensaje formateado como log
      // Usar solo un campo string para evitar problemas de serialización con devalue
      const jobPayload = {
        log: logMessage,
      }

      logger.debug(`[Scheduler] Despachando job con payload: ${JSON.stringify(jobPayload)}`)

      await ProcessCampaignEmails.dispatch(jobPayload, {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 0,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      })

      logger.debug('[Scheduler] Job despachado correctamente')
    } catch (error: any) {
      logger.error(`[Scheduler] Error al despachar job: ${error.message}`)
      if (error.stack) {
        logger.error(`[Scheduler] Stack trace: ${error.stack}`)
      }
    }
  }).everyMinute()

  logger.info('[Scheduler] Scheduler configurado correctamente: verificando campanas programadas cada minuto')
  logger.info('[Scheduler] Asegurate de ejecutar "node ace scheduler:run" para ejecutar el scheduler')
  logger.info('[Scheduler] Asegurate de ejecutar "node ace jobs:listen" para procesar los jobs')
}


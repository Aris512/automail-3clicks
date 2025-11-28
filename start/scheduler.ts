import scheduler from 'adonisjs-scheduler/services/main'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'

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

      logger.info('[Scheduler] Despachando job para procesar campañas programadas...')

      // Despachar el job para procesar las campañas
      // El job se ejecutará de manera asíncrona en segundo plano
      await ProcessCampaignEmails.dispatch({})

      logger.debug('[Scheduler] Job despachado correctamente')
    } catch (error: any) {
      logger.error(`[Scheduler] Error al despachar job: ${error.message}`)
      if (error.stack) {
        logger.error(`[Scheduler] Stack trace: ${error.stack}`)
      }
    }
  }).everyMinute()

  logger.info('[Scheduler] Scheduler configurado correctamente: verificando campañas programadas cada minuto')
  logger.info('[Scheduler] Asegúrate de ejecutar "node ace scheduler:run" para ejecutar el scheduler')
  logger.info('[Scheduler] Asegúrate de ejecutar "node ace jobs:listen" para procesar los jobs')
}


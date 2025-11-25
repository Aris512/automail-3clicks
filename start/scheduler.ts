import cron from 'node-cron'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'

/**
 * Inicia el scheduler para ejecutar tareas programadas
 * Este archivo se carga al iniciar la aplicación
 * 
 * El scheduler usa node-cron para programar tareas y adonisjs-jobs
 * para procesar los trabajos en segundo plano de manera asíncrona
 */
export async function startScheduler() {
  // Solo iniciar si no estamos en modo test y la app está lista
  if (app.getEnvironment() === 'test') {
    return
  }

  // Ejecutar cada minuto para verificar campañas programadas
  // Cambio de tiempo de ejecución:
  // ejemplo: cron.schedule('0 9 * * *', async () => { -> cada día a las 9:00 A.M
  cron.schedule('* * * * *', async () => {
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
  })

  logger.info('[Scheduler] Scheduler iniciado correctamente: verificando campañas programadas cada minuto')
  logger.info('[Scheduler] Asegúrate de ejecutar "node ace jobs:listen" para procesar los jobs')
}


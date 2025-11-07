import type { HttpContext } from '@adonisjs/core/http'
import EmailSetup from '#models/email_setup'
import TenantUser from '#models/tenant_user'

export default class EmailSetupsController {
  /**
   * Obtener todos los email setups del tenant del usuario
   */
  async index({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      
      // Obtener el tenant del usuario
      const tenantUser = await TenantUser.query()
        .where('userId', user.id)
        .where('active', true)
        .first()

      if (!tenantUser) {
        return response.json({
          success: false,
          message: 'Usuario no tiene acceso a ningún tenant activo',
          data: []
        })
      }

      const emailSetups = await EmailSetup.query()
        .where('tenantId', tenantUser.tenantId)
        .where('active', true)
        .preload('smtpConfig')
        .orderBy('createdAt', 'desc')
      
      return response.json({
        success: true,
        data: emailSetups
      })
    } catch (error) {
      console.error('Error al obtener email setups:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener los email setups',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
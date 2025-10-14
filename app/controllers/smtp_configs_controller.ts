import type { HttpContext } from '@adonisjs/core/http'
import SmtpConfig from '#models/smtp_config'
import EmailSetup from '#models/email_setup'
import TenantUser from '#models/tenant_user'

export default class SmtpConfigsController {
  /**
   * Guardar configuración SMTP
   */
  async store({ request, response, auth }: HttpContext) {
    const { host, port, username, password, fromEmail } = request.only([
      'host', 'port', 'username', 'password', 'fromEmail'
    ])

    try {
      const user = auth.user!
      
      // Obtener el tenant del usuario
      const tenantUser = await TenantUser.query()
        .where('userId', user.id)
        .where('active', true)
        .first()

      if (!tenantUser) {
        return response.badRequest({
          success: false,
          message: 'Usuario no tiene acceso a ningún tenant activo'
        })
      }

      // Siempre crear un nuevo EmailSetup para cada configuración SMTP
      const emailSetup = await EmailSetup.create({
        tenantId: tenantUser.tenantId,
        userId: user.id,
        email: username,
        name: 'Configuración SMTP',
        from: fromEmail,
        active: true
      })

      // Verificar si ya existe una configuración idéntica para este usuario
      // Buscar en todos los emailSetups del usuario
      const userEmailSetups = await EmailSetup.query()
        .where('userId', user.id)
        .where('active', true)
        .select('id')

      const existingConfig = await SmtpConfig.query()
        .whereIn('emailSetupId', userEmailSetups.map(setup => setup.id))
        .where('user', username)
        .where('host', host)
        .where('port', port)
        .where('protocole', this.getProtocolByPort(parseInt(port)))
        .first()

      if (existingConfig) {
        return response.ok({
          success: true,
          message: 'Ya existe esa configuración',
          isDuplicate: true,
          data: {
            id: existingConfig.id,
            host: existingConfig.host,
            port: existingConfig.port,
            user: existingConfig.user,
            protocole: existingConfig.protocole
          }
        })
      }

      // Siempre crear una nueva configuración SMTP
      const smtpConfig = await SmtpConfig.create({
        emailSetupId: emailSetup.id,
        user: username,
        password: password,
        host: host,
        port: port,
        protocole: this.getProtocolByPort(parseInt(port))
      })

      return response.ok({
        success: true,
        message: 'Configuración SMTP guardada correctamente',
        data: {
          id: smtpConfig.id,
          host: smtpConfig.host,
          port: smtpConfig.port,
          user: smtpConfig.user,
          protocole: smtpConfig.protocole
        }
      })
    } catch (error) {
      console.error('Error al guardar configuración SMTP:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al guardar la configuración SMTP'
      })
    }
  }

  /**
   * Obtener todas las configuraciones SMTP del usuario actual
   */
  async show({ response, auth }: HttpContext) {
    try {
      const user = auth.user!
      
      const emailSetups = await EmailSetup.query()
        .where('userId', user.id)
        .where('active', true)
        .preload('smtpConfig')
        .orderBy('createdAt', 'desc')

      if (!emailSetups.length) {
        return response.ok({
          success: true,
          data: [],
          message: 'No hay configuraciones SMTP guardadas'
        })
      }

      // Filtrar solo los que tienen configuración SMTP
      const configsWithSmtp = emailSetups.filter(setup => setup.smtpConfig)

      if (!configsWithSmtp.length) {
        return response.ok({
          success: true,
          data: [],
          message: 'No hay configuraciones SMTP guardadas'
        })
      }

      // Devolver todas las configuraciones
      const configs = configsWithSmtp.map(setup => ({
        id: setup.smtpConfig.id,
        host: setup.smtpConfig.host,
        port: setup.smtpConfig.port,
        user: setup.smtpConfig.user,
        protocole: setup.smtpConfig.protocole,
        fromEmail: setup.from,
        createdAt: setup.createdAt
      }))

      return response.ok({
        success: true,
        data: configs,
        message: `${configs.length} configuración(es) SMTP encontrada(s)`
      })
    } catch (error) {
      console.error('Error al obtener configuración SMTP:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al obtener la configuración SMTP'
      })
    }
  }

  /**
   * Determinar protocolo según el puerto
   */
  private getProtocolByPort(port: number): 'insecure' | 'ssl' | 'tls' {
    switch (port) {
      case 465:
        return 'ssl'
      case 587:
        return 'tls'
      case 25:
        return 'insecure'
      default:
        return 'tls'
    }
  }
}
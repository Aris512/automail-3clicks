import type { HttpContext } from '@adonisjs/core/http'
import SmtpConfig from '#models/smtp_config'
import EmailSetup from '#models/email_setup'

export default class SmtpConfigsController {
  /**
   * Guardar o actualizar configuración SMTP
   */
  async store({ request, response, auth }: HttpContext) {
    const { host, port, username, password, fromEmail } = request.only([
      'host', 'port', 'username', 'password', 'fromEmail'
    ])

    try {
      const user = auth.user!
      
      // Buscar si ya existe una configuración para este usuario
      let emailSetup = await EmailSetup.query()
        .where('userId', user.id)
        .where('active', true)
        .first()

      if (!emailSetup) {
        // Crear nuevo EmailSetup
        emailSetup = await EmailSetup.create({
          tenantId: 1, // Por ahora usar tenant por defecto
          userId: user.id,
          email: username,
          name: 'Configuración SMTP',
          from: fromEmail,
          active: true
        })
      }

      // Buscar configuración SMTP existente
      let smtpConfig = await SmtpConfig.query()
        .where('emailSetupId', emailSetup.id)
        .first()

      if (smtpConfig) {
        // Actualizar configuración existente
        const updateData: any = {
          user: username,
          host: host,
          port: port,
          protocole: this.getProtocolByPort(parseInt(port))
        }
        
        // Solo actualizar contraseña si se proporciona
        if (password) {
          updateData.password = password
        }
        
        smtpConfig.merge(updateData)
        await smtpConfig.save()
      } else {
        // Crear nueva configuración SMTP
        smtpConfig = await SmtpConfig.create({
          emailSetupId: emailSetup.id,
          user: username,
          password: password,
          host: host,
          port: port,
          protocole: this.getProtocolByPort(parseInt(port))
        })
      }

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
   * Obtener configuración SMTP del usuario actual
   */
  async show({ response, auth }: HttpContext) {
    try {
      const user = auth.user!
      
      const emailSetup = await EmailSetup.query()
        .where('userId', user.id)
        .where('active', true)
        .preload('smtpConfig')
        .first()

      if (!emailSetup || !emailSetup.smtpConfig) {
        return response.ok({
          success: true,
          data: null,
          message: 'No hay configuración SMTP guardada'
        })
      }

      return response.ok({
        success: true,
        data: {
          id: emailSetup.smtpConfig.id,
          host: emailSetup.smtpConfig.host,
          port: emailSetup.smtpConfig.port,
          user: emailSetup.smtpConfig.user,
          protocole: emailSetup.smtpConfig.protocole,
          fromEmail: emailSetup.from
        }
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
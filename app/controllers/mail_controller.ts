import type { HttpContext } from '@adonisjs/core/http'
import EmailSetup from '#models/email_setup'
import SmtpConfig from '#models/smtp_config'
import nodemailer from 'nodemailer'
import edge from 'edge.js'

export default class MailController {
  async send({ request, response, auth }: HttpContext) {
    const { to, subject, message } = request.only(['to', 'subject', 'message'])

    try {
      const user = auth.user!
      
      // Obtener configuración SMTP del usuario
      const emailSetup = await EmailSetup.query()
        .where('userId', user.id)
        .where('active', true)
        .preload('smtpConfig')
        .first()

      if (!emailSetup || !emailSetup.smtpConfig) {
        return response.badRequest({
          success: false,
          message: 'No hay configuración SMTP guardada. Por favor configura tu servidor SMTP primero.'
        })
      }

      const smtpConfig = emailSetup.smtpConfig

      // Crear transporter con configuración dinámica
      const transporter = this.createTransporter(smtpConfig)

      // Renderizar la plantilla HTML
      const htmlContent = await edge.render('emails/default', {
        subject,
        messaje: message 
      })

      // Enviar el correo
      const info = await transporter.sendMail({
        from: emailSetup.from || smtpConfig.user,
        to: to,
        subject: subject,
        html: htmlContent,
      })

      console.log('Correo enviado:', info.messageId)
      return response.ok({ success: true, message: 'Correo enviado correctamente' })
    } catch (error) {
      console.error('Error al enviar correo:', error)
      return response.internalServerError({ success: false, message: 'Error al enviar el correo' })
    }
  }

  /**
   * Crear transporter con configuración de la base de datos
   */
  private createTransporter(smtpConfig: SmtpConfig) {
    const port = parseInt(smtpConfig.port)
    
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: port,
      secure: smtpConfig.protocole === 'ssl',
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  }
}
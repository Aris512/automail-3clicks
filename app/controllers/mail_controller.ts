import type { HttpContext } from '@adonisjs/core/http'
import SmtpConfig from '#models/smtp_config'
import nodemailer from 'nodemailer'
import edge from 'edge.js'
import HtmlEmailProcessor from '../services/htmlEmailProcessor.js'

export default class MailController {
  async send({ request, response, auth }: HttpContext) {
    const { to, subject, message } = request.only(['to', 'subject', 'message'])

    try {
      const user = auth.user!
      
      // DEBUG: Mostrar información sobre la selección de configuración
      console.log('🔍 BUSCANDO CONFIGURACIÓN SMTP:')
      console.log('👤 Usuario ID:', user.id)
      console.log('📧 Email del usuario:', user.email)

      // DEBUG: Ver todas las configuraciones del usuario
      const allUserConfigs = await SmtpConfig.query()
        .whereHas('emailSetup', (query) => {
          query.where('userId', user.id)
        })
        .preload('emailSetup')
      
      console.log('📋 TODAS LAS CONFIGURACIONES DEL USUARIO:')
      allUserConfigs.forEach((config, index) => {
        console.log(`  ${index + 1}. ID: ${config.id}, Host: ${config.host}, Activa: ${config.isActive}, EmailSetup ID: ${config.emailSetupId}`)
      })

      // Buscar directamente la configuración SMTP activa del usuario
      const smtpConfig = await SmtpConfig.query()
        .where('isActive', true)
        .whereHas('emailSetup', (query) => {
          query.where('userId', user.id).where('active', true)
        })
        .preload('emailSetup')
        .first()

      if (!smtpConfig) {
        console.log('❌ No se encontró configuración SMTP activa')
        return response.badRequest({
          success: false,
          message: 'No hay configuración SMTP activa. Por favor selecciona una configuración SMTP para usar.'
        })
      }

      const emailSetup = smtpConfig.emailSetup

      console.log('✅ Configuración SMTP activa encontrada!')
      console.log('📋 EmailSetup ID:', emailSetup.id)
      console.log('🏢 Tenant ID:', emailSetup.tenantId)
      console.log('📨 Email de origen configurado:', emailSetup.from)
      console.log('🟢 Estado activo:', smtpConfig.isActive)
      console.log('=====================================')

      // DEBUG: Mostrar configuración SMTP que se está usando
      console.log('🔍 DEBUG SMTP CONFIGURATION:')
      console.log('📧 Servidor SMTP:', smtpConfig.host)
      console.log('🔌 Puerto:', smtpConfig.port)
      console.log('👤 Usuario:', smtpConfig.user)
      console.log('🔐 Protocolo:', smtpConfig.protocole)
      console.log('📨 Email de origen:', emailSetup.from || smtpConfig.user)
      console.log('📋 ID de configuración:', smtpConfig.id)
      console.log('⏰ Creado:', smtpConfig.createdAt)
      console.log('=====================================')

      // Crear transporter con configuración dinámica
      const transporter = this.createTransporter(smtpConfig)

      // Renderizar la plantilla HTML
      const htmlContent = await edge.render('emails/default', {
        subject,
        messaje: message 
      })

      // Procesar el HTML para convertir imágenes a base64 si es necesario
      const processedHtml = await HtmlEmailProcessor.processHtmlForEmail(htmlContent)

      // Enviar el correo
      const info = await transporter.sendMail({
        from: emailSetup.from || smtpConfig.user,
        to: to,
        subject: subject,
        html: processedHtml,
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
    
    // DEBUG: Mostrar configuración final para nodemailer
    const transporterConfig = {
      host: smtpConfig.host,
      port: port,
      secure: smtpConfig.protocole === 'ssl',
      auth: {
        user: smtpConfig.user,
        pass: '[OCULTO]', // No mostrar la contraseña por seguridad
      },
      tls: {
        rejectUnauthorized: false
      }
    }
    
    console.log('🚀 CONFIGURACIÓN FINAL NODEMAILER:')
    console.log('Host:', transporterConfig.host)
    console.log('Port:', transporterConfig.port)
    console.log('Secure (SSL):', transporterConfig.secure)
    console.log('Auth User:', transporterConfig.auth.user)
    console.log('TLS rejectUnauthorized:', transporterConfig.tls.rejectUnauthorized)
    console.log('=====================================')
    
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
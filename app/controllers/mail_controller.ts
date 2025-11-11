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

      // Procesar el HTML para convertir rutas relativas de imágenes a URLs absolutas
      const { html: processedHtml, attachments } = await HtmlEmailProcessor.processHtmlForEmail(htmlContent)

      // Preparar adjuntos para nodemailer con codificación base64 explícita
      // Siguiendo estándares MIME multipart como lo hace Google
      const emailAttachments = await Promise.all(
        attachments.map(async (att) => {
          try {
            // Validar y leer el archivo con codificación base64 explícita
            const fileContent = await this.encodeFileToBase64(att.path, 25)
            
            // Codificar el nombre de archivo si tiene caracteres especiales (RFC 2047)
            const encodedFilename = this.encodeFilename(att.filename)
            
            // Obtener el Content-Type con charset cuando sea necesario
            const contentType = this.getContentType(att.filename)
            
            // Construir el adjunto con codificación base64 explícita
            // Nodemailer manejará automáticamente el MIME multipart, boundary y Content-Disposition
            // Cuando se pasa content como Buffer, nodemailer automáticamente usa base64
            return {
              filename: encodedFilename,
              content: fileContent, // Buffer - nodemailer lo codificará en base64 automáticamente
              contentType: contentType,
              encoding: 'base64', // Especificar explícitamente base64 para garantizar compatibilidad
            }
          } catch (fileError: any) {
            console.error(`❌ [MailController] Error al procesar adjunto ${att.filename}:`, fileError.message)
            throw fileError
          }
        })
      )

      console.log(`📎 [MailController] Adjuntos preparados con codificación base64: ${emailAttachments.length}`)
      if (emailAttachments.length > 0) {
        emailAttachments.forEach((att, index) => {
          const fileSize = (att.content as Buffer).length
          const fileSizeKB = (fileSize / 1024).toFixed(2)
          const estimatedBase64Size = (fileSize * 1.33 / 1024).toFixed(2)
          console.log(`  ${index + 1}. ${att.filename}`)
          console.log(`     - Tamaño: ${fileSizeKB} KB (estimado base64: ${estimatedBase64Size} KB)`)
          console.log(`     - Content-Type: ${att.contentType}`)
          console.log(`     - Encoding: ${att.encoding || 'base64 (automático)'}`)
        })
      }

      // Enviar el correo
      const mailOptions: any = {
        from: emailSetup.from || smtpConfig.user,
        to: to,
        subject: subject,
        html: processedHtml,
      }

      // Solo agregar attachments si hay adjuntos
      // Nodemailer construirá automáticamente el mensaje MIME multipart con boundary
      if (emailAttachments.length > 0) {
        mailOptions.attachments = emailAttachments
        console.log(`📎 [MailController] Enviando correo con ${emailAttachments.length} adjunto(s) usando MIME multipart/base64`)
        
        // Todos los archivos ya están validados y codificados en memoria
        emailAttachments.forEach((att) => {
          const fileSize = (att.content as Buffer).length
          console.log(`✅ [MailController] Adjunto listo: ${att.filename} (${(fileSize / 1024).toFixed(2)} KB, base64)`)
        })
      }

      const info = await transporter.sendMail(mailOptions)

      console.log('Correo enviado:', info.messageId)
      return response.ok({ success: true, message: 'Correo enviado correctamente' })
    } catch (error) {
      console.error('Error al enviar correo:', error)
      return response.internalServerError({ success: false, message: 'Error al enviar el correo' })
    }
  }

  /**
   * Obtiene el Content-Type basado en la extensión del archivo
   * Incluye charset cuando es necesario según RFC 2045/2046
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop() || ''
    const contentTypes: Record<string, string> = {
      // Documentos
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'odt': 'application/vnd.oasis.opendocument.text',
      'ods': 'application/vnd.oasis.opendocument.spreadsheet',
      'odp': 'application/vnd.oasis.opendocument.presentation',
      // Archivos de texto (con charset)
      'txt': 'text/plain; charset=utf-8',
      'csv': 'text/csv; charset=utf-8',
      'html': 'text/html; charset=utf-8',
      'htm': 'text/html; charset=utf-8',
      'css': 'text/css; charset=utf-8',
      'js': 'text/javascript; charset=utf-8',
      'json': 'application/json; charset=utf-8',
      'xml': 'application/xml; charset=utf-8',
      // Archivos comprimidos
      'rar': 'application/x-rar-compressed',
      'zip': 'application/zip',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      // Imágenes
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      // Video
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'webm': 'video/webm',
    }
    return contentTypes[ext] || 'application/octet-stream'
  }

  /**
   * Codifica un archivo en base64 de forma explícita
   * Valida el tamaño del archivo antes de codificar
   * @param filePath - Ruta del archivo a codificar
   * @param maxSizeMB - Tamaño máximo permitido en MB (default: 25MB, límite común de SMTP)
   * @returns Buffer con el contenido del archivo
   */
  private async encodeFileToBase64(filePath: string, maxSizeMB: number = 25): Promise<Buffer> {
    const fs = await import('fs/promises')
    
    try {
      // Verificar que el archivo existe
      const stats = await fs.stat(filePath)
      
      if (!stats.isFile()) {
        throw new Error(`La ruta no es un archivo: ${filePath}`)
      }

      // Validar tamaño del archivo (considerando que base64 aumenta ~33%)
      const fileSizeMB = stats.size / (1024 * 1024)
      const estimatedBase64SizeMB = fileSizeMB * 1.33

      if (estimatedBase64SizeMB > maxSizeMB) {
        throw new Error(
          `El archivo es demasiado grande: ${fileSizeMB.toFixed(2)} MB (estimado base64: ${estimatedBase64SizeMB.toFixed(2)} MB). Límite: ${maxSizeMB} MB`
        )
      }

      // Leer el archivo
      const fileContent = await fs.readFile(filePath)
      
      // Validar que la lectura fue exitosa
      if (!fileContent || fileContent.length === 0) {
        throw new Error(`El archivo está vacío: ${filePath}`)
      }

      return fileContent
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Archivo no encontrado: ${filePath}`)
      }
      throw error
    }
  }

  /**
   * Codifica el nombre de archivo según RFC 2047 para caracteres especiales
   * @param filename - Nombre del archivo a codificar
   * @returns Nombre codificado si tiene caracteres especiales, original si no
   */
  private encodeFilename(filename: string): string {
    // Verificar si el nombre contiene caracteres no ASCII o caracteres especiales problemáticos
    const hasSpecialChars = /[^\x20-\x7E]/.test(filename) || /[<>:"/\\|?*]/.test(filename)
    
    if (!hasSpecialChars) {
      return filename
    }

    // Codificar usando RFC 2047 (encoded-word)
    // Formato: =?charset?encoding?encoded-text?=
    try {
      // Usar encodeURIComponent para codificar caracteres especiales
      // y luego reemplazar % con = para formato base64
      const encoded = Buffer.from(filename, 'utf-8').toString('base64')
      return `=?UTF-8?B?${encoded}?=`
    } catch (error) {
      // Si falla la codificación, retornar el nombre original
      console.warn(`⚠️ [MailController] Error al codificar nombre de archivo: ${filename}`, error)
      return filename
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
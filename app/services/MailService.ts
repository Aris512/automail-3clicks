import nodemailer from 'nodemailer'

export default class MailService {
  private transporter

  constructor() {
    const port = Number(process.env.SMTP_PORT)


    
    
    // Configuración automática según el puerto
    const config = this.getSmtpConfigByPort(port)
    
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: config.secure,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: config.tls,
    })
  }

  /**
   * Obtiene la configuración SMTP según el puerto
   */
  private getSmtpConfigByPort(port: number) {
    switch (port) {
      case 465:
        // Puerto 465 - SSL (implicit SSL)
        return {
          secure: true,
          tls: {
            rejectUnauthorized: false
          }
        }
      
      case 587:
        // Puerto 587 - TLS (STARTTLS)
        return {
          secure: false,
          tls: {
            rejectUnauthorized: false
          }
        }
      
      case 25:
        // Puerto 25 - Unsecure (sin cifrado)
        return {
          secure: false,
          tls: {
            rejectUnauthorized: false
          }
        }
      
      default:
        // Configuración por defecto para otros puertos
        console.warn(`⚠️ Puerto ${port} no reconocido. Usando configuración por defecto.`)
        return {
          secure: false,
          tls: {
            rejectUnauthorized: false
          }
        }
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    const info = await this.transporter.sendMail({
      from: `"Soporte Airie" <${process.env.MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
    })

    console.log('Correo enviado: %s', info.messageId)
    return info
  }
}

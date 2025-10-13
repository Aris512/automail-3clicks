import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

export default defineConfig({
  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
      auth: {
        user: env.get('SMTP_USERNAME'),
        pass: env.get('SMTP_PASSWORD'),
        type: 'login',
      },
      secure: env.get('MAIL_ENCRYPTION') === 'ssl',
    }),
  },
  
  // Configurar mailer por defecto
  default: 'smtp',
  
  from: {
    address: env.get('MAIL_FROM_ADDRESS')!,
    name: env.get('MAIL_FROM_NAME')!,
  },
})

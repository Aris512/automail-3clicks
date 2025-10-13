import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

// Función para enviar correo usando la plantilla default.edge
async function enviarCorreoConPlantilla() {
  try {
    console.log('🚀 Enviando correo usando plantilla default.edge...')
    console.log('📧 Configuración SMTP:')
    console.log(`   Host: ${process.env.SMTP_HOST}`)
    console.log(`   Puerto: ${process.env.SMTP_PORT}`)
    console.log(`   Usuario: ${process.env.SMTP_USERNAME}`)
    console.log(`   SSL: ${process.env.MAIL_ENCRYPTION === 'ssl'}`)
    console.log('')

    // Crear transporter de nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.MAIL_ENCRYPTION === 'ssl',
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    // Verificar la conexión
    console.log('🔍 Verificando conexión SMTP...')
    await transporter.verify()
    console.log('✅ Conexión SMTP verificada correctamente')
    console.log('')

    // Variables para la plantilla (equivalente a {{ subject }} y {{ messaje }})
    const subject = 'Prueba con plantilla default.edge'
    const messaje = '¡Hola! Este correo utiliza exactamente la misma estructura HTML de la plantilla default.edge. El sistema está funcionando perfectamente con el formato base de Soporte Airie.'

    // HTML usando la estructura exacta de default.edge
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #f4f4f4;
            padding: 20px;
            text-align: center;
            border-radius: 5px;
        }
        .content {
            padding: 20px;
            background-color: #fff;
        }
        .footer {
            background-color: #f4f4f4;
            padding: 10px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Soporte Airie</h1>
    </div>
    
    <div class="content">
        <h2>${subject}</h2>
        <p>${messaje}</p>
    </div>
    
    <div class="footer">
        <p>Este es un correo automático de Soporte Airie</p>
    </div>
</body>
</html>
    `

    // Configurar el correo
    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: 'jtoroangelus@gmail.com',
      subject: subject,
      html: htmlTemplate
    }

    // Enviar el correo
    console.log('📤 Enviando correo con plantilla default.edge...')
    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ ¡Correo enviado exitosamente usando plantilla default.edge!')
    console.log('📬 Revisa tu bandeja de entrada en jtoroangelus@gmail.com')
    console.log('📧 Message ID:', info.messageId)
    console.log('🔗 Respuesta del servidor:', info.response)
    console.log('')
    console.log('🎯 Características del correo enviado:')
    console.log('   • Estructura HTML idéntica a default.edge')
    console.log('   • Header con "Soporte Airie"')
    console.log('   • Contenido dinámico con asunto y mensaje')
    console.log('   • Footer informativo')
    console.log('   • Estilos CSS integrados')
    
  } catch (error) {
    console.error('❌ Error al enviar el correo:', error.message)
    console.error('Detalles del error:', error)
  }
}

// Ejecutar la función
enviarCorreoConPlantilla()

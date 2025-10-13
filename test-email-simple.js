import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

// Función para enviar correo de prueba
async function enviarCorreoPrueba() {
  try {
    console.log('🚀 Iniciando envío de correo de prueba...')
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
      secure: process.env.MAIL_ENCRYPTION === 'ssl', // true para puerto 465, false para otros
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

    // Configurar el correo
    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: 'jtoroangelus@gmail.com',
      subject: 'Prueba desde script independiente - AutoMail',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Prueba desde script independiente</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9f9f9;
                }
                .container {
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                }
                .content {
                    padding: 30px;
                }
                .content h2 {
                    color: #333;
                    margin-top: 0;
                }
                .info-box {
                    background-color: #f8f9fa;
                    border-left: 4px solid #667eea;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 0 5px 5px 0;
                }
                .footer {
                    background-color: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #eee;
                }
                .success {
                    color: #28a745;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 AutoMail - Sistema de Correo</h1>
                </div>
                
                <div class="content">
                    <h2>¡Prueba Exitosa!</h2>
                    <p>¡Hola! Este correo fue enviado usando un <strong>script Node.js independiente</strong>. El sistema de correo está funcionando correctamente.</p>
                    
                    <div class="info-box">
                        <h3>📧 Configuración utilizada:</h3>
                        <ul>
                            <li><strong>Host SMTP:</strong> ${process.env.SMTP_HOST}</li>
                            <li><strong>Puerto:</strong> ${process.env.SMTP_PORT}</li>
                            <li><strong>Usuario:</strong> ${process.env.SMTP_USERNAME}</li>
                            <li><strong>SSL:</strong> ${process.env.MAIL_ENCRYPTION === 'ssl' ? '✅ Habilitado' : '❌ Deshabilitado'}</li>
                            <li><strong>Servidor:</strong> ns1.superredtv.cl</li>
                        </ul>
                    </div>
                    
                    <p class="success">✅ El sistema de correo de AutoMail está completamente funcional</p>
                    <p>Este correo confirma que:</p>
                    <ul>
                        <li>La configuración SMTP es correcta</li>
                        <li>La conexión al servidor funciona</li>
                        <li>El envío de correos está operativo</li>
                        <li>Las plantillas HTML se renderizan correctamente</li>
                    </ul>
                </div>
                
                <div class="footer">
                    <p>Este es un correo automático de <strong>Soporte Airie</strong></p>
                    <p>Generado por el sistema AutoMail - ${new Date().toLocaleString()}</p>
                </div>
            </div>
        </body>
        </html>
      `
    }

    // Enviar el correo
    console.log('📤 Enviando correo...')
    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ ¡Correo enviado exitosamente!')
    console.log('📬 Revisa tu bandeja de entrada en jtoroangelus@gmail.com')
    console.log('📧 Message ID:', info.messageId)
    console.log('🔗 Respuesta del servidor:', info.response)
    
  } catch (error) {
    console.error('❌ Error al enviar el correo:', error.message)
    console.error('Detalles del error:', error)
  }
}

// Ejecutar la función
enviarCorreoPrueba()

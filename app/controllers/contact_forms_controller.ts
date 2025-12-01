import type { HttpContext } from '@adonisjs/core/http'
import ContactForm from '#models/contact_form'
import TenantUser from '#models/tenant_user'
import Subscriber from '#models/subscriber'
import List from '#models/list'
import SubscriberList from '#models/subscriber_list'
import { cuid } from '@adonisjs/core/helpers'
import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'

@inject()
export default class ContactFormsController {
  /**
   * Listar todos los formularios del tenant
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo',
        data: []
      })
    }

    const forms = await ContactForm.query()
      .where('tenantId', tenantUser.tenantId)
      .preload('list')
      .orderBy('createdAt', 'desc')

    return response.json({
      success: true,
      data: forms
    })
  }

  /**
   * Crear un nuevo formulario
   */
  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const data = request.only(['name', 'fields', 'listId', 'durationDays'])

    // Validaciones
    if (!data.name || !data.name.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El nombre del formulario es requerido'
      })
    }

    if (!data.fields || typeof data.fields !== 'object') {
      return response.status(400).json({
        success: false,
        message: 'Los campos del formulario son requeridos'
      })
    }

    // Validar que al menos el email esté habilitado
    if (!data.fields.email) {
      return response.status(400).json({
        success: false,
        message: 'El campo email debe estar habilitado'
      })
    }

    // Validar duración (máximo 7 días)
    const durationDays = parseInt(data.durationDays) || 7
    if (durationDays < 1 || durationDays > 7) {
      return response.status(400).json({
        success: false,
        message: 'La duración debe estar entre 1 y 7 días'
      })
    }

    // Validar lista si se proporciona
    if (data.listId) {
      const list = await List.query()
        .where('id', data.listId)
        .where('tenantId', tenantUser.tenantId)
        .first()

      if (!list) {
        return response.status(400).json({
          success: false,
          message: 'La lista especificada no existe o no pertenece a tu tenant'
        })
      }
    }

    try {
      // Generar ID único
      const uniqueId = cuid().substring(0, 12)

      // Calcular fecha de expiración
      const expiresAt = DateTime.now().plus({ days: durationDays })

      // Crear el formulario
      const form = await ContactForm.create({
        tenantId: tenantUser.tenantId,
        userId: user.id,
        name: data.name.trim(),
        uniqueId: uniqueId,
        fields: data.fields,
        listId: data.listId || null,
        expiresAt: expiresAt,
        active: true
      })

      // Cargar relaciones
      await form.load('list')

      return response.status(201).json({
        success: true,
        message: 'Formulario creado exitosamente',
        data: form
      })
    } catch (error: any) {
      console.error('Error al crear formulario:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear el formulario',
        error: error.message
      })
    }
  }

  /**
   * Mostrar un formulario específico
   */
  async show({ params, auth, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const form = await ContactForm.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .preload('list')
      .first()

    if (!form) {
      return response.status(404).json({
        success: false,
        message: 'Formulario no encontrado'
      })
    }

    return response.json({
      success: true,
      data: form
    })
  }

  /**
   * Actualizar un formulario
   */
  async update({ params, request, auth, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const form = await ContactForm.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!form) {
      return response.status(404).json({
        success: false,
        message: 'Formulario no encontrado'
      })
    }

    const data = request.only(['name', 'fields', 'listId', 'active'])

    // Validaciones
    if (data.name !== undefined && (!data.name || !data.name.trim())) {
      return response.status(400).json({
        success: false,
        message: 'El nombre del formulario no puede estar vacío'
      })
    }

    if (data.fields) {
      if (typeof data.fields !== 'object') {
        return response.status(400).json({
          success: false,
          message: 'Los campos del formulario deben ser un objeto'
        })
      }

      // Validar que al menos el email esté habilitado
      if (!data.fields.email) {
        return response.status(400).json({
          success: false,
          message: 'El campo email debe estar habilitado'
        })
      }
    }

    // Validar lista si se proporciona
    if (data.listId !== undefined) {
      if (data.listId) {
        const list = await List.query()
          .where('id', data.listId)
          .where('tenantId', tenantUser.tenantId)
          .first()

        if (!list) {
          return response.status(400).json({
            success: false,
            message: 'La lista especificada no existe o no pertenece a tu tenant'
          })
        }
      }
    }

    try {
      // Actualizar campos
      if (data.name !== undefined) form.name = data.name.trim()
      if (data.fields !== undefined) form.fields = data.fields
      if (data.listId !== undefined) form.listId = data.listId || null
      if (data.active !== undefined) form.active = data.active

      await form.save()
      await form.load('list')

      return response.json({
        success: true,
        message: 'Formulario actualizado exitosamente',
        data: form
      })
    } catch (error: any) {
      console.error('Error al actualizar formulario:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar el formulario',
        error: error.message
      })
    }
  }

  /**
   * Eliminar un formulario
   */
  async destroy({ params, auth, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const form = await ContactForm.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!form) {
      return response.status(404).json({
        success: false,
        message: 'Formulario no encontrado'
      })
    }

    try {
      await form.delete()

      return response.json({
        success: true,
        message: 'Formulario eliminado exitosamente'
      })
    } catch (error: any) {
      console.error('Error al eliminar formulario:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar el formulario',
        error: error.message
      })
    }
  }

  /**
   * Mostrar formulario público HTML
   */
  async showPublicForm({ params, response }: HttpContext) {
    const { uniqueId } = params

    try {
      const form = await ContactForm.query()
        .where('uniqueId', uniqueId)
        .preload('list')
        .first()

      if (!form) {
        return response.status(404).send(this.getErrorHtml('Formulario no encontrado'))
      }

      if (!form.isAvailable()) {
        if (form.isExpired()) {
          return response.status(410).send(this.getErrorHtml('Este formulario ha expirado'))
        }
        return response.status(403).send(this.getErrorHtml('Este formulario no está disponible'))
      }

      // Generar HTML del formulario basado en los campos configurados
      const formHtml = this.generateFormHtml(form)

      return response.send(formHtml)
    } catch (error: any) {
      console.error('Error al mostrar formulario público:', error)
      return response.status(500).send(this.getErrorHtml('Error al cargar el formulario'))
    }
  }

  /**
   * Procesar envío del formulario público
   */
  async submitPublicForm({ params, request, response }: HttpContext) {
    const { uniqueId } = params

    // Configurar headers CORS
    response.header('Access-Control-Allow-Origin', '*')
    response.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.header('Access-Control-Allow-Headers', 'Content-Type')

    // Manejar preflight OPTIONS request
    if (request.method() === 'OPTIONS') {
      return response.status(200).send('OK')
    }

    try {
      const form = await ContactForm.query()
        .where('uniqueId', uniqueId)
        .preload('list')
        .first()

      if (!form) {
        return response.status(404).json({
          success: false,
          message: 'Formulario no encontrado'
        })
      }

      if (!form.isAvailable()) {
        if (form.isExpired()) {
          return response.status(410).json({
            success: false,
            message: 'Este formulario ha expirado'
          })
        }
        return response.status(403).json({
          success: false,
          message: 'Este formulario no está disponible'
        })
      }

      // Obtener datos del formulario
      const formData = request.only(['nombre', 'name', 'email', 'telefono', 'phone', 'descripcion', 'description'])

      // Normalizar nombres de campos
      const email = formData.email || ''
      const nombre = formData.nombre || formData.name || ''
      const descripcion = formData.descripcion || formData.description || ''

      // Validar email (siempre requerido)
      if (!email || !email.trim()) {
        return response.status(400).json({
          success: false,
          message: 'El email es requerido'
        })
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return response.status(400).json({
          success: false,
          message: 'El formato del email no es válido'
        })
      }

      // Validar campos requeridos según configuración
      if (form.fields.nombre && !nombre.trim()) {
        return response.status(400).json({
          success: false,
          message: 'El nombre es requerido'
        })
      }

      // Verificar si el email ya existe en este tenant
      const existingSubscriber = await Subscriber.query()
        .where('email', email.trim())
        .where('tenantId', form.tenantId)
        .first()

      if (existingSubscriber) {
        return response.status(409).json({
          success: false,
          message: 'Este email ya está registrado'
        })
      }

      // Crear el nuevo suscriptor
      const subscriber = await Subscriber.create({
        email: email.trim(),
        name: nombre.trim() || '',
        description: descripcion.trim() || '',
        tenantId: form.tenantId,
        status: 'active'
      })

      // Asociar con lista si el formulario tiene una lista configurada
      if (form.listId) {
        await SubscriberList.create({
          subscriberId: subscriber.id,
          listId: form.listId,
          source: 'manual',
          status: 'active',
          subscribedAt: DateTime.now()
        })
      }

      // Detectar si es una petición desde formulario HTML
      const acceptHeader = request.header('accept') || ''
      const isHtmlRequest = acceptHeader.includes('text/html') || 
                           request.header('content-type')?.includes('application/x-www-form-urlencoded')

      if (isHtmlRequest) {
        // Respuesta HTML para formularios
        return response.status(201).send(this.getSuccessHtml())
      } else {
        // Respuesta JSON para APIs
        return response.status(201).json({
          success: true,
          message: 'Contacto agregado exitosamente',
          data: {
            id: subscriber.id,
            email: subscriber.email,
            name: subscriber.name
          }
        })
      }

    } catch (error: any) {
      console.error('Error al procesar formulario público:', error)
      
      const acceptHeader = request.header('accept') || ''
      const isHtmlRequest = acceptHeader.includes('text/html') || 
                           request.header('content-type')?.includes('application/x-www-form-urlencoded')

      if (isHtmlRequest) {
        return response.status(500).send(this.getErrorHtml('Error al procesar el formulario'))
      } else {
        return response.status(500).json({
          success: false,
          message: 'Error al procesar el formulario',
          error: error.message
        })
      }
    }
  }

  /**
   * Generar HTML del formulario público
   */
  private generateFormHtml(form: ContactForm): string {
    const fields = form.fields
    const formId = form.uniqueId

    let formFieldsHtml = ''

    if (fields.nombre) {
      formFieldsHtml += `
        <div class="form-group">
          <label for="nombre">Nombre completo <span class="required">*</span></label>
          <input type="text" id="nombre" name="nombre" placeholder="Ingresa tu nombre completo" required>
        </div>
      `
    }

    // Email siempre está presente
    formFieldsHtml += `
      <div class="form-group">
        <label for="email">Email <span class="required">*</span></label>
        <input type="email" id="email" name="email" placeholder="tu@email.com" required>
      </div>
    `

    if (fields.telefono) {
      formFieldsHtml += `
        <div class="form-group">
          <label for="telefono">Teléfono</label>
          <input type="tel" id="telefono" name="telefono" placeholder="Ingresa tu teléfono">
        </div>
      `
    }

    if (fields.descripcion) {
      formFieldsHtml += `
        <div class="form-group">
          <label for="descripcion">Descripción</label>
          <textarea id="descripcion" name="descripcion" rows="4" placeholder="Ingresa una descripción (opcional)"></textarea>
        </div>
      `
    }

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${form.name}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
          }
          h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 28px;
            font-weight: 700;
          }
          .subtitle {
            color: #6b7280;
            margin-bottom: 30px;
            font-size: 14px;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            color: #374151;
            font-weight: 500;
            margin-bottom: 8px;
            font-size: 14px;
          }
          .required {
            color: #ef4444;
          }
          input[type="text"],
          input[type="email"],
          input[type="tel"],
          textarea {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s;
            font-family: inherit;
          }
          input:focus,
          textarea:focus {
            outline: none;
            border-color: #f97316;
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
          }
          textarea {
            resize: vertical;
          }
          button {
            width: 100%;
            padding: 14px;
            background: #f97316;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 10px;
          }
          button:hover {
            background: #ea580c;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
          }
          button:active {
            transform: translateY(0);
          }
          button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
          }
          .message {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
          }
          .message.success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #10b981;
          }
          .message.error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #ef4444;
          }
          .message.show {
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${form.name}</h1>
          <p class="subtitle">Por favor completa el siguiente formulario</p>
          
          <div id="message" class="message"></div>
          
          <form id="contactForm">
            ${formFieldsHtml}
            <button type="submit" id="submitBtn">Enviar</button>
          </form>
        </div>
        
        <script>
          document.getElementById('contactForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const messageDiv = document.getElementById('message');
            const form = e.target;
            
            // Deshabilitar botón
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            messageDiv.classList.remove('show', 'success', 'error');
            
            // Obtener datos del formulario
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
              data[key] = value;
            });
            
            try {
              const res = await fetch('/api/form/${formId}/submit', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
              });
              
              const result = await res.json();
              
              if (res.ok && result.success) {
                messageDiv.textContent = '¡Contacto agregado exitosamente!';
                messageDiv.classList.add('show', 'success');
                form.reset();
                
                // Ocultar mensaje después de 5 segundos
                setTimeout(() => {
                  messageDiv.classList.remove('show');
                }, 5000);
              } else {
                messageDiv.textContent = result.message || 'Error al agregar contacto';
                messageDiv.classList.add('show', 'error');
              }
            } catch (error) {
              messageDiv.textContent = 'Error al enviar el formulario. Por favor, inténtalo de nuevo.';
              messageDiv.classList.add('show', 'error');
            } finally {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Enviar';
            }
          });
        </script>
      </body>
      </html>
    `
  }

  /**
   * Generar HTML de éxito
   */
  private getSuccessHtml(): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Suscripción Exitosa</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 100%;
            padding: 40px;
            text-align: center;
          }
          .success {
            color: #10b981;
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 24px;
            font-weight: 700;
          }
          p {
            color: #6b7280;
            margin-bottom: 30px;
            font-size: 14px;
          }
          .back-btn {
            background: #f97316;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
          }
          .back-btn:hover {
            background: #ea580c;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h1>¡Suscripción Exitosa!</h1>
          <p>Gracias por suscribirte. Hemos recibido tu información correctamente.</p>
          <button class="back-btn" onclick="history.back()">Volver</button>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generar HTML de error
   */
  private getErrorHtml(message: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 100%;
            padding: 40px;
            text-align: center;
          }
          .error {
            color: #ef4444;
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 24px;
            font-weight: 700;
          }
          p {
            color: #6b7280;
            margin-bottom: 30px;
            font-size: 14px;
          }
          .back-btn {
            background: #f97316;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
          }
          .back-btn:hover {
            background: #ea580c;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">✗</div>
          <h1>Error</h1>
          <p>${message}</p>
          <button class="back-btn" onclick="history.back()">Volver</button>
        </div>
      </body>
      </html>
    `
  }
}


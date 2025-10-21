import type { HttpContext } from '@adonisjs/core/http'
import Subscriber from '#models/subscriber'
import TenantUser from '#models/tenant_user'
import { inject } from '@adonisjs/core'
import XLSX from 'xlsx'
import csv from 'csv-parser'
import { createReadStream } from 'fs'

@inject()
export default class SubscribersController {
  /**
   * Display una lista de contactos
   */
  async index({ auth, inertia, session }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return inertia.render('auth/contactos', {
        user: auth.user,
        subscribers: []
      })
    }

    const subscribers = await Subscriber.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('createdAt', 'desc')
    
    return inertia.render('auth/contactos', {
      user: auth.user,
      subscribers,
      flash: {
        success: session.get('success'),
        error: session.get('error')
      }
    })
  }


  /**
   * Crear un nuevo contacto
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

    // Validar datos
    const data = request.only(['name', 'email', 'description', 'status'])
    
    // Validaciones básicas
    if (!data.name || !data.email) {
      return response.status(400).json({
        success: false,
        message: 'El nombre y email son requeridos'
      })
    }

    // Validar que el status sea uno de los valores permitidos
    const allowedStatuses = ['active', 'inactive', 'archived']
    if (data.status && !allowedStatuses.includes(data.status)) {
      return response.status(400).json({
        success: false,
        message: 'El estado debe ser: activo, inactivo o archivado'
      })
    }

    // Verificar si el email ya existe en este tenant
    const existingSubscriber = await Subscriber.query()
      .where('email', data.email)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (existingSubscriber) {
      return response.status(409).json({
        success: false,
        message: 'Ya existe un contacto con este email'
      })
    }

    try {
      const subscriber = await Subscriber.create({
        name: data.name,
        email: data.email,
        description: data.description || null,
        status: data.status || 'active',
        tenantId: tenantUser.tenantId
      })

      return response.status(201).json({
        success: true,
        message: 'Contacto agregado exitosamente',
        data: subscriber
      })
    } catch (error) {
      console.error('Error al crear contacto:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear el contacto'
      })
    }
  }

  /**
   * Handle form para editar un contacto
   */
  async update({ params, request, response, auth }: HttpContext) {
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

    const subscriber = await Subscriber.query()
      .where('id', params.id)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    const data = request.only(['name', 'email', 'description', 'status'])
    
    // Validaciones básicas
    if (!data.name || !data.email) {
      return response.status(400).json({
        success: false,
        message: 'El nombre y email son requeridos'
      })
    }

    // Validar que el status sea uno de los valores permitidos
    const allowedStatuses = ['active', 'inactive', 'archived']
    if (data.status && !allowedStatuses.includes(data.status)) {
      return response.status(400).json({
        success: false,
        message: 'El estado debe ser: activo, inactivo o archivado'
      })
    }

    // Verificar si el email ya existe en otro contacto del mismo tenant
    const existingSubscriber = await Subscriber.query()
      .where('email', data.email)
      .where('tenantId', tenantUser.tenantId)
      .where('id', '!=', params.id)
      .first()

    if (existingSubscriber) {
      return response.status(409).json({
        success: false,
        message: 'Ya existe otro contacto con este email'
      })
    }

    try {
      subscriber.merge(data)
      await subscriber.save()
      
      return response.status(200).json({
        success: true,
        message: 'Contacto actualizado exitosamente',
        data: subscriber
      })
    } catch (error) {
      console.error('Error al actualizar contacto:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar el contacto'
      })
    }
  }

  /**
   * Eliminar un contacto
   */
  async destroy({ params, response, auth }: HttpContext) {
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

    try {
      const subscriber = await Subscriber.query()
        .where('id', params.id)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()
      
      await subscriber.delete()
      
      return response.status(200).json({
        success: true,
        message: 'Contacto eliminado exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar contacto:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar el contacto'
      })
    }
  }



  /**
   * Handle public subscription from external forms
   */
  async publicSubscribe({ request, response }: HttpContext) {
    try {
      // Configurar headers CORS para formularios HTML
      response.header('Access-Control-Allow-Origin', '*')
      response.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
      response.header('Access-Control-Allow-Headers', 'Content-Type')
      
      // Manejar preflight OPTIONS request
      if (request.method() === 'OPTIONS') {
        return response.status(200).send('OK')
      }

      // Obtener datos del formulario
      const { email, name, description, company, listId } = request.only([
        'email', 'name', 'description', 'company', 'listId'
      ])

      // Validaciones básicas
      if (!email) {
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

      // Buscar el tenant por defecto (puedes ajustar esta lógica según tu necesidad)
      // Por ahora usaremos el primer tenant activo
      const tenantUser = await TenantUser.query()
        .where('active', true)
        .first()

      if (!tenantUser) {
        return response.status(500).json({
          success: false,
          message: 'Error del servidor: No hay tenant disponible'
        })
      }

      // Verificar si el email ya existe en este tenant
      const existingSubscriber = await Subscriber.query()
        .where('email', email)
        .where('tenantId', tenantUser.tenantId)
        .first()

      if (existingSubscriber) {
        return response.status(409).json({
          success: false,
          message: 'Este email ya está registrado'
        })
      }

      // Crear el nuevo suscriptor
      const subscriber = await Subscriber.create({
        email,
        name: name || '',
        description: description || '',
        company: company || '',
        tenantId: tenantUser.tenantId,
        status: 'active'
      })

      // Si se proporcionó listId, agregar a la lista
      if (listId) {
        // Aquí podrías agregar lógica para asociar el suscriptor a una lista específica
        // Por ahora solo creamos el suscriptor
      }

      // Detectar si es una petición desde formulario HTML o API
      const acceptHeader = request.header('accept') || ''
      const isHtmlRequest = acceptHeader.includes('text/html') || 
                           request.header('content-type')?.includes('application/x-www-form-urlencoded')

      if (isHtmlRequest) {
        // Respuesta HTML para formularios
        return response.status(201).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Suscripción Exitosa</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
              .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; }
              .success { color: #059669; font-size: 48px; margin-bottom: 20px; }
              h1 { color: #111827; margin-bottom: 10px; }
              p { color: #6b7280; margin-bottom: 20px; }
              .back-btn { background: #f97316; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
              .back-btn:hover { background: #ea580c; }
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
        `)
      } else {
        // Respuesta JSON para APIs
        return response.status(201).json({
          success: true,
          message: 'Suscripción exitosa',
          data: {
            id: subscriber.id,
            email: subscriber.email,
            name: subscriber.name
          }
        })
      }

    } catch (error) {
      console.error('Error en publicSubscribe:', error)
      
      // Detectar si es una petición desde formulario HTML
      const acceptHeader = request.header('accept') || ''
      const isHtmlRequest = acceptHeader.includes('text/html') || 
                           request.header('content-type')?.includes('application/x-www-form-urlencoded')
      
      if (isHtmlRequest) {
        // Respuesta HTML para errores en formularios
        return response.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Error en Suscripción</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
              .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; }
              .error { color: #dc2626; font-size: 48px; margin-bottom: 20px; }
              h1 { color: #111827; margin-bottom: 10px; }
              p { color: #6b7280; margin-bottom: 20px; }
              .back-btn { background: #f97316; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
              .back-btn:hover { background: #ea580c; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">✗</div>
              <h1>Error en Suscripción</h1>
              <p>Hubo un problema al procesar tu suscripción. Por favor, inténtalo de nuevo.</p>
              <button class="back-btn" onclick="history.back()">Volver</button>
            </div>
          </body>
          </html>
        `)
      } else {
        // Respuesta JSON para errores en APIs
        return response.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        })
      }
    }
  }

  /**
   * Handle public subscription from external forms
   */
  async publicIndex({ request, response }: HttpContext) {
    try {
      // Configurar headers CORS
      response.header('Access-Control-Allow-Origin', '*')
      response.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
      response.header('Access-Control-Allow-Headers', 'Content-Type')
      
      // Obtener tenantId opcional de query params
      const tenantId = request.qs().tenantId
      
      let query = Subscriber.query()
      
      // Si se especifica tenantId, filtrar por ese tenant
      if (tenantId) {
        query = query.where('tenantId', tenantId)
      }
      
      // Devolver todos los subscribers independientemente del estado
      const subscribers = await query
        .orderBy('createdAt', 'desc')
        .select(['id', 'name', 'email', 'description', 'status', 'createdAt'])
      
      return response.json({
        success: true,
        data: subscribers
      })
    } catch (error) {
      console.error('Error en publicIndex:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener la lista de contactos'
      })
    }
  }

  /**
   * Importar contactos desde archivos CSV, XLSX o XLS
   */
  async import({ request, response, auth }: HttpContext) {
    console.log('🚀 [IMPORT] Iniciando proceso de importación de contactos')
    
    const user = auth.user!
    console.log(`👤 [IMPORT] Usuario autenticado: ${user.email} (ID: ${user.id})`)
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      console.log('❌ [IMPORT] Usuario no tiene acceso a ningún tenant activo')
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    console.log(`🏢 [IMPORT] Tenant encontrado: ID ${tenantUser.tenantId}`)

    try {
      console.log('📁 [IMPORT] Procesando archivo subido...')
      
      // Obtener el archivo subido
      const file = request.file('file', {
        size: '15mb',
        extnames: ['csv', 'xls', 'xlsx']
      })

      if (!file) {
        console.log('❌ [IMPORT] No se proporcionó archivo válido')
        return response.status(400).json({
          success: false,
          message: 'No se ha proporcionado un archivo válido'
        })
      }

      console.log(`📄 [IMPORT] Archivo recibido: ${file.clientName}`)
      console.log(`📊 [IMPORT] Tamaño del archivo: ${file.size} bytes`)
      console.log(`🔖 [IMPORT] Extensión del archivo: ${file.extname}`)
      console.log(`📍 [IMPORT] Ruta temporal: ${file.tmpPath}`)

      // Validar tamaño del archivo (15MB máximo)
      const maxSize = 15 * 1024 * 1024 // 15MB en bytes
      if (file.size! > maxSize) {
        console.log(`❌ [IMPORT] Archivo excede tamaño máximo: ${file.size} bytes > ${maxSize} bytes`)
        return response.status(400).json({
          success: false,
          message: 'El archivo excede el tamaño máximo permitido de 15MB'
        })
      }

      // Validar extensión del archivo
      const allowedExtensions = ['csv', 'xls', 'xlsx']
      const fileExtension = file.extname?.toLowerCase()
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        console.log(`❌ [IMPORT] Extensión no válida: ${fileExtension}`)
        return response.status(400).json({
          success: false,
          message: 'Formato de archivo no válido. Solo se permiten archivos CSV, XLS y XLSX'
        })
      }

      console.log(`✅ [IMPORT] Validaciones de archivo pasadas correctamente`)

      let subscribers: Array<{ email: string; name?: string; description?: string }> = []

      // Procesar según el tipo de archivo
      if (fileExtension === 'csv') {
        console.log('📝 [IMPORT] Procesando archivo CSV...')
        subscribers = await this.parseCSVFile(file.tmpPath!)
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        console.log('📊 [IMPORT] Procesando archivo Excel...')
        subscribers = await this.parseExcelFile(file.tmpPath!)
      }

      console.log(`📋 [IMPORT] Contactos extraídos del archivo: ${subscribers.length}`)

      if (subscribers.length === 0) {
        console.log('❌ [IMPORT] No se encontraron datos válidos en el archivo')
        return response.status(400).json({
          success: false,
          message: 'No se encontraron datos válidos en el archivo'
        })
      }

      // Mostrar algunos ejemplos de los datos extraídos
      console.log('📝 [IMPORT] Primeros 3 contactos extraídos:')
      subscribers.slice(0, 3).forEach((sub, index) => {
        console.log(`   ${index + 1}. Email: ${sub.email}, Nombre: ${sub.name || 'N/A'}, Descripción: ${sub.description || 'N/A'}`)
      })

      // Validar que todos los emails sean válidos
      console.log('🔍 [IMPORT] Validando formato de emails...')
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = subscribers.filter(sub => !emailRegex.test(sub.email))
      
      if (invalidEmails.length > 0) {
        console.log(`❌ [IMPORT] Emails con formato inválido encontrados: ${invalidEmails.length}`)
        invalidEmails.forEach(email => console.log(`   - ${email.email}`))
        return response.status(400).json({
          success: false,
          message: `Se encontraron ${invalidEmails.length} emails con formato inválido`,
          invalidEmails: invalidEmails.map(sub => sub.email)
        })
      }

      console.log('✅ [IMPORT] Todos los emails tienen formato válido')

      // Verificar emails duplicados en el archivo
      console.log('🔍 [IMPORT] Verificando duplicados en el archivo...')
      const emailSet = new Set()
      const duplicateEmails = []
      for (const sub of subscribers) {
        if (emailSet.has(sub.email)) {
          duplicateEmails.push(sub.email)
        } else {
          emailSet.add(sub.email)
        }
      }

      if (duplicateEmails.length > 0) {
        console.log(`❌ [IMPORT] Emails duplicados en archivo: ${duplicateEmails.join(', ')}`)
        return response.status(400).json({
          success: false,
          message: `Se encontraron emails duplicados en el archivo: ${duplicateEmails.join(', ')}`
        })
      }

      console.log('✅ [IMPORT] No hay duplicados en el archivo')

      // Verificar emails que ya existen en la base de datos
      console.log('🔍 [IMPORT] Verificando emails existentes en la base de datos...')
      const existingEmails = await Subscriber.query()
        .where('tenantId', tenantUser.tenantId)
        .whereIn('email', subscribers.map(sub => sub.email))
        .select('email')

      const existingEmailList = existingEmails.map(sub => sub.email)
      if (existingEmailList.length > 0) {
        console.log(`❌ [IMPORT] Emails ya existentes en BD: ${existingEmailList.join(', ')}`)
        return response.status(409).json({
          success: false,
          message: `Los siguientes emails ya existen en la base de datos: ${existingEmailList.join(', ')}`,
          existingEmails: existingEmailList
        })
      }

      console.log('✅ [IMPORT] No hay emails duplicados en la base de datos')

      // Insertar los nuevos subscribers
      console.log('💾 [IMPORT] Preparando datos para inserción...')
      const subscribersToInsert = subscribers.map(sub => ({
        email: sub.email,
        name: sub.name || '',
        description: sub.description || '',
        tenantId: tenantUser.tenantId,
        status: 'active' as const
      }))

      console.log(`💾 [IMPORT] Insertando ${subscribersToInsert.length} contactos en la base de datos...`)
      await Subscriber.createMany(subscribersToInsert)

      console.log(`✅ [IMPORT] Importación completada exitosamente: ${subscribers.length} contactos`)

      return response.status(201).json({
        success: true,
        message: `Se importaron exitosamente ${subscribers.length} contactos`,
        imported: subscribers.length
      })

    } catch (error) {
      console.error('💥 [IMPORT] Error durante la importación:', error)
      console.error('💥 [IMPORT] Stack trace:', error.stack)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar el archivo'
      })
    }
  }

  /**
   * Parsear archivo CSV
   */
  private async parseCSVFile(filePath: string): Promise<Array<{ email: string; name?: string; description?: string }>> {
    console.log(`📝 [CSV] Iniciando parsing de archivo CSV: ${filePath}`)
    
    return new Promise((resolve, reject) => {
      const results: Array<{ email: string; name?: string; description?: string }> = []
      let rowCount = 0
      
      const stream = createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({
          separator: ','
        }))

      stream.on('data', (row) => {
        rowCount++
        console.log(`📝 [CSV] Procesando fila ${rowCount}:`, Object.keys(row))
        
        // Normalizar nombres de columnas (case insensitive)
        const normalizedRow: any = {}
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key]
        })

        console.log(`📝 [CSV] Columnas normalizadas:`, Object.keys(normalizedRow))

        // Verificar que existe la columna email
        if (normalizedRow.email && normalizedRow.email.trim()) {
          const subscriber = {
            email: normalizedRow.email.trim(),
            name: normalizedRow.name?.trim() || '',
            description: normalizedRow.description?.trim() || ''
          }
          results.push(subscriber)
          console.log(`📝 [CSV] Contacto agregado: ${subscriber.email}`)
        } else {
          console.log(`⚠️ [CSV] Fila ${rowCount} omitida - sin email válido`)
        }
      })

      stream.on('end', () => {
        console.log(`✅ [CSV] Parsing completado: ${results.length} contactos de ${rowCount} filas`)
        resolve(results)
      })

      stream.on('error', (error) => {
        console.error(`💥 [CSV] Error durante parsing:`, error)
        reject(error)
      })
    })
  }

  /**
   * Parsear archivo Excel (XLSX/XLS)
   */
  private async parseExcelFile(filePath: string): Promise<Array<{ email: string; name?: string; description?: string }>> {
    console.log(`📊 [EXCEL] Iniciando parsing de archivo Excel: ${filePath}`)
    
    try {
      const workbook = XLSX.readFile(filePath)
      console.log(`📊 [EXCEL] Hojas disponibles: ${workbook.SheetNames.join(', ')}`)
      
      const sheetName = workbook.SheetNames[0]
      
      if (!sheetName) {
        console.log('❌ [EXCEL] No se encontraron hojas de cálculo en el archivo')
        throw new Error('No se encontraron hojas de cálculo en el archivo')
      }

      console.log(`📊 [EXCEL] Procesando hoja: ${sheetName}`)
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      console.log(`📊 [EXCEL] Total de filas encontradas: ${jsonData.length}`)

      if (jsonData.length < 2) {
        console.log('❌ [EXCEL] El archivo debe contener al menos una fila de encabezados y una fila de datos')
        throw new Error('El archivo debe contener al menos una fila de encabezados y una fila de datos')
      }

      // Obtener encabezados (primera fila)
      const headers = jsonData[0] as string[]
      console.log(`📊 [EXCEL] Encabezados encontrados: ${headers.join(', ')}`)
      
      const normalizedHeaders = headers.map(header => header.toLowerCase().trim())
      console.log(`📊 [EXCEL] Encabezados normalizados: ${normalizedHeaders.join(', ')}`)

      // Buscar índices de las columnas requeridas
      const emailIndex = normalizedHeaders.findIndex(header => header === 'email')
      
      if (emailIndex === -1) {
        console.log('❌ [EXCEL] No se encontró columna "email"')
        throw new Error('El archivo debe contener una columna "email"')
      }

      const nameIndex = normalizedHeaders.findIndex(header => header === 'name')
      const descriptionIndex = normalizedHeaders.findIndex(header => header === 'description')

      console.log(`📊 [EXCEL] Índices encontrados - Email: ${emailIndex}, Nombre: ${nameIndex}, Descripción: ${descriptionIndex}`)

      // Procesar filas de datos
      const results: Array<{ email: string; name?: string; description?: string }> = []
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[]
        console.log(`📊 [EXCEL] Procesando fila ${i}:`, row)
        
        if (row[emailIndex] && row[emailIndex].toString().trim()) {
          const subscriber = {
            email: row[emailIndex].toString().trim(),
            name: nameIndex !== -1 && row[nameIndex] ? row[nameIndex].toString().trim() : '',
            description: descriptionIndex !== -1 && row[descriptionIndex] ? row[descriptionIndex].toString().trim() : ''
          }
          results.push(subscriber)
          console.log(`📊 [EXCEL] Contacto agregado: ${subscriber.email}`)
        } else {
          console.log(`⚠️ [EXCEL] Fila ${i} omitida - sin email válido`)
        }
      }

      console.log(`✅ [EXCEL] Parsing completado: ${results.length} contactos de ${jsonData.length - 1} filas de datos`)
      return results
    } catch (error) {
      console.error(`💥 [EXCEL] Error durante parsing:`, error)
      throw new Error(`Error al procesar archivo Excel: ${error.message}`)
    }
  }

  
}
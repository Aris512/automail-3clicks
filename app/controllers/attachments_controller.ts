import type { HttpContext } from '@adonisjs/core/http'
import Attachment from '#models/attachment'
import TenantUser from '#models/tenant_user'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export default class AttachmentsController {
  /**
   * Subir un archivo temporal (solo guardar físicamente, sin BD)
   * Usado durante la edición de plantillas
   */
  async storeTemp({ request, response, auth }: HttpContext) {
    console.log('🚀 [ATTACHMENT STORE TEMP] Iniciando subida temporal de archivo')
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

    const file = request.file('file', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
    })

    if (!file) {
      return response.status(400).json({
        success: false,
        message: 'No se proporcionó un archivo válido'
      })
    }

    try {
      // Generar nombre único para el archivo temporal
      // Extraer extensión del nombre original del archivo
      const originalName = file.clientName || 'file'
      const fileExtension = path.extname(originalName) || file.extname || ''
      const randomName = crypto.randomBytes(16).toString('hex')
      const fileName = `${randomName}${fileExtension}`
      
      // Crear directorio temporal si no existe
      const tempUploadDir = path.join(process.cwd(), 'public', 'uploads', 'temp', tenantUser.tenantId.toString())
      await fs.mkdir(tempUploadDir, { recursive: true })
      
      // Guardar archivo temporalmente
      // Leer el contenido del archivo ANTES de moverlo para evitar problemas con file.move() en Windows
      const filePath = path.join(tempUploadDir, fileName)
      const tempFilePath = file.tmpPath!
      
      // Leer el contenido del archivo temporal ANTES de intentar moverlo
      let fileContent: Buffer
      try {
        fileContent = await fs.readFile(tempFilePath)
      } catch (readError) {
        throw new Error(`No se pudo leer el archivo temporal: ${readError}`)
      }
      
      // Si el path ya existe como directorio o archivo, eliminarlo primero
      try {
        const existingStats = await fs.stat(filePath)
        if (existingStats.isDirectory()) {
          await fs.rmdir(filePath, { recursive: true })
        } else if (existingStats.isFile()) {
          await fs.unlink(filePath)
        }
      } catch {
        // El archivo/directorio no existe, continuar
      }
      
      // Escribir el archivo directamente en lugar de usar file.move()
      // Esto evita problemas donde file.move() crea un directorio en Windows
      await fs.writeFile(filePath, fileContent)
      
      // Verificar que se guardó correctamente como archivo
      const finalStats = await fs.stat(filePath)
      if (!finalStats.isFile()) {
        throw new Error('El archivo no se guardó correctamente después de escribir')
      }
      
      const tempPath = `/uploads/temp/${tenantUser.tenantId}/${fileName}`

      console.log('✅ [ATTACHMENT STORE TEMP] Archivo temporal guardado:', tempPath)

      return response.json({
        success: true,
        data: {
          path: tempPath,
          name: file.clientName || fileName,
          fileName: fileName,
          size: file.size!
        }
      })
    } catch (error) {
      console.error('Error uploading temp file:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al subir el archivo temporal'
      })
    }
  }

  /**
   * Subir un archivo (imagen)
   */
  async store({ request, response, auth }: HttpContext) {
    console.log('🚀 [ATTACHMENT STORE] Iniciando subida de archivo')
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

    const file = request.file('file', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    })

    if (!file) {
      return response.status(400).json({
        success: false,
        message: 'No se proporcionó un archivo válido'
      })
    }

    try {
      // Generar nombre único para el archivo
      // Extraer extensión del nombre original del archivo
      const originalName = file.clientName || 'file'
      const fileExtension = path.extname(originalName) || file.extname || ''
      const randomName = crypto.randomBytes(16).toString('hex')
      const fileName = `${randomName}${fileExtension}`
      
      // Crear directorio si no existe
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'attachments', tenantUser.tenantId.toString())
      await fs.mkdir(uploadDir, { recursive: true })
      
      // Guardar archivo
      const filePath = path.join(uploadDir, fileName)
      await file.move(filePath, { overwrite: true })
      
      // Guardar en base de datos
      const attachment = await Attachment.create({
        tenantId: tenantUser.tenantId,
        path: `/uploads/attachments/${tenantUser.tenantId}/${fileName}`,
        name: file.clientName || fileName,
        fileName: fileName,
        size: file.size!
      })

      console.log('✅ [ATTACHMENT STORE] Attachment creado:', attachment.id)
      console.log('📁 [ATTACHMENT STORE] Path:', attachment.path)

      return response.json({
        success: true,
        data: {
          id: attachment.id,
          path: attachment.path,
          name: attachment.name,
          fileName: attachment.fileName,
          size: attachment.size
        }
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al subir el archivo'
      })
    }
  }
}
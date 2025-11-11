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
    
    let file: any = null
    
    try {
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
      
      file = request.file('file', {
        size: '20mb',
        extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'docx', 'rar', 'zip', 'xlsx', 'xls']
      })
      
      // ⚠️ CRÍTICO: Verificar que el archivo existe
      if (!file) {
        console.error('❌ [ATTACHMENT STORE TEMP] No se proporcionó ningún archivo')
        return response.status(400).json({
          success: false,
          message: 'No se proporcionó ningún archivo'
        })
      }
      
      // ⚠️ CRÍTICO: Validar ANTES de procesar
      if (!file.isValid) {
        console.error('❌ [ATTACHMENT STORE TEMP] Archivo inválido:', file.errors)
        return response.status(422).json({
          success: false,
          message: 'Archivo inválido',
          errors: file.errors
        })
      }
      
      // Generar nombre único para el archivo temporal
      const originalName = file.clientName || 'file'
      const fileExtension = path.extname(originalName) || file.extname || ''
      const randomName = crypto.randomBytes(16).toString('hex')
      const fileName = `${randomName}${fileExtension}`
      
      console.log(`📦 [ATTACHMENT STORE TEMP] Procesando archivo: ${originalName} (${file.size} bytes)`)
      
      // Crear directorio temporal si no existe
      const tempUploadDir = path.join(
        process.cwd(), 
        'public', 
        'uploads', 
        'temp', 
        tenantUser.tenantId.toString()
      )
      await fs.mkdir(tempUploadDir, { recursive: true })
      
      // Preparar ruta de destino
      const filePath = path.join(tempUploadDir, fileName)
      
      // Si el path ya existe, eliminarlo primero
      try {
        const existingStats = await fs.stat(filePath)
        if (existingStats.isDirectory()) {
          await fs.rm(filePath, { recursive: true })
        } else if (existingStats.isFile()) {
          await fs.unlink(filePath)
        }
      } catch {
        // El archivo/directorio no existe, continuar
      }
      
      // ✅ MÉTODO ROBUSTO: Leer y escribir directamente
      const tempFilePath = file.tmpPath
      if (!tempFilePath) {
        throw new Error('No se encontró ruta temporal del archivo')
      }
      
      console.log(`📂 [ATTACHMENT STORE TEMP] Leyendo archivo temporal: ${tempFilePath}`)
      
      // Leer el contenido del archivo temporal
      let fileContent: Buffer
      try {
        fileContent = await fs.readFile(tempFilePath)
        console.log(`✅ [ATTACHMENT STORE TEMP] Archivo leído: ${fileContent.length} bytes`)
      } catch (readError: any) {
        console.error('❌ [ATTACHMENT STORE TEMP] Error al leer archivo:', readError)
        throw new Error(`No se pudo leer el archivo temporal: ${readError.message}`)
      }
      
      // Escribir el archivo en el destino final
      try {
        await fs.writeFile(filePath, fileContent)
        console.log(`✅ [ATTACHMENT STORE TEMP] Archivo escrito en: ${filePath}`)
      } catch (writeError: any) {
        console.error('❌ [ATTACHMENT STORE TEMP] Error al escribir archivo:', writeError)
        throw new Error(`No se pudo escribir el archivo: ${writeError.message}`)
      }
      
      // Verificar que se guardó correctamente como archivo
      let finalStats
      try {
        finalStats = await fs.stat(filePath)
        if (!finalStats.isFile()) {
          throw new Error('El archivo no se guardó correctamente: el path no es un archivo válido')
        }
        console.log(`✅ [ATTACHMENT STORE TEMP] Archivo verificado: ${finalStats.size} bytes`)
      } catch (statError: any) {
        console.error('❌ [ATTACHMENT STORE TEMP] Error al verificar archivo:', statError)
        throw new Error(`No se pudo verificar el archivo guardado: ${statError.message}`)
      }
      
      const tempPath = `/uploads/temp/${tenantUser.tenantId}/${fileName}`
      console.log('✅ [ATTACHMENT STORE TEMP] Archivo temporal guardado exitosamente:', tempPath)
      
      return response.json({
        success: true,
        data: {
          path: tempPath,
          name: file.clientName || fileName,
          fileName: fileName,
          size: file.size!,
          type: file.type || 'application/octet-stream'
        }
      })
      
    } catch (error: any) {
      console.error('❌ [ATTACHMENT STORE TEMP] Error uploading temp file:', error)
      console.error('❌ [ATTACHMENT STORE TEMP] Error stack:', error.stack)
      
      return response.status(500).json({
        success: false,
        message: 'Error al subir el archivo temporal',
        error: error.message || 'Error desconocido al procesar el archivo',
        details: {
          fileName: file?.clientName,
          fileSize: file?.size,
          fileType: file?.type
        }
      })
    }
  }

  /**
   * Subir un archivo (imagen)
   */
  async store({ request, response, auth }: HttpContext) {
    console.log('🚀 [ATTACHMENT STORE] Iniciando subida de archivo')
    
    let file: any = null
    
    try {
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
      
      file = request.file('file', {
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp']
      })
      
      // ⚠️ CRÍTICO: Verificar que el archivo existe
      if (!file) {
        console.error('❌ [ATTACHMENT STORE] No se proporcionó ningún archivo')
        return response.status(400).json({
          success: false,
          message: 'No se proporcionó ningún archivo'
        })
      }
      
      // ⚠️ CRÍTICO: Validar ANTES de procesar
      if (!file.isValid) {
        console.error('❌ [ATTACHMENT STORE] Archivo inválido:', file.errors)
        return response.status(422).json({
          success: false,
          message: 'Archivo inválido',
          errors: file.errors
        })
      }
      
      // Generar nombre único para el archivo
      const originalName = file.clientName || 'file'
      const fileExtension = path.extname(originalName) || file.extname || ''
      const randomName = crypto.randomBytes(16).toString('hex')
      const fileName = `${randomName}${fileExtension}`
      
      console.log(`📸 [ATTACHMENT STORE] Procesando imagen: ${originalName}`)
      
      // Crear directorio si no existe
      const uploadDir = path.join(
        process.cwd(), 
        'public', 
        'uploads', 
        'attachments', 
        tenantUser.tenantId.toString()
      )
      await fs.mkdir(uploadDir, { recursive: true })
      
      // Preparar ruta de destino
      const filePath = path.join(uploadDir, fileName)
      
      // ✅ Usar el mismo método robusto para imágenes
      const tempFilePath = file.tmpPath
      if (!tempFilePath) {
        throw new Error('No se encontró ruta temporal del archivo')
      }
      
      // Leer y escribir directamente
      try {
        const fileContent = await fs.readFile(tempFilePath)
        await fs.writeFile(filePath, fileContent)
        console.log(`✅ [ATTACHMENT STORE] Imagen guardada: ${filePath}`)
      } catch (ioError: any) {
        throw new Error(`Error al guardar la imagen: ${ioError.message}`)
      }
      
      // Verificar que se guardó correctamente
      try {
        const finalStats = await fs.stat(filePath)
        if (!finalStats.isFile()) {
          throw new Error('El archivo no se guardó correctamente')
        }
      } catch (statError: any) {
        throw new Error(`No se pudo verificar el archivo: ${statError.message}`)
      }
      
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
      
    } catch (error: any) {
      console.error('❌ [ATTACHMENT STORE] Error uploading file:', error)
      console.error('❌ [ATTACHMENT STORE] Error stack:', error.stack)
      
      return response.status(500).json({
        success: false,
        message: 'Error al subir el archivo',
        error: error.message || 'Error desconocido',
        details: {
          fileName: file?.clientName,
          fileSize: file?.size
        }
      })
    }
  }
}
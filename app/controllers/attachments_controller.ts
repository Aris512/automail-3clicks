import type { HttpContext } from '@adonisjs/core/http'
import Attachment from '#models/attachment'
import TenantUser from '#models/tenant_user'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export default class AttachmentsController {
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
      const fileExtension = file.extname
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

      return response.json({
        success: true,
        data: attachment
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
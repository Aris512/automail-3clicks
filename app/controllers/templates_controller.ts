import type { HttpContext } from '@adonisjs/core/http'
import Template from '#models/template'
import TenantUser from '#models/tenant_user'
import Attachment from '#models/attachment'
import TemplateAttachment from '#models/templates_attachment'
import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import fs from 'fs/promises'
import path from 'path'

@inject()
export default class TemplatesController {
  /**
   * Modificar la tabla templates para hacer stage_id nullable
   */
  private async ensureStageIdNullable() {
    try {
      await db.rawQuery('ALTER TABLE templates ALTER COLUMN stage_id DROP NOT NULL;')
      console.log('✅ Columna stage_id modificada a nullable')
    } catch (error: any) {
      // Ignorar si ya es nullable o si no existe
      if (!error.message.includes('already')) {
        console.log('⚠️ No se pudo modificar stage_id (ya debe ser nullable):', error.message)
      }
    }
  }

  /**
   * Extraer URLs de imágenes del HTML y asociarlas con la plantilla
   */
  private async associateImagesWithTemplate(templateId: number, tenantId: number, htmlContent: string) {
    try {
      // Extraer todas las URLs de imágenes (que empiecen con /uploads/attachments/)
      const imageUrlRegex = /src=["'](\/uploads\/attachments\/[^"']+)["']/g
      const matches = htmlContent.matchAll(imageUrlRegex)
      const imageUrls: string[] = []
      
      for (const match of matches) {
        if (match[1]) {
          imageUrls.push(match[1])
        }
      }

      console.log(`🖼️ [ASSOCIATE] Encontradas ${imageUrls.length} imágenes para asociar`)

      // Para cada URL, buscar el attachment correspondiente y crear la relación
      for (const imageUrl of imageUrls) {
        const attachment = await Attachment.query()
          .where('tenantId', tenantId)
          .where('path', imageUrl)
          .first()

        if (attachment) {
          // Verificar si la relación ya existe
          const existingRelation = await TemplateAttachment.query()
            .where('templateId', templateId)
            .where('attachmentId', attachment.id)
            .first()

          if (!existingRelation) {
            await TemplateAttachment.create({
              tenantId: tenantId,
              templateId: templateId,
              attachmentId: attachment.id
            })
            console.log(`✅ [ASSOCIATE] Imagen asociada: ${imageUrl}`)
          }
        }
      }
    } catch (error) {
      console.error('Error associating images:', error)
      // No fallar la creación de la plantilla si hay error asociando imágenes
    }
  }
  /**
   * Obtener todas las plantillas del tenant del usuario
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo',
        data: []
      })
    }

    const templates = await Template.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('createdAt', 'desc')
    
    return response.json({
      success: true,
      data: templates
    })
  }

  /**
   * Crear una nueva plantilla
   */
  async store({ request, response, auth }: HttpContext) {
    console.log('🚀 [STORE] Iniciando creación de plantilla')
    const user = auth.user!
    console.log(`👤 [STORE] Usuario autenticado: ${user.email} (ID: ${user.id})`)
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      console.log('❌ [STORE] Usuario no tiene acceso a ningún tenant activo')
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    console.log(`🏢 [STORE] Tenant encontrado: ID ${tenantUser.tenantId}`)

    const data = request.only(['name', 'subject', 'bodyMarkdown', 'availableVariables', 'active'])
    console.log('📋 [STORE] Datos recibidos:', { ...data, bodyMarkdown: `${data.bodyMarkdown?.substring(0, 50)}...` })
    
    // Validaciones
    if (!data.name || !data.name.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El nombre de la plantilla es requerido'
      })
    }

    if (!data.subject || !data.subject.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El asunto de la plantilla es requerido'
      })
    }

    if (!data.bodyMarkdown || !data.bodyMarkdown.trim()) {
      return response.status(400).json({
        success: false,
        message: 'El contenido de la plantilla es requerido'
      })
    }

    try {
      // Asegurar que stage_id es nullable antes de crear la plantilla
      await this.ensureStageIdNullable()
      
      console.log('💾 [STORE] Intentando crear plantilla...')
      
      // Truncar bodyMarkdown si es muy largo (por seguridad)
      const bodyContent = data.bodyMarkdown.substring(0, 10000000) // Máximo ~10MB de texto
      
      const templateData: any = {
        tenantId: tenantUser.tenantId,
        name: data.name,
        subject: data.subject,
        bodyMarkdown: bodyContent,
        availableVariables: data.availableVariables || [],
        active: data.active !== undefined ? data.active : true,
      }
      
      const template = await Template.create(templateData)
      console.log('✅ [STORE] Plantilla creada exitosamente:', template.id)
      console.log('📏 [STORE] Tamaño del contenido:', bodyContent.length, 'caracteres')

      // Extraer URLs de imágenes del HTML y crear relaciones en templates_attachments
      await this.associateImagesWithTemplate(template.id, tenantUser.tenantId, bodyContent)

      return response.json({
        success: true,
        message: 'Plantilla creada exitosamente',
        data: template
      })
    } catch (error) {
      console.error('❌ [STORE] Error al crear la plantilla:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear la plantilla',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Actualizar una plantilla existente
   */
  async update({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const { id } = params
    
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

    // Verificar que la plantilla existe y pertenece al tenant
    const template = await Template.query()
      .where('id', id)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!template) {
      return response.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      })
    }

    const data = request.only(['name', 'subject', 'bodyMarkdown', 'availableVariables', 'active'])
    
    template.merge(data)
    await template.save()

    // Re-asociar imágenes si el contenido cambió
    if (data.bodyMarkdown) {
      await this.associateImagesWithTemplate(template.id, tenantUser.tenantId, data.bodyMarkdown)
    }

    return response.json({
      success: true,
      message: 'Plantilla actualizada exitosamente',
      data: template
    })
  }

  /**
   * Eliminar una plantilla
   */
  async destroy({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { id } = params
    
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

    // Verificar que la plantilla existe y pertenece al tenant
    const template = await Template.query()
      .where('id', id)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!template) {
      return response.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      })
    }

    // Obtener todos los attachments relacionados con esta plantilla
    const templateAttachments = await TemplateAttachment.query()
      .where('templateId', id)
      .preload('attachment')

    console.log(`📎 [DESTROY] Encontrados ${templateAttachments.length} attachments asociados`)

    // Eliminar archivos físicos y registros de attachments
    for (const templateAttachment of templateAttachments) {
      if (templateAttachment.attachment) {
        const attachment = templateAttachment.attachment
        
        try {
          // Eliminar archivo físico
          const filePath = path.join(process.cwd(), 'public', attachment.path)
          
          // Verificar si el archivo existe antes de intentar eliminarlo
          try {
            await fs.access(filePath)
            await fs.unlink(filePath)
            console.log(`✅ [DESTROY] Archivo eliminado: ${attachment.path}`)
          } catch (fsError: any) {
            if (fsError.code !== 'ENOENT') {
              console.error(`⚠️ [DESTROY] Error al eliminar archivo ${attachment.path}:`, fsError.message)
            }
          }

          // Eliminar el registro de attachment
          await Attachment.query()
            .where('id', attachment.id)
            .delete()
          
          console.log(`✅ [DESTROY] Attachment eliminado de BD: ${attachment.id}`)
        } catch (error) {
          console.error(`❌ [DESTROY] Error al eliminar attachment ${templateAttachment.id}:`, error)
        }
      }
    }

    // Eliminar la plantilla
    await template.delete()

    return response.json({
      success: true,
      message: 'Plantilla eliminada exitosamente'
    })
  }

  /**
   * Obtener una plantilla específica
   */
  async show({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { id } = params
    
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

    // Verificar que la plantilla existe y pertenece al tenant
    const template = await Template.query()
      .where('id', id)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!template) {
      return response.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      })
    }

    return response.json({
      success: true,
      data: template
    })
  }
}
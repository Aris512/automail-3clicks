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
   * Procesar archivos temporales y moverlos a attachments
   * Retorna el HTML actualizado con las nuevas URLs
   */
  private async processTempFiles(tenantId: number, htmlContent: string): Promise<string> {
    try {
      console.log(`\n📁 [PROCESS TEMP] ===============================`)
      console.log(`📁 [PROCESS TEMP] Iniciando procesamiento de archivos temporales`)
      console.log(`📁 [PROCESS TEMP] Tenant ID: ${tenantId}`)
      
      // Extraer URLs temporales del HTML (soporta URLs absolutas y relativas)
      // Regex que detecta tanto URLs absolutas (http://...) como relativas (/uploads/temp/...)
      // Busca tanto en src (imágenes) como en href (adjuntos) y data-src (adjuntos)
      const tempImageRegex = /(?:src|href|data-src)=["'](https?:\/\/[^"']*\/uploads\/temp\/[^"']+|\.\.\/[^"']*uploads\/temp\/[^"']+|\/uploads\/temp\/[^"']+)["']/gi
      const matches = Array.from(htmlContent.matchAll(tempImageRegex))
      
      if (matches.length === 0) {
        console.log('📝 [PROCESS TEMP] No se encontraron archivos temporales')
        console.log(`📁 [PROCESS TEMP] ===============================\n`)
        return htmlContent
      }

      console.log(`🔄 [PROCESS TEMP] Procesando ${matches.length} archivos temporales`)

      let updatedContent = htmlContent

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const tempUrl = match[1] // URL completa (absoluta o relativa)
        const attribute = match[0].split('=')[0] // 'src', 'href', o 'data-src'
        
        console.log(`\n📁 [PROCESS TEMP] Procesando archivo ${i + 1}/${matches.length}`)
        console.log(`📁 [PROCESS TEMP] Archivo temporal (URL completa): ${tempUrl}`)
        
        // Extraer la ruta relativa desde la URL (eliminar dominio si es absoluta)
        let relativePath = tempUrl
        if (tempUrl.startsWith('http://') || tempUrl.startsWith('https://')) {
          // Es una URL absoluta, extraer solo la ruta
          const urlObj = new URL(tempUrl)
          relativePath = urlObj.pathname
          console.log(`📁 [PROCESS TEMP] URL absoluta detectada, ruta relativa extraída: ${relativePath}`)
        }
        
        // Construir la ruta física del archivo temporal
        let tempFilePath = path.join(process.cwd(), 'public', relativePath)
        
        // Verificar que el path existe
        let tempStats
        try {
          tempStats = await fs.stat(tempFilePath)
        } catch {
          console.warn(`⚠️ [PROCESS TEMP] Archivo temporal no encontrado: ${tempFilePath}`)
          continue
        }

        // Si es un directorio (problema conocido en Windows), buscar el archivo dentro
        if (tempStats.isDirectory()) {
          console.log(`⚠️ [PROCESS TEMP] El path es un directorio, buscando archivo dentro...`)
          try {
            const dirFiles = await fs.readdir(tempFilePath)
            if (dirFiles.length > 0) {
              // Tomar el primer archivo dentro del directorio
              tempFilePath = path.join(tempFilePath, dirFiles[0])
              console.log(`📁 [PROCESS TEMP] Archivo encontrado dentro del directorio: ${dirFiles[0]}`)
              tempStats = await fs.stat(tempFilePath)
            } else {
              console.warn(`⚠️ [PROCESS TEMP] Directorio vacío: ${tempFilePath}`)
              continue
            }
          } catch (dirError) {
            console.warn(`⚠️ [PROCESS TEMP] Error al leer directorio: ${dirError}`)
            continue
          }
        }

        // Verificar que ahora es un archivo
        if (!tempStats.isFile()) {
          console.warn(`⚠️ [PROCESS TEMP] El path no es un archivo válido: ${tempFilePath}`)
          continue
        }

        // Leer el archivo
        const fileStats = tempStats
        console.log(`📊 [PROCESS TEMP] Tamaño del archivo: ${fileStats.size} bytes`)

        // Generar nombre único para el archivo final (usar el nombre del archivo temporal real)
        const fileName = path.basename(tempFilePath)
        const attachmentDir = path.join(process.cwd(), 'public', 'uploads', 'attachments', tenantId.toString())
        await fs.mkdir(attachmentDir, { recursive: true })

        // Mover el archivo a attachments usando rename (más seguro en Windows)
        const finalPath = path.join(attachmentDir, fileName)
        
        try {
          // Intentar mover (rename) el archivo
          await fs.rename(tempFilePath, finalPath)
          console.log(`✅ [PROCESS TEMP] Archivo movido físicamente: ${tempUrl} -> /uploads/attachments/${tenantId}/${fileName}`)
        } catch (error: any) {
          // Si rename falla por permisos, intentar copiar y eliminar
          if (error.code === 'EPERM' || error.code === 'EXDEV') {
            await fs.copyFile(tempFilePath, finalPath)
            await fs.unlink(tempFilePath)
            console.log(`✅ [PROCESS TEMP] Archivo copiado y temporal eliminado: ${tempUrl} -> /uploads/attachments/${tenantId}/${fileName}`)
          } else {
            throw error
          }
        }

        // Verificar si el archivo ya existe en attachments antes de crear
        const attachmentPath = `/uploads/attachments/${tenantId}/${fileName}`
        
        console.log(`🔍 [PROCESS TEMP] Verificando si attachment existe en BD para: ${attachmentPath}`)
        
        // Buscar si ya existe un attachment con este path
        const existingAttachment = await Attachment.query()
          .where('tenantId', tenantId)
          .where('path', attachmentPath)
          .first()
        
        if (existingAttachment) {
          console.log(`🔄 [PROCESS TEMP] Attachment ya existe en BD (ID: ${existingAttachment.id}), actualizando...`)
          
          // Registrar valores anteriores para log
          const oldValues = {
            name: existingAttachment.name,
            fileName: existingAttachment.fileName,
            size: existingAttachment.size
          }
          
          // Actualizar TODOS los campos importantes del attachment existente
          existingAttachment.name = fileName
          existingAttachment.fileName = fileName
          existingAttachment.size = fileStats.size
          
          await existingAttachment.save()
          
          console.log(`✅ [PROCESS TEMP] Attachment actualizado en BD:`)
          console.log(`   - ID: ${existingAttachment.id}`)
          console.log(`   - Path: ${attachmentPath}`)
          console.log(`   - Name: "${oldValues.name}" -> "${fileName}"`)
          console.log(`   - FileName: "${oldValues.fileName}" -> "${fileName}"`)
          console.log(`   - Size: ${oldValues.size} bytes -> ${fileStats.size} bytes`)
        } else {
          console.log(`➕ [PROCESS TEMP] Attachment no existe, creando nuevo registro...`)
          
          // Crear nuevo registro en attachments
          const attachment = await Attachment.create({
            tenantId: tenantId,
            path: attachmentPath,
            name: fileName,
            fileName: fileName,
            size: fileStats.size
          })
          
          console.log(`✅ [PROCESS TEMP] Nuevo registro creado en BD:`)
          console.log(`   - ID: ${attachment.id}`)
          console.log(`   - Path: ${attachmentPath}`)
          console.log(`   - Tamaño: ${fileStats.size} bytes`)
        }

        // Actualizar la URL en el contenido (reemplazar tanto la URL absoluta como la relativa)
        // Reemplazar la URL original (absoluta o relativa) con la nueva ruta relativa de attachments
        // Actualizar tanto en src, href, como data-src dependiendo del atributo original
        if (attribute === 'src' || attribute === 'href' || attribute === 'data-src') {
          // Reemplazar el atributo completo manteniendo el formato original
          const oldAttr = `${attribute}="${tempUrl}"`
          const newAttr = attribute === 'data-src' 
            ? `data-src="${attachmentPath}"` 
            : attribute === 'href'
            ? `href="${attachmentPath}"`
            : `src="${attachmentPath}"`
          updatedContent = updatedContent.replace(oldAttr, newAttr)
          console.log(`🔄 [PROCESS TEMP] URL actualizada en contenido (${attribute}): ${tempUrl} -> ${attachmentPath}`)
        } else {
          // Fallback: reemplazo simple
          updatedContent = updatedContent.replace(tempUrl, attachmentPath)
          console.log(`🔄 [PROCESS TEMP] URL actualizada en contenido: ${tempUrl} -> ${attachmentPath}`)
        }
      }

      console.log(`✅ [PROCESS TEMP] Todos los archivos temporales procesados exitosamente`)
      console.log(`📁 [PROCESS TEMP] ===============================\n`)

      return updatedContent
    } catch (error) {
      console.error('❌ [PROCESS TEMP] Error procesando archivos temporales:', error)
      console.log(`📁 [PROCESS TEMP] ===============================\n`)
      return htmlContent // Retornar contenido original si hay error
    }
  }

  /**
   * Extraer URLs de imágenes y adjuntos del HTML y asociarlas con la plantilla
   */
  private async associateImagesWithTemplate(templateId: number, tenantId: number, htmlContent: string) {
    try {
      console.log(`\n🖼️ [ASSOCIATE IMAGES] ===============================`)
      console.log(`🖼️ [ASSOCIATE IMAGES] Template ID: ${templateId}`)
      console.log(`🖼️ [ASSOCIATE IMAGES] Tenant ID: ${tenantId}`)
      
      // Extraer todas las URLs de imágenes y adjuntos (que empiecen con /uploads/attachments/)
      // Busca en src (imágenes), href (adjuntos enlaces) y data-src (adjuntos en nodos)
      const attachmentUrlRegex = /(?:src|href|data-src)=["'](\/uploads\/attachments\/[^"']+)["']/g
      const matches = Array.from(htmlContent.matchAll(attachmentUrlRegex))
      const attachmentUrls: string[] = []
      
      for (const match of matches) {
        if (match[1]) {
          attachmentUrls.push(match[1])
        }
      }

      // Eliminar duplicados
      const uniqueUrls = [...new Set(attachmentUrls)]

      console.log(`🖼️ [ASSOCIATE IMAGES] Encontrados ${uniqueUrls.length} archivos (imágenes y adjuntos) en el HTML`)
      
      if (uniqueUrls.length > 0) {
        console.log(`🖼️ [ASSOCIATE IMAGES] URLs encontradas:`)
        uniqueUrls.forEach((url, index) => {
          console.log(`   ${index + 1}. ${url}`)
        })
      } else {
        console.log(`ℹ️ [ASSOCIATE IMAGES] No se encontraron archivos para asociar`)
      }

      // Para cada URL, buscar el attachment correspondiente y crear la relación
      let createdCount = 0
      let skippedCount = 0
      let notFoundCount = 0
      
      for (const attachmentUrl of uniqueUrls) {
        const attachment = await Attachment.query()
          .where('tenantId', tenantId)
          .where('path', attachmentUrl)
          .first()

        if (attachment) {
          // Verificar si la relación ya existe
          const existingRelation = await TemplateAttachment.query()
            .where('templateId', templateId)
            .where('attachmentId', attachment.id)
            .first()

          if (!existingRelation) {
            await TemplateAttachment.create({
              templateId: templateId,
              attachmentId: attachment.id
            })
            console.log(`✅ [ASSOCIATE IMAGES] Relación creada: Attachment ID ${attachment.id} -> Template ID ${templateId}`)
            createdCount++
          } else {
            console.log(`⏭️ [ASSOCIATE IMAGES] Relación ya existe: Attachment ID ${attachment.id}`)
            skippedCount++
          }
        } else {
          console.log(`⚠️ [ASSOCIATE IMAGES] Attachment no encontrado en BD: ${attachmentUrl}`)
          notFoundCount++
        }
      }
      
      console.log(`📊 [ASSOCIATE IMAGES] Resumen:`)
      console.log(`   - Relaciones creadas: ${createdCount}`)
      console.log(`   - Relaciones ya existentes: ${skippedCount}`)
      console.log(`   - Attachments no encontrados: ${notFoundCount}`)
      console.log(`🖼️ [ASSOCIATE IMAGES] ===============================\n`)
    } catch (error) {
      console.error('❌ [ASSOCIATE IMAGES] Error asociando imágenes:', error)
      // No fallar la creación de la plantilla si hay error asociando imágenes
    }
  }

  /**
   * Eliminar todas las asociaciones de archivos de una plantilla
   * y reemplazarlas con las nuevas
   */
  private async replaceTemplateAttachments(templateId: number, tenantId: number, htmlContent: string) {
    try {
      console.log(`\n🔄 [REPLACE ATTACHMENTS] ===============================`)
      console.log(`🔄 [REPLACE ATTACHMENTS] Iniciando reemplazo de attachments`)
      console.log(`🔄 [REPLACE ATTACHMENTS] Template ID: ${templateId}`)
      console.log(`🔄 [REPLACE ATTACHMENTS] Tenant ID: ${tenantId}`)
      console.log(`🔄 [REPLACE ATTACHMENTS] Tamaño del contenido: ${htmlContent.length} caracteres`)
      
      // Obtener las relaciones existentes antes de eliminar
      const existingRelations = await TemplateAttachment.query()
        .where('templateId', templateId)
        .preload('attachment')
      
      console.log(`📋 [REPLACE ATTACHMENTS] Relaciones existentes encontradas: ${existingRelations.length}`)
      
      // Guardar IDs de attachments que se van a desasociar
      const oldAttachmentIds: number[] = []
      
      if (existingRelations.length > 0) {
        console.log(`📋 [REPLACE ATTACHMENTS] Attachments que se van a desasociar:`)
        existingRelations.forEach((rel, index) => {
          oldAttachmentIds.push(rel.attachmentId)
          console.log(`   ${index + 1}. Attachment ID: ${rel.attachmentId}, Path: ${rel.attachment?.path || 'N/A'}`)
        })
      }
      
      // Eliminar todas las relaciones existentes para esta plantilla
      const deletedCount = await TemplateAttachment.query()
        .where('templateId', templateId)
        .delete()
      
      console.log(`🗑️ [REPLACE ATTACHMENTS] Eliminadas ${deletedCount} relaciones antiguas`)

      // Ahora crear las nuevas relaciones
      console.log(`🔄 [REPLACE ATTACHMENTS] Creando nuevas relaciones...`)
      await this.associateImagesWithTemplate(templateId, tenantId, htmlContent)
      
      // Extraer URLs de imágenes y adjuntos del nuevo contenido para obtener IDs de los nuevos attachments
      const attachmentUrlRegex = /(?:src|href|data-src)=["'](\/uploads\/attachments\/[^"']+)["']/g
      const matches = Array.from(htmlContent.matchAll(attachmentUrlRegex))
      const newAttachmentPaths: string[] = []
      
      for (const match of matches) {
        if (match[1]) {
          newAttachmentPaths.push(match[1])
        }
      }
      
      // Eliminar duplicados
      const uniqueNewPaths = [...new Set(newAttachmentPaths)]
      
      // Obtener IDs de los nuevos attachments
      const newAttachmentIds: number[] = []
      if (uniqueNewPaths.length > 0) {
        for (const attachmentPath of uniqueNewPaths) {
          const attachment = await Attachment.query()
            .where('tenantId', tenantId)
            .where('path', attachmentPath)
            .first()
          
          if (attachment) {
            newAttachmentIds.push(attachment.id)
          }
        }
      }
      
      console.log(`🔍 [REPLACE ATTACHMENTS] Verificando attachments huérfanos...`)
      console.log(`   - Attachments antiguos: ${oldAttachmentIds.length}`)
      console.log(`   - Attachments nuevos: ${newAttachmentIds.length}`)
      
      // Identificar attachments huérfanos (los que estaban antes pero no están en los nuevos)
      const orphanedAttachmentIds = oldAttachmentIds.filter(id => !newAttachmentIds.includes(id))
      
      console.log(`🗑️ [REPLACE ATTACHMENTS] Attachments huérfanos a eliminar: ${orphanedAttachmentIds.length}`)
      
      // Eliminar attachments huérfanos
      if (orphanedAttachmentIds.length > 0) {
        let deletedAttachments = 0
        for (const orphanId of orphanedAttachmentIds) {
          try {
            const orphanAttachment = await Attachment.query()
              .where('id', orphanId)
              .where('tenantId', tenantId)
              .first()
            
            if (orphanAttachment) {
              // Verificar si este attachment aún tiene relaciones con otras plantillas
              const otherRelations = await TemplateAttachment.query()
                .where('attachmentId', orphanId)
                .first()
              
              if (!otherRelations) {
                // No tiene relaciones con ninguna plantilla, eliminarlo
                await Attachment.query().where('id', orphanId).delete()
                console.log(`🗑️ [REPLACE ATTACHMENTS] Attachment huérfano eliminado: ID ${orphanId}`)
                deletedAttachments++
              } else {
                console.log(`⏭️ [REPLACE ATTACHMENTS] Attachment ID ${orphanId} aún tiene relaciones con otras plantillas, NO se elimina`)
              }
            }
          } catch (error) {
            console.error(`❌ [REPLACE ATTACHMENTS] Error al eliminar attachment ${orphanId}:`, error)
          }
        }
        console.log(`✅ [REPLACE ATTACHMENTS] Eliminados ${deletedAttachments} attachments huérfanos`)
      }
      
      console.log(`✅ [REPLACE ATTACHMENTS] Proceso completado exitosamente`)
      console.log(`🔄 [REPLACE ATTACHMENTS] ===============================\n`)
    } catch (error) {
      console.error(`❌ [REPLACE ATTACHMENTS] Error reemplazando attachments:`, error)
      // No fallar la actualización si hay error
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
      console.log('💾 [STORE] Intentando crear plantilla...')
      
      // Procesar archivos temporales y obtener contenido actualizado
      const processedContent = await this.processTempFiles(tenantUser.tenantId, data.bodyMarkdown)
      
      // Truncar bodyMarkdown si es muy largo (por seguridad)
      const bodyContent = processedContent.substring(0, 10000000) // Máximo ~10MB de texto
      
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
    console.log('\n🚀 [UPDATE TEMPLATE] ===============================')
    console.log('🚀 [UPDATE TEMPLATE] Iniciando actualización de plantilla')
    
    const user = auth.user!
    const { id } = params
    
    console.log(`👤 [UPDATE TEMPLATE] Usuario: ${user.email} (ID: ${user.id})`)
    console.log(`📋 [UPDATE TEMPLATE] Template ID a actualizar: ${id}`)
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      console.error('❌ [UPDATE TEMPLATE] Usuario sin tenant activo')
      return response.status(400).json({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    console.log(`🏢 [UPDATE TEMPLATE] Tenant ID: ${tenantUser.tenantId}`)

    // Verificar que la plantilla existe y pertenece al tenant
    const template = await Template.query()
      .where('id', id)
      .where('tenantId', tenantUser.tenantId)
      .first()

    if (!template) {
      console.error(`❌ [UPDATE TEMPLATE] Plantilla ${id} no encontrada`)
      return response.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      })
    }

    console.log(`✅ [UPDATE TEMPLATE] Plantilla encontrada: ${template.name}`)

    const data = request.only(['name', 'subject', 'bodyMarkdown', 'availableVariables', 'active'])
    
    console.log(`📝 [UPDATE TEMPLATE] Datos recibidos:`, {
      name: data.name,
      subject: data.subject,
      hasBody: !!data.bodyMarkdown,
      bodyLength: data.bodyMarkdown?.length || 0,
      active: data.active
    })
    
    // Procesar archivos temporales si hay contenido
    if (data.bodyMarkdown) {
      console.log(`📁 [UPDATE TEMPLATE] Procesando archivos temporales...`)
      const processedContent = await this.processTempFiles(tenantUser.tenantId, data.bodyMarkdown)
      data.bodyMarkdown = processedContent
      console.log(`✅ [UPDATE TEMPLATE] Archivos temporales procesados`)
    }
    
    template.merge(data)
    await template.save()
    
    console.log(`💾 [UPDATE TEMPLATE] Plantilla actualizada en BD`)

    // Reemplazar attachments si el contenido cambió
    if (data.bodyMarkdown) {
      console.log(`🔄 [UPDATE TEMPLATE] Reemplazando attachments...`)
      await this.replaceTemplateAttachments(template.id, tenantUser.tenantId, data.bodyMarkdown)
    } else {
      console.log(`ℹ️ [UPDATE TEMPLATE] No hay contenido nuevo, no se reemplazan attachments`)
    }

    console.log(`✅ [UPDATE TEMPLATE] Plantilla actualizada exitosamente`)
    console.log('🚀 [UPDATE TEMPLATE] ===============================\n')

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

    // Paso 1: Eliminar las relaciones en templates_attachments
    const deletedRelations = await TemplateAttachment.query()
      .where('templateId', id)
      .where('tenantId', tenantUser.tenantId)
      .delete()
    
    console.log(`🗑️ [DESTROY] Eliminadas ${deletedRelations} relaciones en templates_attachments`)

    // Paso 2: Obtener IDs únicos de attachments para eliminar
    const attachmentIds = templateAttachments
      .map(ta => ta.attachment?.id)
      .filter((id): id is number => id !== undefined)
    
    console.log(`📎 [DESTROY] IDs de attachments a eliminar:`, attachmentIds)

    // Paso 3: Eliminar registros de attachments de la BD
    for (const templateAttachment of templateAttachments) {
      if (templateAttachment.attachment) {
        const attachment = templateAttachment.attachment
        
        try {
          // Eliminar el registro de attachment de la BD
          await Attachment.query()
            .where('id', attachment.id)
            .delete()
          
          console.log(`✅ [DESTROY] Attachment eliminado de BD: ${attachment.id}`)
          
        } catch (error) {
          console.error(`❌ [DESTROY] Error al eliminar attachment ${attachment.id} de BD:`, error)
        }
      }
    }

    // Paso 4: Eliminar la plantilla
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
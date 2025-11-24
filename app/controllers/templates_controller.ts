import type { HttpContext } from '@adonisjs/core/http'
import Template from '#models/template'
import TenantUser from '#models/tenant_user'
import Attachment from '#models/attachment'
import TemplateAttachment from '#models/templates_attachment'
import { inject } from '@adonisjs/core'
import fs from 'fs/promises'
import path from 'path'
import CampaignStageTemplate from '#models/campaign_stage_template'
import CampaignCustomVariable from '#models/campaign_custom_variable'

@inject()
export default class TemplatesController {

  /**
   * Procesar archivos temporales y moverlos a attachments
   * Retorna el HTML actualizado con las nuevas URLs
   */
  private async processTempFiles(tenantId: number, htmlContent: string): Promise<string> {
    try {
      // Extraer URLs temporales del HTML (soporta URLs absolutas y relativas)
      // Regex que detecta tanto URLs absolutas (http://...) como relativas (/uploads/temp/...)
      // Busca tanto en src (imágenes) como en href (adjuntos) y data-src (adjuntos)
      const tempImageRegex = /(?:src|href|data-src)=["'](https?:\/\/[^"']*\/uploads\/temp\/[^"']+|\.\.\/[^"']*uploads\/temp\/[^"']+|\/uploads\/temp\/[^"']+)["']/gi
      const matches = Array.from(htmlContent.matchAll(tempImageRegex))
      
      if (matches.length === 0) {
        return htmlContent
      }

      let updatedContent = htmlContent

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const tempUrl = match[1] // URL completa (absoluta o relativa)
        const attribute = match[0].split('=')[0] // 'src', 'href', o 'data-src'
        
        // Extraer la ruta relativa desde la URL (eliminar dominio si es absoluta)
        let relativePath = tempUrl
        if (tempUrl.startsWith('http://') || tempUrl.startsWith('https://')) {
          // Es una URL absoluta, extraer solo la ruta
          const urlObj = new URL(tempUrl)
          relativePath = urlObj.pathname
          
          // Verificar que es un archivo temporal antes de procesar
          if (!relativePath.includes('/uploads/temp/')) {
            continue
          }
        }
        
        // Construir la ruta física del archivo temporal
        let tempFilePath = path.join(process.cwd(), 'public', relativePath)
        
        // Verificar que el path existe
        let tempStats
        try {
          tempStats = await fs.stat(tempFilePath)
        } catch {
          continue
        }

        // Si es un directorio (problema conocido en Windows), buscar el archivo dentro
        if (tempStats.isDirectory()) {
          try {
            const dirFiles = await fs.readdir(tempFilePath)
            if (dirFiles.length > 0) {
              // Tomar el primer archivo dentro del directorio
              tempFilePath = path.join(tempFilePath, dirFiles[0])
              tempStats = await fs.stat(tempFilePath)
            } else {
              continue
            }
          } catch (dirError) {
            continue
          }
        }

        // Verificar que ahora es un archivo
        if (!tempStats.isFile()) {
          continue
        }

        // Leer el archivo
        const fileStats = tempStats

        // Generar nombre único para el archivo final (usar el nombre del archivo temporal real)
        const fileName = path.basename(tempFilePath)
        const attachmentDir = path.join(process.cwd(), 'public', 'uploads', 'attachments', tenantId.toString())
        await fs.mkdir(attachmentDir, { recursive: true })

        // Mover el archivo a attachments usando rename (más seguro en Windows)
        const finalPath = path.join(attachmentDir, fileName)
        
        try {
          // Intentar mover (rename) el archivo
          await fs.rename(tempFilePath, finalPath)
        } catch (error: any) {
          // Si rename falla por permisos, intentar copiar y eliminar
          if (error.code === 'EPERM' || error.code === 'EXDEV') {
            await fs.copyFile(tempFilePath, finalPath)
            await fs.unlink(tempFilePath)
          } else {
            throw error
          }
        }

        // Verificar si el archivo ya existe en attachments antes de crear
        const attachmentPath = `/uploads/attachments/${tenantId}/${fileName}`
        
        // Buscar si ya existe un attachment con este path
        const existingAttachment = await Attachment.query()
          .where('tenantId', tenantId)
          .where('path', attachmentPath)
          .first()
        
        if (existingAttachment) {
          // Actualizar TODOS los campos importantes del attachment existente
          existingAttachment.name = fileName
          existingAttachment.fileName = fileName
          existingAttachment.size = fileStats.size
          
          await existingAttachment.save()
        } else {
          // Crear nuevo registro en attachments
          await Attachment.create({
            tenantId: tenantId,
            path: attachmentPath,
            name: fileName,
            fileName: fileName,
            size: fileStats.size
          })
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
        } else {
          // Fallback: reemplazo simple
          updatedContent = updatedContent.replace(tempUrl, attachmentPath)
        }
      }

      return updatedContent
    } catch (error) {
      return htmlContent // Retornar contenido original si hay error
    }
  }

  /**
   * Extraer URLs de imágenes y adjuntos del HTML y asociarlas con la plantilla
   */
  private async associateImagesWithTemplate(templateId: number, tenantId: number, htmlContent: string) {
    try {
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
          // Verificar que el attachment pertenece al mismo tenant
          if (attachment.tenantId !== tenantId) {
            notFoundCount++
            continue
          }

          // Verificar si la relación ya existe (incluyendo tenantId para mayor seguridad)
          const existingRelation = await TemplateAttachment.query()
            .where('tenantId', tenantId)
            .where('templateId', templateId)
            .where('attachmentId', attachment.id)
            .first()

          if (!existingRelation) {
            try {
              await TemplateAttachment.create({
                tenantId: tenantId,
                templateId: templateId,
                attachmentId: attachment.id
              })
              console.log(`✅ [ASSOCIATE IMAGES] Relación creada: Template ID: ${templateId}, Attachment ID: ${attachment.id}`)
              createdCount++
            } catch (error: any) {
              // Continuar con el siguiente attachment
            }
          } else {
            skippedCount++
          }
        } else {
          notFoundCount++
        }
      }
    } catch (error) {
      // No fallar la creación de la plantilla si hay error asociando imágenes
    }
  }

  /**
   * Eliminar todas las asociaciones de archivos de una plantilla
   * y reemplazarlas con las nuevas
   */
  private async replaceTemplateAttachments(templateId: number, tenantId: number, htmlContent: string) {
    try {
      // Obtener las relaciones existentes antes de eliminar (filtrando por tenantId)
      const existingRelations = await TemplateAttachment.query()
        .where('tenantId', tenantId)
        .where('templateId', templateId)
        .preload('attachment')
      
      // Guardar IDs de attachments que se van a desasociar
      const oldAttachmentIds: number[] = []
      
      if (existingRelations.length > 0) {
        existingRelations.forEach((rel) => {
          oldAttachmentIds.push(rel.attachmentId)
        })
      }
      
      // Eliminar todas las relaciones existentes para esta plantilla (filtrando por tenantId)
      await TemplateAttachment.query()
        .where('tenantId', tenantId)
        .where('templateId', templateId)
        .delete()

      // Ahora crear las nuevas relaciones
      try {
        await this.associateImagesWithTemplate(templateId, tenantId, htmlContent)
      } catch (error) {
        // No lanzar el error, pero registrar el problema
      }
      
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
      
      // Identificar attachments huérfanos (los que estaban antes pero no están en los nuevos)
      const orphanedAttachmentIds = oldAttachmentIds.filter(id => !newAttachmentIds.includes(id))
      
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
              // Verificar si este attachment aún tiene relaciones con otras plantillas (del mismo tenant)
              const otherRelations = await TemplateAttachment.query()
                .where('tenantId', tenantId)
                .where('attachmentId', orphanId)
                .first()
              
              if (!otherRelations) {
                // No tiene relaciones con ninguna plantilla del mismo tenant, eliminarlo
                await Attachment.query()
                  .where('id', orphanId)
                  .where('tenantId', tenantId)
                  .delete()
                deletedAttachments++
              }
            }
          } catch (error) {
            // Continuar con el siguiente
          }
        }
      }
    } catch (error) {
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

    const data = request.only(['name', 'subject', 'bodyMarkdown', 'active'])
    
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
      // Procesar archivos temporales y obtener contenido actualizado
      const processedContent = await this.processTempFiles(tenantUser.tenantId, data.bodyMarkdown)
      
      // Truncar bodyMarkdown si es muy largo (por seguridad)
      const bodyContent = processedContent.substring(0, 10000000) // Máximo ~10MB de texto
      
      const templateData: any = {
        tenantId: tenantUser.tenantId,
        name: data.name,
        subject: data.subject,
        bodyMarkdown: bodyContent,
        active: data.active !== undefined ? data.active : true,
      }
      
      const template = await Template.create(templateData)

      // Extraer URLs de imágenes del HTML y crear relaciones en templates_attachments
      await this.associateImagesWithTemplate(template.id, tenantUser.tenantId, bodyContent)

      return response.json({
        success: true,
        message: 'Plantilla creada exitosamente',
        data: template
      })
    } catch (error) {
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

    const data = request.only(['name', 'subject', 'bodyMarkdown', 'active'])
    
    // Procesar archivos temporales si hay contenido
    if (data.bodyMarkdown) {
      const processedContent = await this.processTempFiles(tenantUser.tenantId, data.bodyMarkdown)
      data.bodyMarkdown = processedContent
    }
    
    template.merge(data)
    await template.save()

    // Reemplazar attachments si el contenido cambió
    if (data.bodyMarkdown) {
      await this.replaceTemplateAttachments(template.id, tenantUser.tenantId, data.bodyMarkdown)
    }

    // Verificar si la plantilla está asociada a una etapa y asegurar registros en campaign_custom_variables
    // Buscar si la plantilla está asociada a alguna etapa
    const stageTemplate = await CampaignStageTemplate.query()
      .where('templatesId', template.id)
      .preload('campaignStage')
      .first()

    if (stageTemplate && stageTemplate.campaignStage) {
      const stage = stageTemplate.campaignStage

      // Actualizar registros de variables de nivel campaña (campaign_stage_id IS NULL) asignándoles el campaign_stage_id de la etapa
      // Si no hay registros con campaign_stage_id IS NULL, crear nuevos registros para esta etapa

      // Primero, buscar registros con campaign_stage_id IS NULL para actualizarlos
      const campaignVarsNull = await CampaignCustomVariable.query()
        .where('campaignId', stage.campaignId)
        .whereNull('campaignStageId')
        .preload('customVariable')

      // Si hay registros con campaign_stage_id IS NULL, actualizarlos
      if (campaignVarsNull.length > 0) {
        for (const campaignVar of campaignVarsNull) {
          if (campaignVar.campaignStageId === null) {
            campaignVar.campaignStageId = stage.id
            await campaignVar.save()
          }
        }
      } else {
        // Si no hay registros con campaign_stage_id IS NULL, obtener todas las variables únicas de la campaña
        // y crear nuevos registros para esta etapa SOLO si no existe ya un registro de nivel etapa
        const allCampaignVars = await CampaignCustomVariable.query()
          .where('campaignId', stage.campaignId)
          .preload('customVariable')

        // Obtener customVarIds únicos
        const uniqueCustomVarIds = new Set<number>()
        for (const cv of allCampaignVars) {
          uniqueCustomVarIds.add(cv.customVarId)
        }

        // Para cada variable única, verificar si ya existe un registro para esta etapa
        for (const customVarId of uniqueCustomVarIds) {
          const existingStageVar = await CampaignCustomVariable.query()
            .where('customVarId', customVarId)
            .where('campaignId', stage.campaignId)
            .where('campaignStageId', stage.id)
            .first()

          // Si no existe un registro para esta etapa, crear uno nuevo
          // Pero solo si hay al menos un registro de esta variable (puede ser de nivel etapa o campaña)
          if (!existingStageVar) {
            // Obtener el primer registro de esta variable para copiar sus valores
            const sourceVar = allCampaignVars.find(cv => cv.customVarId === customVarId)
            if (sourceVar) {
              // Verificar nuevamente antes de crear para evitar condiciones de carrera
              const doubleCheck = await CampaignCustomVariable.query()
                .where('customVarId', customVarId)
                .where('campaignId', stage.campaignId)
                .where('campaignStageId', stage.id)
                .first()
              
              if (!doubleCheck) {
                await CampaignCustomVariable.create({
                  customVarId: customVarId,
                  campaignId: stage.campaignId,
                  campaignStageId: stage.id,
                  valorStage: sourceVar.valorStage
                })
              }
            }
          }
        }
      }
    }

    return response.json({
      success: true,
      message: 'Plantilla actualizada exitosamente',
      data: template
    })
  }

  /**
   * Eliminar una plantilla
   * Usa la tabla pivote templates_attachments para determinar qué attachments eliminar
   * Solo elimina attachments que no estén relacionados con otros templates
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

    // Paso 1: Obtener todas las relaciones desde la tabla pivote templates_attachments
    const templateAttachments = await TemplateAttachment.query()
      .where('tenantId', tenantUser.tenantId)
      .where('templateId', id)
      .preload('attachment')

    // Paso 2: Identificar attachments que solo pertenecen a este template
    const attachmentsToDelete: number[] = []
    const attachmentsToKeep: number[] = []

    for (const templateAttachment of templateAttachments) {
      if (!templateAttachment.attachment) {
        continue
      }

      const attachmentId = templateAttachment.attachment.id

      // Verificar si este attachment tiene otras relaciones con otros templates
      const otherRelations = await TemplateAttachment.query()
        .where('tenantId', tenantUser.tenantId)
        .where('attachmentId', attachmentId)
        .where('templateId', '!=', id)
        .first()

      if (!otherRelations) {
        // Este attachment solo está relacionado con este template, se puede eliminar
        attachmentsToDelete.push(attachmentId)
      } else {
        // Este attachment está relacionado con otros templates, NO se elimina
        attachmentsToKeep.push(attachmentId)
      }
    }

    // Paso 3: Eliminar los archivos físicos de los attachments que se van a eliminar
    let deletedFiles = 0
    for (const attachmentId of attachmentsToDelete) {
      try {
        const attachment = await Attachment.query()
          .where('id', attachmentId)
          .where('tenantId', tenantUser.tenantId)
          .first()

        if (attachment && attachment.path) {
          const filePath = path.join(process.cwd(), 'public', attachment.path)
          
          try {
            await fs.unlink(filePath)
            deletedFiles++
          } catch (fileError: any) {
            // Si el archivo no existe, no es un error crítico
          }
        }
      } catch (error) {
        // Continuar con el siguiente
      }
    }

    // Paso 4: Eliminar los registros de attachments de la BD (solo los que no tienen otras relaciones)
    let deletedAttachments = 0
    for (const attachmentId of attachmentsToDelete) {
      try {
        await Attachment.query()
          .where('id', attachmentId)
          .where('tenantId', tenantUser.tenantId)
          .delete()
        
        deletedAttachments++
      } catch (error) {
        // Continuar con el siguiente
      }
    }

    // Paso 5: Eliminar todas las relaciones en templates_attachments para este template
    const deletedRelations = await TemplateAttachment.query()
      .where('tenantId', tenantUser.tenantId)
      .where('templateId', id)
      .delete()

    // Paso 6: Eliminar la plantilla
    await template.delete()

    return response.json({
      success: true,
      message: 'Plantilla eliminada exitosamente',
      data: {
        deletedAttachments: deletedAttachments,
        keptAttachments: attachmentsToKeep.length,
        deletedRelations: deletedRelations
      }
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
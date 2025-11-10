import env from '#start/env'
import CloudinaryService from './cloudinaryService.js'
import fs from 'fs/promises'
import path from 'path'

/**
 * Resultado del procesamiento del HTML
 */
export interface ProcessHtmlResult {
  html: string
  attachments: Array<{
    filename: string
    path: string
  }>
}

/**
 * Procesa el HTML antes de enviarlo por correo, convirtiendo rutas relativas
 * de imágenes a URLs absolutas. Si Cloudinary está configurado, sube las imágenes
 * a Cloudinary y usa sus URLs CDN para mejor rendimiento y confiabilidad.
 */
export default class HtmlEmailProcessor {
  /**
   * Obtiene la URL base del servidor desde las variables de entorno
   * @returns La URL base del servidor (ej: https://tudominio.com)
   */
  private static getBaseUrl(): string {
    // Prioridad 1: APP_URL desde variables de entorno (más confiable)
    const appUrl = env.get('APP_URL')
    if (appUrl) {
      // Asegurar que termine sin barra final y sin espacios
      return appUrl.trim().replace(/\/$/, '')
    }

    // Prioridad 2: Construir desde HOST y PORT
    const host = env.get('HOST')
    const port = env.get('PORT')
    
    // Determinar protocolo: en producción usar https, en desarrollo http
    // PERO también verificar si hay una variable que lo indique explícitamente
    const isProduction = process.env.NODE_ENV === 'production'
    const forceHttps = process.env.FORCE_HTTPS === 'true'
    const protocol = (isProduction || forceHttps) ? 'https' : 'http'
    
    // Si el puerto es 80 (http) o 443 (https), no incluirlo en la URL
    // También verificar si el host ya incluye el puerto
    if (host.includes(':')) {
      // El host ya incluye el puerto (ej: localhost:3000)
      return `${protocol}://${host}`
    }
    
    if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
      return `${protocol}://${host}`
    }
    
    return `${protocol}://${host}:${port}`
  }

  /**
   * Extrae el tenantId de una ruta de attachment
   * @param imagePath - Ruta de la imagen (ej: /uploads/attachments/1/image.jpg)
   * @returns ID del tenant o undefined
   */
  private static extractTenantId(imagePath: string): number | undefined {
    const match = imagePath.match(/\/uploads\/attachments\/(\d+)\//)
    if (match && match[1]) {
      return parseInt(match[1], 10)
    }
    return undefined
  }

  /**
   * Normaliza una ruta relativa a una ruta absoluta
   * @param filePath - Ruta a normalizar
   * @returns Ruta normalizada que empieza con /
   */
  private static normalizePath(filePath: string): string {
    let normalizedPath = filePath
    
    if (filePath.startsWith('./') || filePath.startsWith('../')) {
      // Ruta relativa con ./ o ../, normalizar
      normalizedPath = filePath
        .replace(/^\.\//, '')
        .replace(/^\.\.\//, '')
        .replace(/\/+/g, '/') // Eliminar barras duplicadas
      
      // Asegurar que empiece con /
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
    } else if (!filePath.startsWith('/')) {
      normalizedPath = '/' + filePath
    }
    
    return normalizedPath
  }

  /**
   * Convierte una ruta relativa a una ruta absoluta del sistema de archivos
   * @param relativePath - Ruta relativa (ej: /uploads/attachments/1/file.pdf)
   * @returns Ruta absoluta del sistema de archivos
   */
  private static getAbsoluteFilePath(relativePath: string): string {
    // Eliminar la barra inicial si existe
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath
    return path.join(process.cwd(), 'public', cleanPath)
  }

  /**
   * Extrae el nombre del archivo de una ruta
   * @param filePath - Ruta del archivo
   * @returns Nombre del archivo
   */
  private static getFileName(filePath: string): string {
    return path.basename(filePath)
  }

  /**
   * Procesa el HTML y convierte las rutas relativas de imágenes a URLs absolutas.
   * Extrae los archivos adjuntos para que puedan ser adjuntados al correo.
   * Si Cloudinary está habilitado, sube las imágenes a Cloudinary y usa sus URLs.
   * @param html - El HTML a procesar
   * @returns Objeto con el HTML procesado y la información de los adjuntos
   */
  static async processHtmlForEmail(html: string): Promise<ProcessHtmlResult> {
    if (!html) return { html: '', attachments: [] }

    const baseUrl = this.getBaseUrl()
    const useCloudinary = CloudinaryService.isEnabled()
    
    // Validar que baseUrl sea válida (solo si no usamos Cloudinary)
    if (!useCloudinary && (!baseUrl || !baseUrl.startsWith('http'))) {
      console.error(`❌ [HtmlEmailProcessor] URL base inválida: ${baseUrl}`)
      return { html, attachments: [] } // Retornar HTML original si la URL base es inválida
    }
    
    let processedHtml = html

    // ========== PROCESAR IMÁGENES ==========
    const imgRegex = /<img[^>]+src\s*=\s*["']?([^"'\s>]+)["']?[^>]*>/gi
    const imgMatches = Array.from(html.matchAll(imgRegex))

    if (imgMatches.length > 0) {
      console.log(`🖼️ [HtmlEmailProcessor] Procesando ${imgMatches.length} imagen(es)`)

      let cloudinaryCount = 0
      let localUrlCount = 0
      let skippedCount = 0

      for (const match of imgMatches) {
        const fullTag = match[0]
        const imgSrc = match[1]

        // Si la imagen ya es URL absoluta (http/https) o base64, no hacer nada
        if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://') || imgSrc.startsWith('data:')) {
          skippedCount++
          continue
        }

        try {
          const normalizedPath = this.normalizePath(imgSrc)
          let finalUrl: string | null = null

          // Si Cloudinary está habilitado y es una ruta de attachments, subir a Cloudinary
          if (useCloudinary && normalizedPath.includes('/uploads/attachments/')) {
            const tenantId = this.extractTenantId(normalizedPath)
            finalUrl = await CloudinaryService.uploadImageFromRelativePath(normalizedPath, tenantId)
            
            if (finalUrl) {
              cloudinaryCount++
            } else {
              console.warn(`⚠️ [HtmlEmailProcessor] Fallo al subir a Cloudinary, usando URL local: ${normalizedPath}`)
              // Fallback a URL local si Cloudinary falla
              finalUrl = `${baseUrl}${normalizedPath}`
              localUrlCount++
            }
          } else {
            // Usar URL local (servidor propio)
            finalUrl = `${baseUrl}${normalizedPath}`
            localUrlCount++
          }
          
          // Validar que la URL final sea válida
          try {
            new URL(finalUrl) // Validar formato de URL
          } catch (urlError) {
            console.error(`❌ [HtmlEmailProcessor] URL generada inválida: ${finalUrl}`)
            continue
          }
          
          // Reemplazar el src en la etiqueta img
          const newTag = fullTag.replace(
            /src\s*=\s*["']?[^"'\s>]+["']?/i,
            `src="${finalUrl}"`
          )
          processedHtml = processedHtml.replace(fullTag, newTag)
        } catch (error: any) {
          console.error(`❌ [HtmlEmailProcessor] Error al procesar imagen ${imgSrc}:`, error.message)
          // Si falla, dejar la imagen original
        }
      }

      // Resumen del procesamiento de imágenes
      if (useCloudinary) {
        console.log(`📊 [HtmlEmailProcessor] Imágenes: ${cloudinaryCount} en Cloudinary, ${localUrlCount} locales, ${skippedCount} omitidas`)
      } else {
        console.log(`📊 [HtmlEmailProcessor] Imágenes: ${localUrlCount} convertidas a URLs locales, ${skippedCount} omitidas`)
      }
    }

    // ========== PROCESAR ADJUNTOS ==========
    // Buscar divs con data-type="attachment" que contienen enlaces a archivos
    // El formato es: <div data-type="attachment">...<a href="/uploads/...">...</a></div>
    const attachmentRegex = /<div[^>]*data-type\s*=\s*["']attachment["'][^>]*>[\s\S]*?<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<\/a>[\s\S]*?<\/div>/gi
    const attachmentMatches = Array.from(processedHtml.matchAll(attachmentRegex))

    const attachments: Array<{ filename: string; path: string }> = []

    if (attachmentMatches.length > 0) {
      console.log(`📎 [HtmlEmailProcessor] Procesando ${attachmentMatches.length} archivo(s) adjunto(s)`)

      let attachmentProcessedCount = 0
      let attachmentSkippedCount = 0

      for (const match of attachmentMatches) {
        const fullTag = match[0]
        const attachmentHref = match[1]

        // Si el adjunto ya es URL absoluta, no hacer nada
        if (attachmentHref.startsWith('http://') || attachmentHref.startsWith('https://')) {
          attachmentSkippedCount++
          continue
        }

        try {
          const normalizedPath = this.normalizePath(attachmentHref)
          
          // Solo procesar si es una ruta local (no URL externa)
          if (normalizedPath.startsWith('/uploads/')) {
            let absoluteFilePath = this.getAbsoluteFilePath(normalizedPath)
            let fileFound = false
            
            // Intentar encontrar el archivo
            try {
              const stats = await fs.stat(absoluteFilePath)
              if (stats.isFile()) {
                fileFound = true
              }
            } catch (fileError: any) {
              // Si el archivo no se encuentra y está en /uploads/temp/, intentar buscarlo en /uploads/attachments/
              if (normalizedPath.includes('/uploads/temp/')) {
                const fileName = this.getFileName(normalizedPath)
                // Extraer el tenantId de la ruta temp
                const tempMatch = normalizedPath.match(/\/uploads\/temp\/(\d+)\//)
                if (tempMatch && tempMatch[1]) {
                  const tenantId = tempMatch[1]
                  const attachmentPath = `/uploads/attachments/${tenantId}/${fileName}`
                  const attachmentFilePath = this.getAbsoluteFilePath(attachmentPath)
                  
                  try {
                    const attachmentStats = await fs.stat(attachmentFilePath)
                    if (attachmentStats.isFile()) {
                      absoluteFilePath = attachmentFilePath
                      fileFound = true
                      console.log(`✅ [HtmlEmailProcessor] Archivo encontrado en attachments: ${attachmentPath}`)
                    }
                  } catch (attachmentError) {
                    // Archivo no encontrado en attachments tampoco
                    console.warn(`⚠️ [HtmlEmailProcessor] Archivo no encontrado ni en temp ni en attachments: ${fileName}`)
                  }
                }
              }
            }
            
            if (fileFound) {
              const filename = this.getFileName(normalizedPath)
              
              // Verificar una vez más que el archivo existe antes de agregarlo
              try {
                const finalStats = await fs.stat(absoluteFilePath)
                if (finalStats.isFile()) {
                  // Agregar a la lista de adjuntos
                  attachments.push({
                    filename,
                    path: absoluteFilePath
                  })
                  
                  console.log(`✅ [HtmlEmailProcessor] Adjunto agregado: ${filename} (${(finalStats.size / 1024).toFixed(2)} KB)`)
                  
                  // Remover el div de adjunto del HTML (ya no será un enlace)
                  processedHtml = processedHtml.replace(fullTag, '')
                  attachmentProcessedCount++
                } else {
                  console.warn(`⚠️ [HtmlEmailProcessor] La ruta no es un archivo: ${absoluteFilePath}`)
                  attachmentSkippedCount++
                }
              } catch (finalCheckError: any) {
                console.error(`❌ [HtmlEmailProcessor] Error al verificar archivo final: ${absoluteFilePath}`, finalCheckError.message)
                attachmentSkippedCount++
              }
            } else {
              attachmentSkippedCount++
            }
          } else {
            attachmentSkippedCount++
          }
        } catch (error: any) {
          console.error(`❌ [HtmlEmailProcessor] Error al procesar adjunto ${attachmentHref}:`, error.message)
          attachmentSkippedCount++
        }
      }

      console.log(`📊 [HtmlEmailProcessor] Adjuntos: ${attachmentProcessedCount} extraídos para adjuntar, ${attachmentSkippedCount} omitidos`)
    }

    return {
      html: processedHtml,
      attachments
    }
  }
}

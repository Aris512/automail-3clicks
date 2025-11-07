import env from '#start/env'
import CloudinaryService from './cloudinaryService.js'

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
   * Procesa el HTML y convierte las rutas relativas de imágenes a URLs absolutas.
   * Si Cloudinary está habilitado, sube las imágenes a Cloudinary y usa sus URLs.
   * @param html - El HTML a procesar
   * @returns El HTML procesado con las imágenes convertidas a URLs absolutas o Cloudinary
   */
  static async processHtmlForEmail(html: string): Promise<string> {
    if (!html) return html

    const baseUrl = this.getBaseUrl()
    const useCloudinary = CloudinaryService.isEnabled()
    
    // Validar que baseUrl sea válida (solo si no usamos Cloudinary)
    if (!useCloudinary && (!baseUrl || !baseUrl.startsWith('http'))) {
      console.error(`❌ [HtmlEmailProcessor] URL base inválida: ${baseUrl}`)
      return html // Retornar HTML original si la URL base es inválida
    }
    
    if (useCloudinary) {
      console.log(`☁️ [HtmlEmailProcessor] Usando Cloudinary para imágenes`)
    } else {
      console.log(`🔗 [HtmlEmailProcessor] URL base configurada: ${baseUrl}`)
    }
    
    // Regex mejorada para encontrar todas las etiquetas img con diferentes formatos
    // Soporta: src="...", src='...', src=... (sin comillas)
    const imgRegex = /<img[^>]+src\s*=\s*["']?([^"'\s>]+)["']?[^>]*>/gi
    const matches = Array.from(html.matchAll(imgRegex))

    if (matches.length === 0) {
      console.log(`ℹ️ [HtmlEmailProcessor] No se encontraron imágenes en el HTML`)
      return html
    }

    console.log(`🖼️ [HtmlEmailProcessor] Procesando ${matches.length} imagen(es)`)

    let processedHtml = html
    let cloudinaryCount = 0
    let localUrlCount = 0
    let skippedCount = 0

    for (const match of matches) {
      const fullTag = match[0]
      const imgSrc = match[1]

      // Si la imagen ya es URL absoluta (http/https) o base64, no hacer nada
      if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://') || imgSrc.startsWith('data:')) {
        console.log(`⏭️ [HtmlEmailProcessor] Imagen ya es absoluta o base64, omitiendo: ${imgSrc.substring(0, 50)}...`)
        skippedCount++
        continue
      }

      try {
        // Normalizar la ruta
        let normalizedPath = imgSrc
        
        if (imgSrc.startsWith('./') || imgSrc.startsWith('../')) {
          // Ruta relativa con ./ o ../, normalizar
          normalizedPath = imgSrc
            .replace(/^\.\//, '')
            .replace(/^\.\.\//, '')
            .replace(/\/+/g, '/') // Eliminar barras duplicadas
          
          // Asegurar que empiece con /
          if (!normalizedPath.startsWith('/')) {
            normalizedPath = '/' + normalizedPath
          }
        } else if (!imgSrc.startsWith('/')) {
          normalizedPath = '/' + imgSrc
        }

        let finalUrl: string | null = null

        // Si Cloudinary está habilitado y es una ruta de attachments, subir a Cloudinary
        if (useCloudinary && normalizedPath.includes('/uploads/attachments/')) {
          const tenantId = this.extractTenantId(normalizedPath)
          
          console.log(`☁️ [HtmlEmailProcessor] Subiendo imagen a Cloudinary: ${normalizedPath}`)
          finalUrl = await CloudinaryService.uploadImageFromRelativePath(normalizedPath, tenantId)
          
          if (finalUrl) {
            cloudinaryCount++
            console.log(`✅ [HtmlEmailProcessor] Imagen subida a Cloudinary: ${normalizedPath} -> ${finalUrl}`)
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
        // Manejar diferentes formatos: src="...", src='...', src=...
        const newTag = fullTag.replace(
          /src\s*=\s*["']?[^"'\s>]+["']?/i,
          `src="${finalUrl}"`
        )
        processedHtml = processedHtml.replace(fullTag, newTag)
        
        if (useCloudinary && finalUrl.includes('cloudinary.com')) {
          console.log(`✅ [HtmlEmailProcessor] Imagen convertida (Cloudinary): ${imgSrc} -> ${finalUrl.substring(0, 60)}...`)
        } else {
          console.log(`✅ [HtmlEmailProcessor] Imagen convertida (Local): ${imgSrc} -> ${finalUrl}`)
        }
      } catch (error: any) {
        console.error(`❌ [HtmlEmailProcessor] Error al procesar imagen ${imgSrc}:`, error.message)
        // Si falla, dejar la imagen original
      }
    }

    // Resumen del procesamiento
    if (useCloudinary) {
      console.log(`📊 [HtmlEmailProcessor] Resumen: ${cloudinaryCount} en Cloudinary, ${localUrlCount} locales, ${skippedCount} omitidas`)
    } else {
      console.log(`📊 [HtmlEmailProcessor] Resumen: ${localUrlCount} convertidas a URLs locales, ${skippedCount} omitidas`)
    }

    return processedHtml
  }
}

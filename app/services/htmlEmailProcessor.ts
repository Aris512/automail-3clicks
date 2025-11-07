import env from '#start/env'

/**
 * Procesa el HTML antes de enviarlo por correo, convirtiendo rutas relativas
 * de imágenes a URLs absolutas usando el dominio del servidor para asegurar
 * que se muestren correctamente en los clientes de correo.
 */
export default class HtmlEmailProcessor {
  /**
   * Obtiene la URL base del servidor desde las variables de entorno
   * @returns La URL base del servidor (ej: https://tudominio.com)
   */
  private static getBaseUrl(): string {
    // Intentar obtener APP_URL de las variables de entorno
    const appUrl = env.get('APP_URL')
    if (appUrl) {
      // Asegurar que termine sin barra final
      return appUrl.replace(/\/$/, '')
    }

    // Fallback: construir desde HOST y PORT
    const host = env.get('HOST')
    const port = env.get('PORT')
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    
    // Si el puerto es 80 o 443, no incluirlo en la URL
    if (port === 80 || port === 443) {
      return `${protocol}://${host}`
    }
    
    return `${protocol}://${host}:${port}`
  }

  /**
   * Procesa el HTML y convierte las rutas relativas de imágenes a URLs absolutas
   * @param html - El HTML a procesar
   * @returns El HTML procesado con las imágenes convertidas a URLs absolutas
   */
  static async processHtmlForEmail(html: string): Promise<string> {
    if (!html) return html

    const baseUrl = this.getBaseUrl()
    
    // Regex para encontrar todas las etiquetas img
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    const matches = Array.from(html.matchAll(imgRegex))

    let processedHtml = html

    for (const match of matches) {
      const fullTag = match[0]
      const imgSrc = match[1]

      // Si la imagen ya es URL absoluta (http/https) o base64, no hacer nada
      if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://') || imgSrc.startsWith('data:')) {
        continue
      }

      try {
        // Convertir la ruta relativa a URL absoluta
        let absoluteUrl: string
        
        if (imgSrc.startsWith('/')) {
          // Ruta relativa que empieza con / (ej: /uploads/attachments/1/image.jpg)
          absoluteUrl = `${baseUrl}${imgSrc}`
        } else if (imgSrc.startsWith('./') || imgSrc.startsWith('../')) {
          // Ruta relativa con ./ o ../, convertir a absoluta
          // Normalizar la ruta y agregar el baseUrl
          const normalizedPath = imgSrc.replace(/^\.\//, '').replace(/^\.\.\//, '')
          absoluteUrl = `${baseUrl}/${normalizedPath}`
        } else {
          // Ruta sin / inicial, agregar /
          absoluteUrl = `${baseUrl}/${imgSrc}`
        }
        
        // Reemplazar el src en la etiqueta img
        const newTag = fullTag.replace(
          /src=["'][^"']+["']/,
          `src="${absoluteUrl}"`
        )
        processedHtml = processedHtml.replace(fullTag, newTag)
        
        console.log(`✅ [HtmlEmailProcessor] Imagen convertida: ${imgSrc} -> ${absoluteUrl}`)
      } catch (error) {
        console.error(`❌ [HtmlEmailProcessor] Error al procesar imagen ${imgSrc}:`, error)
        // Si falla, dejar la imagen original
      }
    }

    return processedHtml
  }
}


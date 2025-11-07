import fs from 'fs/promises'
import path from 'path'

/**
 * Procesa el HTML antes de enviarlo por correo, convirtiendo imágenes
 * que no sean base64 ni URLs absolutas a base64 para asegurar que
 * se muestren correctamente en los clientes de correo.
 */
export default class HtmlEmailProcessor {
  /**
   * Procesa el HTML y convierte las imágenes a base64 si es necesario
   * @param html - El HTML a procesar
   * @returns El HTML procesado con las imágenes convertidas a base64
   */
  static async processHtmlForEmail(html: string): Promise<string> {
    if (!html) return html

    // Regex para encontrar todas las etiquetas img
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    const matches = Array.from(html.matchAll(imgRegex))

    let processedHtml = html

    for (const match of matches) {
      const fullTag = match[0]
      const imgSrc = match[1]

      // Si la imagen ya es base64 o URL absoluta, no hacer nada
      if (imgSrc.startsWith('data:') || imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
        continue
      }

      try {
        // Convertir la ruta relativa a base64
        const base64Src = await this.convertToBase64(imgSrc)
        
        if (base64Src) {
          // Reemplazar el src en la etiqueta img
          const newTag = fullTag.replace(
            /src=["'][^"']+["']/,
            `src="${base64Src}"`
          )
          processedHtml = processedHtml.replace(fullTag, newTag)
        }
      } catch (error) {
        console.error(`Error al procesar imagen ${imgSrc}:`, error)
        // Si falla, dejar la imagen original
      }
    }

    return processedHtml
  }

  /**
   * Convierte una ruta de archivo a base64
   * @param filePath - La ruta del archivo (puede ser relativa o absoluta)
   * @returns La URL base64 de la imagen o null si falla
   */
  private static async convertToBase64(filePath: string): Promise<string | null> {
    try {
      // Si la ruta empieza con /, es relativa al directorio public
      let fullPath: string
      
      if (filePath.startsWith('/')) {
        // Ruta relativa desde la raíz del proyecto (public/uploads/...)
        fullPath = path.join(process.cwd(), 'public', filePath)
      } else {
        // Asumir que es relativa al directorio actual
        fullPath = path.resolve(filePath)
      }

      // Verificar que el archivo existe
      try {
        await fs.access(fullPath)
      } catch {
        console.warn(`Archivo no encontrado: ${fullPath}`)
        return null
      }

      // Leer el archivo
      const fileBuffer = await fs.readFile(fullPath)
      
      // Determinar el tipo MIME basado en la extensión
      const ext = path.extname(fullPath).toLowerCase()
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      }
      
      const mimeType = mimeTypes[ext] || 'image/jpeg'
      
      // Convertir a base64
      const base64 = fileBuffer.toString('base64')
      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      console.error(`Error al convertir ${filePath} a base64:`, error)
      return null
    }
  }
}


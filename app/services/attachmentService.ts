import fs from 'fs/promises'
import path from 'path'

/**
 * Información de un adjunto convertido a base64
 */
export interface Base64Attachment {
  filename: string
  content: string // Contenido en base64
  contentType: string
  size: number // Tamaño en bytes
}

/**
 * Servicio para manejar la conversión de archivos a base64 para adjuntarlos en correos
 */
export default class AttachmentService {
  /**
   * Obtiene el Content-Type basado en la extensión del archivo
   * @param filename - Nombre del archivo
   * @returns Content-Type del archivo
   */
  private static getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop() || ''
    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'rar': 'application/x-rar-compressed',
      'zip': 'application/zip',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    }
    return contentTypes[ext] || 'application/octet-stream'
  }

  /**
   * Convierte un archivo a base64 desde una ruta del sistema de archivos
   * @param filePath - Ruta absoluta del archivo
   * @param filename - Nombre del archivo (opcional, se extrae de la ruta si no se proporciona)
   * @returns Información del adjunto en base64 o null si falla
   */
  static async convertFileToBase64(
    filePath: string,
    filename?: string
  ): Promise<Base64Attachment | null> {
    try {
      // Verificar que el archivo existe
      const stats = await fs.stat(filePath)
      if (!stats.isFile()) {
        console.error(`❌ [AttachmentService] La ruta no es un archivo: ${filePath}`)
        return null
      }

      // Obtener el nombre del archivo si no se proporciona
      const finalFilename = filename || path.basename(filePath)

      // Leer el archivo como buffer
      const fileBuffer = await fs.readFile(filePath)

      // Convertir a base64
      const base64Content = fileBuffer.toString('base64')

      // Obtener el Content-Type
      const contentType = this.getContentType(finalFilename)

      console.log(`✅ [AttachmentService] Archivo convertido a base64: ${finalFilename} (${(stats.size / 1024).toFixed(2)} KB)`)

      return {
        filename: finalFilename,
        content: base64Content,
        contentType,
        size: stats.size
      }
    } catch (error: any) {
      console.error(`❌ [AttachmentService] Error al convertir archivo a base64 ${filePath}:`, error.message)
      return null
    }
  }

  /**
   * Convierte múltiples archivos a base64
   * @param filePaths - Array de rutas absolutas de archivos
   * @returns Array de adjuntos en base64
   */
  static async convertFilesToBase64(
    filePaths: Array<{ path: string; filename?: string }>
  ): Promise<Base64Attachment[]> {
    const attachments: Base64Attachment[] = []

    for (const fileInfo of filePaths) {
      const attachment = await this.convertFileToBase64(fileInfo.path, fileInfo.filename)
      if (attachment) {
        attachments.push(attachment)
      }
    }

    return attachments
  }

  /**
   * Convierte un buffer a base64
   * @param buffer - Buffer del archivo
   * @param filename - Nombre del archivo
   * @returns Información del adjunto en base64
   */
  static convertBufferToBase64(
    buffer: Buffer,
    filename: string
  ): Base64Attachment {
    // Convertir a base64
    const base64Content = buffer.toString('base64')

    // Obtener el Content-Type
    const contentType = this.getContentType(filename)

    console.log(`✅ [AttachmentService] Buffer convertido a base64: ${filename} (${buffer.length} bytes)`)

    return {
      filename,
      content: base64Content,
      contentType,
      size: buffer.length
    }
  }

  /**
   * Convierte un adjunto en base64 al formato requerido por nodemailer
   * @param attachment - Adjunto en base64
   * @returns Objeto compatible con nodemailer attachments
   */
  static toNodemailerAttachment(attachment: Base64Attachment): {
    filename: string
    content: Buffer
    contentType: string
  } {
    // Convertir base64 a buffer
    const buffer = Buffer.from(attachment.content, 'base64')

    return {
      filename: attachment.filename,
      content: buffer,
      contentType: attachment.contentType
    }
  }
}


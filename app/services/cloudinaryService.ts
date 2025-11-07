import { v2 as cloudinary } from 'cloudinary'
import env from '#start/env'
import fs from 'fs/promises'
import path from 'path'

/**
 * Servicio para manejar la subida y gestión de imágenes en Cloudinary
 */
export default class CloudinaryService {
  private static initialized = false

  /**
   * Inicializa Cloudinary con las credenciales de las variables de entorno
   */
  private static initialize(): void {
    if (this.initialized) return

    const cloudName = env.get('CLOUDINARY_CLOUD_NAME')
    const apiKey = env.get('CLOUDINARY_API_KEY')
    const apiSecret = env.get('CLOUDINARY_API_SECRET')

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('⚠️ [CloudinaryService] Credenciales de Cloudinary no configuradas')
      return
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true, // Usar HTTPS
    })

    this.initialized = true
    console.log('✅ [CloudinaryService] Cloudinary inicializado correctamente')
  }

  /**
   * Verifica si Cloudinary está configurado y habilitado
   */
  static isEnabled(): boolean {
    const useCloudinary = env.get('USE_CLOUDINARY')
    const cloudName = env.get('CLOUDINARY_CLOUD_NAME')
    const apiKey = env.get('CLOUDINARY_API_KEY')
    const apiSecret = env.get('CLOUDINARY_API_SECRET')

    // Si USE_CLOUDINARY está explícitamente en false, no usar Cloudinary
    if (useCloudinary === false) {
      return false
    }

    // Si todas las credenciales están presentes, usar Cloudinary
    return !!(cloudName && apiKey && apiSecret)
  }

  /**
   * Sube una imagen a Cloudinary desde una ruta local
   * @param localFilePath - Ruta local del archivo
   * @param publicId - ID público opcional (si no se proporciona, se genera automáticamente)
   * @param folder - Carpeta opcional en Cloudinary
   * @returns URL de la imagen en Cloudinary o null si falla
   */
  static async uploadImage(
    localFilePath: string,
    publicId?: string,
    folder?: string
  ): Promise<string | null> {
    try {
      if (!this.isEnabled()) {
        console.log('ℹ️ [CloudinaryService] Cloudinary no está habilitado, omitiendo subida')
        return null
      }

      this.initialize()

      // Verificar que el archivo existe
      try {
        const stats = await fs.stat(localFilePath)
        if (!stats.isFile()) {
          console.error(`❌ [CloudinaryService] La ruta no es un archivo: ${localFilePath}`)
          return null
        }
      } catch (error) {
        console.error(`❌ [CloudinaryService] Archivo no encontrado: ${localFilePath}`)
        return null
      }

      // Construir opciones de subida
      const uploadOptions: any = {
        resource_type: 'image' as const,
        overwrite: true, // Sobrescribir si existe
        invalidate: true, // Invalidar caché CDN
      }

      // Agregar carpeta si está configurada o se proporciona
      const cloudinaryFolder = folder || env.get('CLOUDINARY_FOLDER')
      if (cloudinaryFolder) {
        uploadOptions.folder = cloudinaryFolder
      }

      // Agregar public_id si se proporciona
      if (publicId) {
        uploadOptions.public_id = publicId
      }

      // Subir la imagen
      const result = await cloudinary.uploader.upload(localFilePath, uploadOptions)

      console.log(`✅ [CloudinaryService] Imagen subida exitosamente: ${result.secure_url}`)
      return result.secure_url // Retornar URL HTTPS
    } catch (error: any) {
      console.error(`❌ [CloudinaryService] Error al subir imagen ${localFilePath}:`, error.message)
      return null
    }
  }

  /**
   * Sube una imagen desde un buffer
   * @param buffer - Buffer de la imagen
   * @param fileName - Nombre del archivo
   * @param publicId - ID público opcional
   * @param folder - Carpeta opcional en Cloudinary
   * @returns URL de la imagen en Cloudinary o null si falla
   */
  static async uploadImageFromBuffer(
    buffer: Buffer,
    fileName: string,
    publicId?: string,
    folder?: string
  ): Promise<string | null> {
    try {
      if (!this.isEnabled()) {
        console.log('ℹ️ [CloudinaryService] Cloudinary no está habilitado, omitiendo subida')
        return null
      }

      this.initialize()

      // Construir opciones de subida
      const uploadOptions: any = {
        resource_type: 'image' as const,
        overwrite: true,
        invalidate: true,
      }

      const cloudinaryFolder = folder || env.get('CLOUDINARY_FOLDER')
      if (cloudinaryFolder) {
        uploadOptions.folder = cloudinaryFolder
      }

      // Usar publicId proporcionado o generar uno desde fileName
      if (publicId) {
        uploadOptions.public_id = publicId
      } else {
        // Generar publicId desde fileName (sin extensión)
        const nameWithoutExt = path.basename(fileName, path.extname(fileName))
        uploadOptions.public_id = nameWithoutExt
      }

      // Subir desde buffer usando upload_stream
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        uploadStream.end(buffer)
      })

      console.log(`✅ [CloudinaryService] Imagen subida desde buffer: ${result.secure_url}`)
      return result.secure_url
    } catch (error: any) {
      console.error(`❌ [CloudinaryService] Error al subir imagen desde buffer:`, error.message)
      return null
    }
  }

  /**
   * Sube una imagen desde una ruta relativa del proyecto
   * @param relativePath - Ruta relativa (ej: /uploads/attachments/1/image.jpg)
   * @param tenantId - ID del tenant para organizar en carpetas
   * @returns URL de la imagen en Cloudinary o null si falla
   */
  static async uploadImageFromRelativePath(
    relativePath: string,
    tenantId?: number
  ): Promise<string | null> {
    try {
      // Construir la ruta física completa
      const localFilePath = path.join(process.cwd(), 'public', relativePath.replace(/^\//, ''))

      // Extraer el nombre del archivo para usarlo como public_id
      const fileName = path.basename(relativePath, path.extname(relativePath))
      
      // Construir public_id con tenant si está disponible
      let publicId = fileName
      if (tenantId) {
        publicId = `tenant_${tenantId}_${fileName}`
      }

      return await this.uploadImage(localFilePath, publicId)
    } catch (error: any) {
      console.error(`❌ [CloudinaryService] Error al subir desde ruta relativa ${relativePath}:`, error.message)
      return null
    }
  }

  /**
   * Elimina una imagen de Cloudinary
   * @param publicId - ID público de la imagen en Cloudinary
   * @returns true si se eliminó correctamente
   */
  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      if (!this.isEnabled()) {
        return false
      }

      this.initialize()

      const result = await cloudinary.uploader.destroy(publicId)
      
      if (result.result === 'ok') {
        console.log(`✅ [CloudinaryService] Imagen eliminada: ${publicId}`)
        return true
      } else {
        console.warn(`⚠️ [CloudinaryService] No se pudo eliminar imagen: ${publicId}`)
        return false
      }
    } catch (error: any) {
      console.error(`❌ [CloudinaryService] Error al eliminar imagen ${publicId}:`, error.message)
      return false
    }
  }
}


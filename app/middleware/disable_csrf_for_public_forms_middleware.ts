import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware para deshabilitar CSRF en formularios públicos
 * Este middleware debe ejecutarse ANTES del middleware de Shield
 */
export default class DisableCsrfForPublicFormsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const url = ctx.request.url()
    const method = ctx.request.method()
    
    // Deshabilitar CSRF para rutas POST de formularios públicos
    if (method === 'POST' && url.match(/^\/api\/form\/[^/]+\/submit$/)) {
      // Deshabilitar validación CSRF para esta ruta
      // Acceder a la propiedad interna del request para deshabilitar CSRF
      // @ts-ignore
      const request = ctx.request.request
      if (request) {
        // @ts-ignore - Deshabilitar CSRF antes de que Shield lo valide
        request.csrfProtection = false
      }
    }

    return next()
  }
}


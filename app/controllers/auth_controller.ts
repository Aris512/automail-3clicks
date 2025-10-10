import { HttpContext } from '@adonisjs/core/http'

export default class AuthController {
  public async showLogin({ inertia, response }: HttpContext) {
    // Headers de seguridad para prevenir caché
    response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
    response.header('Pragma', 'no-cache')
    response.header('Expires', '0')
    response.header('X-Frame-Options', 'DENY')
    response.header('X-Content-Type-Options', 'nosniff')
    
    return inertia.render('auth/login')
  }

  public async showRegister({ inertia, response }: HttpContext) {
    // Headers de seguridad para prevenir caché
    response.header('Cache-Control', 'no-cache, no-store, must-revalidate, private')
    response.header('Pragma', 'no-cache')
    response.header('Expires', '0')
    response.header('X-Frame-Options', 'DENY')
    response.header('X-Content-Type-Options', 'nosniff')
    
    return inertia.render('auth/register')
  }
}

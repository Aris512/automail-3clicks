
import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'

export default class LoginController {
  public async login({ request, auth, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    // 🔍 DEBUG: Log de datos recibidos
    logger.info('🔐 LOGIN ATTEMPT:', {
      email,
      passwordLength: password?.length || 0,
      timestamp: new Date().toISOString(),
      userAgent: request.header('user-agent'),
      ip: request.ip()
    })

    try {
      const user = await User.findByOrFail('email', email)
      
      // 🔍 DEBUG: Log de usuario encontrado
      logger.info(' USER FOUND:', {
        userId: user.id,
        email: user.email,
        createdAt: user.createdAt?.toISO(),
        timestamp: new Date().toISOString()
      })
      
      if (await hash.verify(user.password, password)) {
        await auth.use('web').login(user)
        
        // 🔍 DEBUG: Log de login exitoso
        logger.info(' LOGIN SUCCESS:', {
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString()
        })
        
        return response.redirect('/dashboard')
      } else {
        // 🔍 DEBUG: Log de contraseña incorrecta
        logger.warn('INVALID PASSWORD:', {
          email,
          userId: user.id,
          timestamp: new Date().toISOString()
        })
        
        return response.badRequest('Credenciales inválidas')
      }
    } catch (error) {
      // 🔍 DEBUG: Log de error
      logger.error(' LOGIN ERROR:', {
        email,
        error: error.message,
        timestamp: new Date().toISOString()
      })
      
      return response.badRequest('Credenciales inválidas')
    }
  }

  public async logout({ auth, response }: HttpContext) {
    // 🔍 DEBUG: Log de logout
    const user = auth.user
    logger.info('🚪 LOGOUT:', {
      userId: user?.id,
      email: user?.email,
      timestamp: new Date().toISOString()
    })

    await auth.use('web').logout()
    return response.redirect('/login')
  }
}

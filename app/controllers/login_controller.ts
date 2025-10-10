
import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'

export default class LoginController {
  public async login({ request, auth, response, inertia }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    try {
      // Primero verificamos si el usuario existe
      const user = await User.findBy('email', email)
      
      if (!user) {
        return inertia.render('auth/login', {
          errors: {
            email: 'No existe una cuenta con este email'
          }
        })
      }
      
      // Si el usuario existe, verificamos la contraseña
      if (await hash.verify(user.password, password)) {
        await auth.use('web').login(user)
        return response.redirect('/dashboard')
      } else {
        return inertia.render('auth/login', {
          errors: {
            password: 'La contraseña es incorrecta'
          }
        })
      }
    } catch (error) {
      logger.error('Login error:', error)
      
      return inertia.render('auth/login', {
        errors: {
          general: 'Ocurrió un error inesperado'
        }
      })
    }
  }

  public async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect('/login')
  }
}
